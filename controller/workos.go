package controller

import (
	"errors"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	workOSStateSessionKey     = "workos_state"
	workOSReturnToSessionKey  = "workos_return_to"
	workOSAffCodeSessionKey   = "workos_aff_code"
	workOSSessionIDSessionKey = "workos_session_id"
)

func WorkOSLogin(c *gin.Context) {
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	state, err := service.NewWorkOSState()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	session := sessions.Default(c)
	session.Set(workOSStateSessionKey, state)
	if returnTo := safeReturnTo(c.Query("return_to")); returnTo != "" {
		session.Set(workOSReturnToSessionKey, returnTo)
	} else {
		session.Delete(workOSReturnToSessionKey)
	}
	if affCode := safeAffCode(c.Query("aff")); affCode != "" {
		session.Set(workOSAffCodeSessionKey, affCode)
	} else {
		session.Delete(workOSAffCodeSessionKey)
	}
	if err := session.Save(); err != nil {
		common.ApiError(c, err)
		return
	}

	authURL, err := service.WorkOSAuthorizationURL(cfg, service.WorkOSAuthorizeOptions{
		State:      state,
		ScreenHint: c.Query("screen_hint"),
		Prompt:     c.Query("prompt"),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.Redirect(http.StatusFound, authURL)
}

func WorkOSCallback(c *gin.Context) {
	code := strings.TrimSpace(c.Query("code"))
	state := strings.TrimSpace(c.Query("state"))
	if code == "" || state == "" {
		c.Redirect(http.StatusFound, "/login?error=missing_workos_callback_params")
		return
	}

	session := sessions.Default(c)
	expectedState, _ := session.Get(workOSStateSessionKey).(string)
	session.Delete(workOSStateSessionKey)
	if expectedState == "" || state != expectedState {
		_ = session.Save()
		c.Redirect(http.StatusFound, "/login?error=invalid_workos_state")
		return
	}

	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		_ = session.Save()
		c.Redirect(http.StatusFound, "/login?error=workos_config")
		return
	}
	authResp, err := service.AuthenticateWorkOSCode(c.Request.Context(), cfg, code)
	if err != nil {
		common.SysLog("WorkOS callback failed: " + err.Error())
		_ = session.Save()
		c.Redirect(http.StatusFound, "/login?error=workos_callback")
		return
	}

	user, err := model.SyncWorkOSUser(model.WorkOSUserProfile{
		ID:                   authResp.User.ID,
		Email:                authResp.User.Email,
		FirstName:            authResp.User.FirstName,
		LastName:             authResp.User.LastName,
		OrganizationID:       authResp.OrganizationID,
		AuthenticationMethod: authResp.AuthenticationMethod,
	}, workOSAffCode(session))
	if err != nil {
		common.SysLog("WorkOS user sync failed: " + err.Error())
		_ = session.Save()
		c.Redirect(http.StatusFound, "/login?error=workos_user_sync")
		return
	}
	if err := syncWorkOSTeamMembershipFromCallback(c, cfg, authResp, user); err != nil {
		common.SysLog("WorkOS team membership sync skipped: " + err.Error())
	}

	setupWorkOSLoginSession(c, session, user, authResp.AccessToken)
	returnTo, _ := session.Get(workOSReturnToSessionKey).(string)
	session.Delete(workOSReturnToSessionKey)
	session.Delete(workOSAffCodeSessionKey)
	if err := session.Save(); err != nil {
		common.ApiError(c, err)
		return
	}
	if safe := safeReturnTo(returnTo); safe != "" {
		c.Redirect(http.StatusFound, safe)
		return
	}
	c.Redirect(http.StatusFound, "/workos/callback")
}

func syncWorkOSTeamMembershipFromCallback(c *gin.Context, cfg service.WorkOSConfig, authResp *service.WorkOSAuthenticationResponse, user *model.User) error {
	if authResp == nil || user == nil || strings.TrimSpace(authResp.OrganizationID) == "" {
		return nil
	}
	team, err := model.GetTeamByWorkOSOrganizationId(authResp.OrganizationID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	invitation, err := model.FindPendingTeamInvitationByEmail(team.Id, user.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}
	if !strings.EqualFold(strings.TrimSpace(invitation.Email), strings.TrimSpace(user.Email)) {
		return nil
	}
	memberships, err := service.ListWorkOSOrganizationMemberships(c.Request.Context(), cfg, team.WorkOSOrganizationId, user.WorkOSId)
	if err != nil {
		return err
	}
	for _, membership := range memberships {
		if membership.Organization() != team.WorkOSOrganizationId || membership.User() != user.WorkOSId {
			continue
		}
		if _, err := model.SyncTeamMembership(model.SyncTeamMembershipParams{
			TeamId:                         team.Id,
			UserId:                         user.Id,
			WorkOSOrganizationMembershipId: membership.ID,
			Role:                           membership.RoleSlug(),
			Status:                         membership.Status,
		}); err != nil {
			return err
		}
		return model.MarkTeamInvitationStatus(invitation.WorkOSInvitationId, model.InvitationAccepted, user.Id)
	}
	return nil
}

func WorkOSLogout(c *gin.Context) {
	session := sessions.Default(c)
	sessionID, _ := session.Get(workOSSessionIDSessionKey).(string)
	session.Clear()
	_ = session.Save()

	returnTo := requestOrigin(c.Request) + "/login"
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		c.Redirect(http.StatusFound, "/login")
		return
	}
	c.Redirect(http.StatusFound, service.WorkOSLogoutURL(cfg, sessionID, returnTo))
}

func setupWorkOSLoginSession(c *gin.Context, session sessions.Session, user *model.User, workOSAccessToken string) {
	session.Set("id", user.Id)
	session.Set("username", user.Username)
	session.Set("role", user.Role)
	session.Set("status", user.Status)
	session.Set("group", user.Group)
	session.Set("workos_id", user.WorkOSId)
	if sessionID := service.WorkOSSessionIDFromAccessToken(workOSAccessToken); sessionID != "" {
		session.Set(workOSSessionIDSessionKey, sessionID)
	}
}

func safeReturnTo(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || !strings.HasPrefix(value, "/") || strings.HasPrefix(value, "//") {
		return ""
	}
	return value
}

func safeAffCode(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 32 {
		return ""
	}
	return value
}

func workOSAffCode(session sessions.Session) string {
	affCode, _ := session.Get(workOSAffCodeSessionKey).(string)
	return safeAffCode(affCode)
}

func requestOrigin(r *http.Request) string {
	proto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if proto == "" {
		if r.TLS != nil {
			proto = "https"
		} else {
			proto = "http"
		}
	}
	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = r.Host
	}
	return proto + "://" + host
}
