package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

const maxWorkOSWebhookPayloadBytes int64 = 1 << 20

type teamIdRequest struct {
	TeamId string `json:"team_id"`
	Id     string `json:"id"`
}

func WorkOSWebhook(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxWorkOSWebhookPayloadBytes)
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}
	event, err := service.ParseWorkOSWebhookEvent(payload, c.GetHeader("WorkOS-Signature"), service.WorkOSWebhookSecret())
	if err != nil {
		common.SysLog("WorkOS webhook rejected: " + err.Error())
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	if err := handleWorkOSTeamWebhookEvent(c, event); err != nil {
		common.SysLog("WorkOS webhook team sync failed: " + err.Error())
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}
	c.Status(http.StatusOK)
}

func handleWorkOSTeamWebhookEvent(c *gin.Context, event *service.WorkOSWebhookEvent) error {
	switch event.Type {
	case "organization.updated", "organization.deleted":
		var organization service.WorkOSOrganization
		if err := json.Unmarshal(event.Data, &organization); err != nil {
			return err
		}
		if event.Type == "organization.deleted" {
			return model.DeleteTeamByWorkOSOrganizationId(organization.ID)
		}
		return model.UpdateTeamFromWorkOSOrganization(organization.ID, organization.Name)
	case "organization_membership.created", "organization_membership.updated", "organization_membership.deleted":
		var membership service.WorkOSOrganizationMembership
		if err := json.Unmarshal(event.Data, &membership); err != nil {
			return err
		}
		if event.Type == "organization_membership.deleted" {
			membership.Status = model.MembershipInactive
		}
		return syncWorkOSMembershipMirror(membership)
	case "invitation.accepted", "invitation.revoked", "invitation.created":
		var invitation service.WorkOSInvitation
		if err := json.Unmarshal(event.Data, &invitation); err != nil {
			return err
		}
		if event.Type == "invitation.revoked" {
			return model.MarkTeamInvitationStatus(invitation.ID, model.InvitationRevoked, "")
		}
		if event.Type == "invitation.accepted" {
			if _, err := model.GetTeamByWorkOSOrganizationId(invitation.Organization()); err == nil {
				if user, err := model.GetUserByEmail(invitation.Email); err == nil && strings.EqualFold(user.Email, invitation.Email) {
					return model.MarkTeamInvitationStatus(invitation.ID, model.InvitationAccepted, user.Id)
				}
			}
		}
		return nil
	default:
		return nil
	}
}

func syncWorkOSMembershipMirror(membership service.WorkOSOrganizationMembership) error {
	team, err := model.GetTeamByWorkOSOrganizationId(membership.Organization())
	if err != nil {
		return nil
	}
	user, err := model.GetUserByWorkOSId(membership.User())
	if err != nil {
		return nil
	}
	status := membership.Status
	if status == "" {
		status = model.MembershipActive
	}
	if strings.Contains(status, "deleted") {
		status = model.MembershipInactive
	}
	if status == model.MembershipActive {
		if _, err := model.GetTeamMembership(team.Id, user.Id); err != nil {
			invitation, inviteErr := model.FindPendingTeamInvitationByEmail(team.Id, user.Email)
			if inviteErr != nil || !strings.EqualFold(invitation.Email, user.Email) {
				return nil
			}
		}
	}
	synced, err := model.SyncTeamMembership(model.SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         user.Id,
		WorkOSOrganizationMembershipId: membership.ID,
		Role:                           membership.RoleSlug(),
		Status:                         status,
	})
	if err != nil {
		return err
	}
	if synced.Status == model.MembershipActive {
		if invitation, err := model.FindPendingTeamInvitationByEmail(team.Id, user.Email); err == nil && strings.EqualFold(invitation.Email, user.Email) {
			return model.MarkTeamInvitationStatus(invitation.WorkOSInvitationId, model.InvitationAccepted, user.Id)
		}
	}
	return nil
}

type createTeamRequest struct {
	Name string `json:"name"`
}

type updateTeamRequest struct {
	TeamId string `json:"team_id"`
	Id     string `json:"id"`
	Name   string `json:"name"`
}

type adminUpdateTeamRequest struct {
	TeamId string `json:"team_id"`
	Id     string `json:"id"`
	Name   string `json:"name"`
	Group  string `json:"group"`
	Quota  int    `json:"quota"`
}

type inviteTeamMemberRequest struct {
	TeamId string `json:"team_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

type teamMemberRoleRequest struct {
	TeamId string `json:"team_id"`
	UserId string `json:"user_id"`
	Role   string `json:"role"`
}

type teamMemberRequest struct {
	TeamId string `json:"team_id"`
	UserId string `json:"user_id"`
}

type updateTeamPolicyRequest struct {
	TeamId      string                `json:"team_id"`
	ModelPolicy model.PolicyToggleSet `json:"model_policy"`
	GroupPolicy model.PolicyToggleSet `json:"group_policy"`
}

type teamTokenBatch struct {
	TeamId string   `json:"team_id"`
	Ids    []string `json:"ids"`
}

// teamIdFromRequest falls back to JSON binding, which consumes the request body.
// Callers that need to bind another JSON payload should bind it before using this helper.
func teamIdFromRequest(c *gin.Context) string {
	if id := strings.TrimSpace(c.Param("team_id")); id != "" {
		return id
	}
	if id := strings.TrimSpace(c.Query("team_id")); id != "" {
		return id
	}
	if id := strings.TrimSpace(c.Query("id")); id != "" {
		return id
	}
	var req teamIdRequest
	_ = c.ShouldBindJSON(&req)
	if req.TeamId != "" {
		return strings.TrimSpace(req.TeamId)
	}
	return strings.TrimSpace(req.Id)
}

func currentUserId(c *gin.Context) string {
	return c.GetString("id")
}

func requireTeamMemberContext(c *gin.Context, teamId string) (*model.TeamMembership, bool) {
	membership, err := model.RequireTeamMember(teamId, currentUserId(c))
	if err != nil {
		common.ApiError(c, errors.New("team membership required"))
		return nil, false
	}
	return membership, true
}

func requireTeamAdminContext(c *gin.Context, teamId string) (*model.TeamMembership, bool) {
	membership, err := model.RequireTeamAdmin(teamId, currentUserId(c))
	if err != nil {
		common.ApiError(c, errors.New("team admin permission required"))
		return nil, false
	}
	return membership, true
}

func GetAccountContext(c *gin.Context) {
	userId := currentUserId(c)
	teams, err := model.ListTeamsForUser(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"personal": gin.H{"type": model.AccountTypePersonal, "id": userId},
		"teams":    teams,
	})
}

func GetTeams(c *gin.Context) {
	teams, err := model.ListTeamsForUser(currentUserId(c))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, teams)
}

func AdminListTeams(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	teams, total, err := model.ListAdminTeams(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(teams)
	common.ApiSuccess(c, pageInfo)
}

func AdminSearchTeams(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	teams, total, err := model.SearchAdminTeams(
		c.Query("keyword"),
		c.Query("group"),
		c.Query("status"),
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(teams)
	common.ApiSuccess(c, pageInfo)
}

func AdminGetTeam(c *gin.Context) {
	teamId := strings.TrimSpace(c.Param("id"))
	if teamId == "" {
		teamId = strings.TrimSpace(c.Query("id"))
	}
	team, err := model.GetTeamByIdAnyStatus(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, team)
}

func GetTeam(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	team, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	team.Role = membership.Role
	common.ApiSuccess(c, team)
}

func AdminUpdateTeam(c *gin.Context) {
	var req adminUpdateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	teamId := strings.TrimSpace(req.TeamId)
	if teamId == "" {
		teamId = strings.TrimSpace(req.Id)
	}
	teamBeforeUpdate, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if _, err := service.UpdateWorkOSOrganization(c.Request.Context(), cfg, teamBeforeUpdate.WorkOSOrganizationId, req.Name); err != nil {
		common.ApiError(c, err)
		return
	}
	team, err := model.AdminUpdateTeam(teamId, req.Name, req.Group, req.Quota)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, team)
}

func AdminDeactivateTeam(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	team, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.DeleteWorkOSOrganization(c.Request.Context(), cfg, team.WorkOSOrganizationId); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteTeam(teamId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func CreateTeam(c *gin.Context) {
	var req createTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if !model.TeamCreationEnabled() {
		common.ApiError(c, errors.New("team creation is disabled"))
		return
	}
	userId := currentUserId(c)
	createdCount, err := model.CountTeamsCreatedByUser(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(createdCount) >= model.GetMaxTeamsCreatedPerUser() {
		common.ApiError(c, errors.New("team creation limit reached"))
		return
	}
	if err := model.CanActivateTeamMembership(userId); err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(userId, false)
	if err != nil || user.WorkOSId == "" {
		common.ApiError(c, errors.New("WorkOS user is required"))
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	org, err := service.CreateWorkOSOrganization(c.Request.Context(), cfg, req.Name, "")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	membership, err := service.CreateWorkOSOrganizationMembership(c.Request.Context(), cfg, org.ID, user.WorkOSId, model.TeamRoleAdmin)
	if err != nil {
		_ = service.DeleteWorkOSOrganization(c.Request.Context(), cfg, org.ID)
		common.ApiError(c, err)
		return
	}
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 req.Name,
		CreatedByUserId:      userId,
		WorkOSOrganizationId: org.ID,
		WorkOSMembershipId:   membership.ID,
	})
	if err != nil {
		_ = service.DeleteWorkOSOrganization(c.Request.Context(), cfg, org.ID)
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"team": team, "redirect": "/teams/" + team.Id + "/console"})
}

func UpdateTeam(c *gin.Context) {
	var req updateTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	teamId := req.TeamId
	if teamId == "" {
		teamId = req.Id
	}
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	teamBeforeUpdate, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if _, err := service.UpdateWorkOSOrganization(c.Request.Context(), cfg, teamBeforeUpdate.WorkOSOrganizationId, req.Name); err != nil {
		common.ApiError(c, err)
		return
	}
	team, err := model.UpdateTeam(teamId, req.Name)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, team)
}

func DeleteTeam(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	team, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.DeleteWorkOSOrganization(c.Request.Context(), cfg, team.WorkOSOrganizationId); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteTeam(teamId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func GetTeamMembers(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	members, err := model.ListTeamMembers(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	for i := range members {
		user, err := model.GetUserById(members[i].UserId, false)
		if err != nil || user == nil {
			continue
		}
		members[i].DisplayName = user.DisplayName
		members[i].Email = user.Email
		members[i].Username = user.Username
	}
	common.ApiSuccess(c, members)
}

func GetTeamInvitations(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	invitations, err := model.ListTeamInvitations(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, invitations)
}

func InviteTeamMember(c *gin.Context) {
	var req inviteTeamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if !model.TeamInvitationEnabled() {
		common.ApiError(c, errors.New("team invitation is disabled"))
		return
	}
	if _, ok := requireTeamAdminContext(c, req.TeamId); !ok {
		return
	}
	if existingUser, err := model.GetUserByEmail(strings.ToLower(strings.TrimSpace(req.Email))); err == nil && existingUser != nil {
		if err := model.CanActivateTeamMembership(existingUser.Id); err != nil {
			common.ApiError(c, err)
			return
		}
	}
	team, err := model.GetTeamById(req.TeamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(currentUserId(c), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	local, err := model.CreateTeamInvitation(model.InviteTeamMemberParams{
		TeamId:          team.Id,
		Email:           req.Email,
		Role:            req.Role,
		InvitedByUserId: currentUserId(c),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	invitation, err := service.SendWorkOSOrganizationInvitation(c.Request.Context(), cfg, team.WorkOSOrganizationId, req.Email, req.Role, user.WorkOSId)
	if err != nil {
		_ = model.MarkTeamInvitationStatus(local.WorkOSInvitationId, model.InvitationRevoked, "")
		common.ApiError(c, err)
		return
	}
	local, err = model.AttachWorkOSInvitationToTeamInvitation(local.Id, invitation.ID, invitation.ExpiryTimestamp())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, local)
}

func RevokeTeamInvitation(c *gin.Context) {
	var req struct {
		TeamId       string `json:"team_id"`
		InvitationId string `json:"invitation_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if _, ok := requireTeamAdminContext(c, req.TeamId); !ok {
		return
	}
	invitation, err := model.GetTeamInvitationById(req.InvitationId, req.TeamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.RevokeWorkOSInvitation(c.Request.Context(), cfg, invitation.WorkOSInvitationId); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.MarkTeamInvitationStatus(invitation.WorkOSInvitationId, model.InvitationRevoked, ""); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func UpdateTeamMemberRole(c *gin.Context) {
	var req teamMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if _, ok := requireTeamAdminContext(c, req.TeamId); !ok {
		return
	}
	membership, err := model.GetTeamMembership(req.TeamId, req.UserId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.EnsureCanUpdateTeamMemberRole(req.TeamId, req.UserId, req.Role); err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.UpdateWorkOSOrganizationMembershipRole(c.Request.Context(), cfg, membership.WorkOSOrganizationMembershipId, req.Role); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateTeamMemberRole(req.TeamId, req.UserId, req.Role); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func RemoveTeamMember(c *gin.Context) {
	var req teamMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if _, ok := requireTeamAdminContext(c, req.TeamId); !ok {
		return
	}
	membership, err := model.GetTeamMembership(req.TeamId, req.UserId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.EnsureCanRemoveTeamMember(req.TeamId, req.UserId); err != nil {
		common.ApiError(c, err)
		return
	}
	cfg, err := service.WorkOSConfigFromRequest(c.Request)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.DeactivateWorkOSOrganizationMembership(c.Request.Context(), cfg, membership.WorkOSOrganizationMembershipId); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.RemoveTeamMember(req.TeamId, req.UserId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func GetTeamPolicy(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	policy, err := model.GetTeamPolicy(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"team_id":      policy.TeamId,
		"model_policy": model.DecodePolicySet(policy.ModelPolicy),
		"group_policy": model.DecodePolicySet(policy.GroupPolicy),
		"updated_at":   policy.UpdatedAt,
	})
}

func UpdateTeamPolicy(c *gin.Context) {
	var req updateTeamPolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if _, ok := requireTeamAdminContext(c, req.TeamId); !ok {
		return
	}
	policy, err := model.UpdateTeamPolicy(req.TeamId, currentUserId(c), req.ModelPolicy, req.GroupPolicy)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, policy)
}

func GetTeamBillingSummary(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamMemberContext(c, teamId); !ok {
		return
	}
	team, err := model.GetTeamById(teamId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"team_id":    team.Id,
		"quota":      team.Quota,
		"used_quota": team.UsedQuota,
	})
}

func GetTeamTopups(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	if _, ok := requireTeamAdminContext(c, teamId); !ok {
		return
	}
	orders, err := model.ListStripePaymentOrdersByAccount(model.TeamAccountContext(teamId), 100)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, orders)
}

func GetTeamTokens(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	allowAll := membership.Role == model.TeamRoleAdmin
	pageInfo := common.GetPageQuery(c)
	account := model.TeamAccountContext(teamId)
	tokens, err := model.GetVisibleAccountTokens(account, currentUserId(c), allowAll, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	total, err := model.CountVisibleAccountTokens(account, currentUserId(c), allowAll)
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to count team tokens team_id=%s user_id=%s error=%v", teamId, currentUserId(c), err))
	} else {
		pageInfo.SetTotal(int(total))
	}
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func bindTokenPayload(c *gin.Context) (model.Token, error) {
	var token model.Token
	err := c.ShouldBindJSON(&token)
	return token, err
}

func validateTokenPayload(token model.Token) error {
	if len(token.Name) > 50 {
		return errors.New("token name is too long")
	}
	if !token.UnlimitedQuota && token.RemainQuota < 0 {
		return errors.New("token quota cannot be negative")
	}
	return nil
}

func CreateTeamToken(c *gin.Context) {
	var req struct {
		model.Token
		TeamId string `json:"team_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	token := req.Token
	teamId := strings.TrimSpace(c.Query("team_id"))
	if teamId == "" {
		teamId = strings.TrimSpace(req.TeamId)
	}
	if teamId == "" {
		teamId = strings.TrimSpace(token.AccountId)
	}
	if _, ok := requireTeamMemberContext(c, teamId); !ok {
		return
	}
	if err := validateTokenPayload(token); err != nil {
		common.ApiError(c, err)
		return
	}
	account := model.TeamAccountContext(teamId)
	count, err := model.CountAccountTokens(account)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= operation_setting.GetMaxUserTokens() {
		common.ApiError(c, errors.New("team token limit reached"))
		return
	}
	key, err := common.GenerateKey()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cleanToken := model.Token{
		UserId:             currentUserId(c),
		CreatedByUserId:    currentUserId(c),
		AccountType:        model.AccountTypeTeam,
		AccountId:          teamId,
		Name:               token.Name,
		Key:                key,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        token.ExpiredTime,
		RemainQuota:        token.RemainQuota,
		UnlimitedQuota:     token.UnlimitedQuota,
		ModelLimitsEnabled: token.ModelLimitsEnabled,
		ModelLimits:        token.ModelLimits,
		AllowIps:           token.AllowIps,
		Group:              token.Group,
		CrossGroupRetry:    token.CrossGroupRetry,
	}
	if err := cleanToken.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, buildMaskedTokenResponse(&cleanToken))
}

func GetTeamToken(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	tokenId := strings.TrimSpace(c.Param("id"))
	if tokenId == "" {
		tokenId = strings.TrimSpace(c.Query("id"))
	}
	token, err := model.GetTokenByIdForAccount(tokenId, model.TeamAccountContext(teamId))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if membership.Role != model.TeamRoleAdmin && token.CreatedByUserId != currentUserId(c) {
		common.ApiError(c, errors.New("team members can only view their own team tokens"))
		return
	}
	common.ApiSuccess(c, buildMaskedTokenResponse(token))
}

func UpdateTeamToken(c *gin.Context) {
	var req struct {
		model.Token
		TeamId string `json:"team_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	token := req.Token
	teamId := strings.TrimSpace(token.AccountId)
	if teamId == "" {
		teamId = strings.TrimSpace(req.TeamId)
	}
	if teamId == "" {
		teamId = strings.TrimSpace(c.Query("team_id"))
	}
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	if err := validateTokenPayload(token); err != nil {
		common.ApiError(c, err)
		return
	}
	allowAll := membership.Role == model.TeamRoleAdmin
	cleanToken, err := model.GetTokenByIdForAccount(token.Id, model.TeamAccountContext(teamId))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !allowAll && cleanToken.CreatedByUserId != currentUserId(c) {
		common.ApiError(c, errors.New("team members can only update their own team tokens"))
		return
	}
	if token.Status == common.TokenStatusEnabled {
		if cleanToken.Status == common.TokenStatusExpired && cleanToken.ExpiredTime <= common.GetTimestamp() && cleanToken.ExpiredTime != -1 {
			common.ApiError(c, errors.New("expired team token cannot be enabled"))
			return
		}
		if cleanToken.Status == common.TokenStatusExhausted && cleanToken.RemainQuota <= 0 && !cleanToken.UnlimitedQuota {
			common.ApiError(c, errors.New("exhausted team token cannot be enabled"))
			return
		}
	}
	if c.Query("status_only") != "" {
		cleanToken.Status = token.Status
	} else {
		cleanToken.Name = token.Name
		cleanToken.Status = token.Status
		cleanToken.ExpiredTime = token.ExpiredTime
		cleanToken.RemainQuota = token.RemainQuota
		cleanToken.UnlimitedQuota = token.UnlimitedQuota
		cleanToken.ModelLimitsEnabled = token.ModelLimitsEnabled
		cleanToken.ModelLimits = token.ModelLimits
		cleanToken.AllowIps = token.AllowIps
		cleanToken.Group = token.Group
		cleanToken.CrossGroupRetry = token.CrossGroupRetry
	}
	if err := cleanToken.Update(); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, buildMaskedTokenResponse(cleanToken))
}

func DeleteTeamToken(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	tokenId := strings.TrimSpace(c.Param("id"))
	if tokenId == "" {
		tokenId = strings.TrimSpace(c.Query("token_id"))
	}
	if tokenId == "" {
		tokenId = strings.TrimSpace(c.Query("id"))
	}
	if err := model.DeleteTokenByIdForAccount(tokenId, model.TeamAccountContext(teamId), currentUserId(c), membership.Role == model.TeamRoleAdmin); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}

func DeleteTeamTokens(c *gin.Context) {
	var req teamTokenBatch
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	membership, ok := requireTeamMemberContext(c, req.TeamId)
	if !ok {
		return
	}
	count, err := model.BatchDeleteAccountTokens(req.Ids, model.TeamAccountContext(req.TeamId), currentUserId(c), membership.Role == model.TeamRoleAdmin)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, count)
}

func GetTeamTokenKey(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	tokenId := strings.TrimSpace(c.Param("id"))
	if tokenId == "" {
		tokenId = strings.TrimSpace(c.Query("id"))
	}
	token, err := model.GetTokenByIdForAccount(tokenId, model.TeamAccountContext(teamId))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if membership.Role != model.TeamRoleAdmin && token.CreatedByUserId != currentUserId(c) {
		common.ApiError(c, errors.New("team members can only reveal their own team tokens"))
		return
	}
	model.RecordSecurityEventWithContext(c, model.LogEventParams{
		UserId:       currentUserId(c),
		AccountType:  model.AccountTypeTeam,
		AccountId:    teamId,
		Event:        "team.token.secret.view",
		Severity:     "warning",
		Content:      "Team API token secret viewed",
		ResourceType: "token",
		ResourceId:   token.Id,
		Other: map[string]interface{}{
			"token_name": token.Name,
		},
	})
	common.ApiSuccess(c, gin.H{"key": token.GetFullKey()})
}

func GetTeamTokenKeysBatch(c *gin.Context) {
	var req teamTokenBatch
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Ids) == 0 {
		common.ApiError(c, errors.New("invalid team token batch"))
		return
	}
	if len(req.Ids) > 100 {
		common.ApiError(c, errors.New("too many token ids"))
		return
	}
	membership, ok := requireTeamMemberContext(c, req.TeamId)
	if !ok {
		return
	}
	tokens, err := model.GetTokenKeysByIdsForAccount(req.Ids, model.TeamAccountContext(req.TeamId), currentUserId(c), membership.Role == model.TeamRoleAdmin)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.RecordSecurityEventWithContext(c, model.LogEventParams{
		UserId:       currentUserId(c),
		AccountType:  model.AccountTypeTeam,
		AccountId:    req.TeamId,
		Event:        "team.token.secret.batch_view",
		Severity:     "warning",
		Content:      "Team API token secrets viewed in batch",
		ResourceType: "token",
		Other: map[string]interface{}{
			"count": len(tokens),
		},
	})
	keysMap := make(map[string]string)
	for _, token := range tokens {
		keysMap[token.Id] = token.GetFullKey()
	}
	common.ApiSuccess(c, gin.H{"keys": keysMap})
}

func GetTeamUsage(c *gin.Context) {
	teamId := teamIdFromRequest(c)
	membership, ok := requireTeamMemberContext(c, teamId)
	if !ok {
		return
	}
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	pageInfo := common.GetPageQuery(c)
	account := model.TeamAccountContext(teamId)
	userId := currentUserId(c)
	if membership.Role == model.TeamRoleAdmin {
		userId = ""
	}
	logs, total, err := model.GetAccountUsageLogs(account, userId, startTimestamp, endTimestamp, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
}
