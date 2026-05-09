package model

import (
	"errors"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type WorkOSUserProfile struct {
	ID                   string
	Email                string
	FirstName            string
	LastName             string
	OrganizationID       string
	AuthenticationMethod string
}

func SyncWorkOSUser(profile WorkOSUserProfile, affCode string) (*User, error) {
	profile.ID = strings.TrimSpace(profile.ID)
	profile.Email = strings.TrimSpace(profile.Email)
	if profile.ID == "" {
		return nil, errors.New("workos user id is required")
	}

	var user User
	err := DB.Where("workos_id = ?", profile.ID).First(&user).Error
	if err == nil {
		user.Email = profile.Email
		user.Username = uniqueWorkOSUsername(profile.Email, profile.ID, user.Id)
		user.DisplayName = workOSDisplayName(profile)
		user.WorkOSOrganizationId = strings.TrimSpace(profile.OrganizationID)
		user.WorkOSAuthenticationMethod = strings.TrimSpace(profile.AuthenticationMethod)
		if isConfiguredWorkOSRoot(profile) && user.Role < common.RoleRootUser {
			user.Role = common.RoleRootUser
		}
		if err := user.Update(false); err != nil {
			return nil, err
		}
		UpdateUserLastLoginAt(user.Id)
		return &user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	role := common.RoleCommonUser
	if isFirstUser() || isConfiguredWorkOSRoot(profile) {
		role = common.RoleRootUser
	}
	user = User{
		Username:                   uniqueWorkOSUsername(profile.Email, profile.ID, ""),
		WorkOSId:                   profile.ID,
		WorkOSOrganizationId:       strings.TrimSpace(profile.OrganizationID),
		WorkOSAuthenticationMethod: strings.TrimSpace(profile.AuthenticationMethod),
		DisplayName:                workOSDisplayName(profile),
		Role:                       role,
		Status:                     common.UserStatusEnabled,
		Email:                      profile.Email,
		Group:                      "default",
	}
	inviterID := ""
	if affCode != "" {
		if id, err := GetUserIdByAffCode(affCode); err == nil {
			inviterID = id
		}
	}
	if err := user.Insert(inviterID); err != nil {
		return nil, err
	}
	UpdateUserLastLoginAt(user.Id)
	return &user, nil
}

func isFirstUser() bool {
	var count int64
	if err := DB.Unscoped().Model(&User{}).Count(&count).Error; err != nil {
		return false
	}
	return count == 0
}

func uniqueWorkOSUsername(email string, workOSID string, currentUserID string) string {
	base := strings.TrimSpace(email)
	if base == "" {
		base = strings.TrimSpace(workOSID)
	}
	if base == "" {
		base = "workos-user"
	}
	if len(base) > 128 {
		base = base[:128]
	}

	var existing User
	query := DB.Unscoped().Where("username = ?", base)
	if !common.IsEmptyID(currentUserID) {
		query = query.Where("id <> ?", currentUserID)
	}
	err := query.First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return base
	}
	suffix := "-" + strings.TrimSpace(workOSID)
	if len(base)+len(suffix) > 128 {
		base = base[:128-len(suffix)]
	}
	return base + suffix
}

func workOSDisplayName(profile WorkOSUserProfile) string {
	name := strings.TrimSpace(strings.Join([]string{
		strings.TrimSpace(profile.FirstName),
		strings.TrimSpace(profile.LastName),
	}, " "))
	if name != "" {
		return name
	}
	if profile.Email != "" {
		return profile.Email
	}
	return profile.ID
}

func isConfiguredWorkOSRoot(profile WorkOSUserProfile) bool {
	return envListContains("WORKOS_ROOT_USER_IDS", profile.ID) ||
		envListContainsFold("WORKOS_ROOT_EMAILS", profile.Email)
}

func envListContains(key string, target string) bool {
	target = strings.TrimSpace(target)
	if target == "" {
		return false
	}
	for _, item := range strings.Split(os.Getenv(key), ",") {
		if strings.TrimSpace(item) == target {
			return true
		}
	}
	return false
}

func envListContainsFold(key string, target string) bool {
	target = strings.TrimSpace(target)
	if target == "" {
		return false
	}
	for _, item := range strings.Split(os.Getenv(key), ",") {
		if strings.EqualFold(strings.TrimSpace(item), target) {
			return true
		}
	}
	return false
}
