package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	TeamStatusActive   = "active"
	TeamStatusDeleted  = "deleted"
	TeamRoleAdmin      = "admin"
	TeamRoleMember     = "member"
	MembershipActive   = "active"
	MembershipInactive = "inactive"
	InvitationPending  = "pending"
	InvitationAccepted = "accepted"
	InvitationRevoked  = "revoked"
)

var teamSlugUnsafe = regexp.MustCompile(`[^a-z0-9]+`)

type Team struct {
	Id                   string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	WorkOSOrganizationId string `json:"workos_organization_id" gorm:"column:workos_organization_id;type:text;not null;uniqueIndex"`
	Name                 string `json:"name" gorm:"type:text;not null"`
	Slug                 string `json:"slug" gorm:"type:text;not null;uniqueIndex"`
	Group                string `json:"group" gorm:"column:group;type:varchar(64);not null;default:'default'"`
	CreatedByUserId      string `json:"created_by_user_id" gorm:"type:varchar(32);not null;index"`
	StripeCustomer       string `json:"stripe_customer" gorm:"type:varchar(128);default:'';index"`
	Quota                int    `json:"quota" gorm:"default:0"`
	UsedQuota            int    `json:"used_quota" gorm:"default:0"`
	RequestCount         int    `json:"request_count" gorm:"default:0"`
	Status               string `json:"status" gorm:"type:varchar(32);not null;default:'active';index"`
	CreatedAt            int64  `json:"created_at" gorm:"not null;index"`
	UpdatedAt            int64  `json:"updated_at" gorm:"not null;index"`
	Role                 string `json:"role,omitempty" gorm:"-"`
}

func (Team) TableName() string {
	return "teams"
}

type AdminTeam struct {
	Id                   string `json:"id"`
	WorkOSOrganizationId string `json:"workos_organization_id"`
	Name                 string `json:"name"`
	Slug                 string `json:"slug"`
	Group                string `json:"group"`
	CreatedByUserId      string `json:"created_by_user_id"`
	CreatedByUsername    string `json:"created_by_username"`
	CreatedByEmail       string `json:"created_by_email"`
	StripeCustomer       string `json:"stripe_customer"`
	Quota                int    `json:"quota"`
	UsedQuota            int    `json:"used_quota"`
	RequestCount         int    `json:"request_count"`
	ActiveMemberCount    int64  `json:"active_member_count"`
	Status               string `json:"status"`
	CreatedAt            int64  `json:"created_at"`
	UpdatedAt            int64  `json:"updated_at"`
}

type TeamMembership struct {
	Id                             string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	TeamId                         string `json:"team_id" gorm:"type:varchar(32);not null;uniqueIndex:idx_team_membership_user;index"`
	UserId                         string `json:"user_id" gorm:"type:varchar(32);not null;uniqueIndex:idx_team_membership_user;index"`
	WorkOSOrganizationMembershipId string `json:"workos_organization_membership_id" gorm:"column:workos_organization_membership_id;type:text;not null;uniqueIndex"`
	Role                           string `json:"role" gorm:"type:varchar(16);not null;index"`
	Status                         string `json:"status" gorm:"type:varchar(32);not null;default:'active';index"`
	JoinedAt                       int64  `json:"joined_at" gorm:"not null;index"`
	CreatedAt                      int64  `json:"created_at" gorm:"not null"`
	UpdatedAt                      int64  `json:"updated_at" gorm:"not null"`
	DisplayName                    string `json:"display_name,omitempty" gorm:"-"`
	Email                          string `json:"email,omitempty" gorm:"-"`
	Username                       string `json:"username,omitempty" gorm:"-"`
}

func (TeamMembership) TableName() string {
	return "team_memberships"
}

type TeamInvitation struct {
	Id                 string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	TeamId             string `json:"team_id" gorm:"type:varchar(32);not null;index"`
	Email              string `json:"email" gorm:"type:text;not null;index"`
	Role               string `json:"role" gorm:"type:varchar(16);not null"`
	WorkOSInvitationId string `json:"workos_invitation_id" gorm:"column:workos_invitation_id;type:text;not null;uniqueIndex"`
	Status             string `json:"status" gorm:"type:varchar(32);not null;index"`
	InvitedByUserId    string `json:"invited_by_user_id" gorm:"type:varchar(32);not null;index"`
	AcceptedByUserId   string `json:"accepted_by_user_id" gorm:"type:varchar(32);default:'';index"`
	ExpiresAt          int64  `json:"expires_at" gorm:"default:0;index"`
	CreatedAt          int64  `json:"created_at" gorm:"not null"`
	UpdatedAt          int64  `json:"updated_at" gorm:"not null"`
}

func (TeamInvitation) TableName() string {
	return "team_invitations"
}

type TeamPolicy struct {
	TeamId          string `json:"team_id" gorm:"primaryKey;type:varchar(32)"`
	ModelPolicy     string `json:"model_policy" gorm:"type:jsonb;not null;default:'{}'"`
	GroupPolicy     string `json:"group_policy" gorm:"type:jsonb;not null;default:'{}'"`
	UpdatedByUserId string `json:"updated_by_user_id" gorm:"type:varchar(32);not null"`
	UpdatedAt       int64  `json:"updated_at" gorm:"not null"`
}

func (TeamPolicy) TableName() string {
	return "team_policies"
}

type TeamPolicyDocument struct {
	Models PolicyToggleSet `json:"models"`
	Groups PolicyToggleSet `json:"groups"`
}

type PolicyToggleSet struct {
	DefaultEnabled bool     `json:"default_enabled"`
	Disabled       []string `json:"disabled"`
}

type CreateTeamParams struct {
	Name                 string
	CreatedByUserId      string
	WorkOSOrganizationId string
	WorkOSMembershipId   string
}

type InviteTeamMemberParams struct {
	TeamId             string
	Email              string
	Role               string
	InvitedByUserId    string
	WorkOSInvitationId string
	ExpiresAt          int64
}

type SyncTeamMembershipParams struct {
	TeamId                         string
	UserId                         string
	WorkOSOrganizationMembershipId string
	Role                           string
	Status                         string
}

func (team *Team) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&team.Id, "team")
	now := common.GetTimestamp()
	if team.CreatedAt == 0 {
		team.CreatedAt = now
	}
	if team.UpdatedAt == 0 {
		team.UpdatedAt = now
	}
	return nil
}

func (membership *TeamMembership) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&membership.Id, "tmem")
	now := common.GetTimestamp()
	if membership.JoinedAt == 0 {
		membership.JoinedAt = now
	}
	if membership.CreatedAt == 0 {
		membership.CreatedAt = now
	}
	if membership.UpdatedAt == 0 {
		membership.UpdatedAt = now
	}
	return nil
}

func (invitation *TeamInvitation) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&invitation.Id, "tinv")
	now := common.GetTimestamp()
	if invitation.CreatedAt == 0 {
		invitation.CreatedAt = now
	}
	if invitation.UpdatedAt == 0 {
		invitation.UpdatedAt = now
	}
	return nil
}

func normalizeTeamRole(role string) (string, error) {
	role = strings.ToLower(strings.TrimSpace(role))
	switch role {
	case TeamRoleAdmin, TeamRoleMember:
		return role, nil
	default:
		return "", errors.New("invalid team role")
	}
}

func normalizeMembershipStatus(status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "" {
		return MembershipActive
	}
	switch status {
	case MembershipActive, MembershipInactive, "pending":
		return status
	default:
		return MembershipInactive
	}
}

func TeamSlugFromName(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = teamSlugUnsafe.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "team"
	}
	if len(slug) > 48 {
		slug = strings.Trim(slug[:48], "-")
	}
	return slug
}

func normalizeTeamGroup(group string) string {
	group = strings.TrimSpace(group)
	if group == "" {
		return "default"
	}
	return group
}

func uniqueTeamSlugTx(tx *gorm.DB, name string) (string, error) {
	base := TeamSlugFromName(name)
	slug := base
	for i := 0; i < 20; i++ {
		var count int64
		if err := tx.Model(&Team{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%s", base, common.MustNewNanoIDKey(6))
	}
	return "", errors.New("failed to generate unique team slug")
}

func defaultTeamPolicyDocument() TeamPolicyDocument {
	return TeamPolicyDocument{
		Models: PolicyToggleSet{DefaultEnabled: true, Disabled: []string{}},
		Groups: PolicyToggleSet{DefaultEnabled: true, Disabled: []string{}},
	}
}

func encodePolicySet(set PolicyToggleSet) string {
	if set.Disabled == nil {
		set.Disabled = []string{}
	}
	payload, err := json.Marshal(set)
	if err != nil {
		return `{"default_enabled":true,"disabled":[]}`
	}
	return string(payload)
}

func DecodePolicySet(value string) PolicyToggleSet {
	var set PolicyToggleSet
	if strings.TrimSpace(value) != "" {
		_ = json.Unmarshal([]byte(value), &set)
	}
	if set.Disabled == nil {
		set.Disabled = []string{}
	}
	return set
}

func CreateTeamWithCreator(params CreateTeamParams) (*Team, error) {
	params.Name = strings.TrimSpace(params.Name)
	params.CreatedByUserId = strings.TrimSpace(params.CreatedByUserId)
	params.WorkOSOrganizationId = strings.TrimSpace(params.WorkOSOrganizationId)
	params.WorkOSMembershipId = strings.TrimSpace(params.WorkOSMembershipId)
	if params.Name == "" || common.IsEmptyID(params.CreatedByUserId) || params.WorkOSOrganizationId == "" || params.WorkOSMembershipId == "" {
		return nil, errors.New("invalid team creation args")
	}

	var team *Team
	err := DB.Transaction(func(tx *gorm.DB) error {
		slug, err := uniqueTeamSlugTx(tx, params.Name)
		if err != nil {
			return err
		}
		now := common.GetTimestamp()
		team = &Team{
			WorkOSOrganizationId: params.WorkOSOrganizationId,
			Name:                 params.Name,
			Slug:                 slug,
			Group:                "default",
			CreatedByUserId:      params.CreatedByUserId,
			Status:               TeamStatusActive,
			CreatedAt:            now,
			UpdatedAt:            now,
		}
		if err := tx.Create(team).Error; err != nil {
			return err
		}
		membership := &TeamMembership{
			TeamId:                         team.Id,
			UserId:                         params.CreatedByUserId,
			WorkOSOrganizationMembershipId: params.WorkOSMembershipId,
			Role:                           TeamRoleAdmin,
			Status:                         MembershipActive,
			JoinedAt:                       now,
			CreatedAt:                      now,
			UpdatedAt:                      now,
		}
		if err := tx.Create(membership).Error; err != nil {
			return err
		}
		doc := defaultTeamPolicyDocument()
		policy := &TeamPolicy{
			TeamId:          team.Id,
			ModelPolicy:     encodePolicySet(doc.Models),
			GroupPolicy:     encodePolicySet(doc.Groups),
			UpdatedByUserId: params.CreatedByUserId,
			UpdatedAt:       now,
		}
		return tx.Create(policy).Error
	})
	return team, err
}

func CountTeamsCreatedByUser(userId string) (int64, error) {
	var count int64
	err := DB.Model(&Team{}).Where("created_by_user_id = ? AND status = ?", userId, TeamStatusActive).Count(&count).Error
	return count, err
}

func CountActiveTeamMemberships(userId string) (int64, error) {
	return countActiveTeamMembershipsTx(DB, userId)
}

func countActiveTeamMembershipsTx(tx *gorm.DB, userId string) (int64, error) {
	var count int64
	err := tx.Model(&TeamMembership{}).Where("user_id = ? AND status = ?", userId, MembershipActive).Count(&count).Error
	return count, err
}

func CanActivateTeamMembership(userId string) error {
	return canActivateTeamMembershipTx(DB, userId)
}

func canActivateTeamMembershipTx(tx *gorm.DB, userId string) error {
	count, err := countActiveTeamMembershipsTx(tx, userId)
	if err != nil {
		return err
	}
	if int(count) >= GetMaxTeamMembershipsPerUser() {
		return errors.New("team membership limit reached")
	}
	return nil
}

func ListTeamsForUser(userId string) ([]Team, error) {
	var teams []Team
	err := DB.Table("teams").
		Select("teams.*, team_memberships.role AS role").
		Joins("JOIN team_memberships ON team_memberships.team_id = teams.id").
		Where("team_memberships.user_id = ? AND team_memberships.status = ? AND teams.status = ?", userId, MembershipActive, TeamStatusActive).
		Order("teams.created_at ASC").
		Find(&teams).Error
	return teams, err
}

func adminTeamsSelectQuery(query *gorm.DB) *gorm.DB {
	return query.Select(
		`teams.id,
teams.workos_organization_id,
teams.name,
teams.slug,
teams."group",
teams.created_by_user_id,
created_by.username AS created_by_username,
created_by.email AS created_by_email,
teams.stripe_customer,
teams.quota,
teams.used_quota,
teams.request_count,
teams.status,
teams.created_at,
teams.updated_at,
(SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = teams.id AND tm.status = ?) AS active_member_count`,
		MembershipActive,
	)
}

func adminTeamsBaseQuery() *gorm.DB {
	return DB.Table("teams").Joins("LEFT JOIN users created_by ON created_by.id = teams.created_by_user_id")
}

func applyAdminTeamFilters(query *gorm.DB, keyword string, group string, status string) *gorm.DB {
	keyword = strings.TrimSpace(keyword)
	group = strings.TrimSpace(group)
	status = strings.TrimSpace(status)
	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where(
			"teams.id = ? OR teams.name ILIKE ? OR teams.slug ILIKE ? OR teams.workos_organization_id ILIKE ? OR created_by.username ILIKE ? OR created_by.email ILIKE ?",
			keyword,
			like,
			like,
			like,
			like,
			like,
		)
	}
	if group != "" {
		query = query.Where(`teams."group" = ?`, group)
	}
	if status != "" {
		query = query.Where("teams.status = ?", status)
	}
	return query
}

func ListAdminTeams(pageInfo *common.PageInfo) ([]AdminTeam, int64, error) {
	var total int64
	if err := adminTeamsBaseQuery().Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var teams []AdminTeam
	err := adminTeamsSelectQuery(adminTeamsBaseQuery()).
		Order("teams.created_at DESC").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Scan(&teams).Error
	return teams, total, err
}

func SearchAdminTeams(keyword string, group string, status string, startIdx int, num int) ([]AdminTeam, int64, error) {
	query := applyAdminTeamFilters(adminTeamsBaseQuery(), keyword, group, status)
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var teams []AdminTeam
	err := adminTeamsSelectQuery(applyAdminTeamFilters(adminTeamsBaseQuery(), keyword, group, status)).
		Order("teams.created_at DESC").
		Limit(num).
		Offset(startIdx).
		Scan(&teams).Error
	return teams, total, err
}

func GetTeamById(teamId string) (*Team, error) {
	var team Team
	if err := DB.First(&team, "id = ? AND status = ?", teamId, TeamStatusActive).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func GetTeamByIdAnyStatus(teamId string) (*Team, error) {
	var team Team
	if err := DB.First(&team, "id = ?", strings.TrimSpace(teamId)).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func GetTeamByWorkOSOrganizationId(workOSOrganizationId string) (*Team, error) {
	var team Team
	if err := DB.First(&team, "workos_organization_id = ? AND status = ?", strings.TrimSpace(workOSOrganizationId), TeamStatusActive).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

func UpdateTeam(teamId string, name string) (*Team, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("team name is required")
	}
	err := DB.Model(&Team{}).Where("id = ? AND status = ?", teamId, TeamStatusActive).Updates(map[string]interface{}{
		"name":       name,
		"updated_at": common.GetTimestamp(),
	}).Error
	if err != nil {
		return nil, err
	}
	return GetTeamById(teamId)
}

func AdminUpdateTeam(teamId string, name string, group string, quota int) (*Team, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("team name is required")
	}
	group = normalizeTeamGroup(group)
	if quota < 0 {
		return nil, errors.New("team quota cannot be negative")
	}
	result := DB.Model(&Team{}).Where("id = ? AND status = ?", strings.TrimSpace(teamId), TeamStatusActive).Updates(map[string]interface{}{
		"name":       name,
		"group":      group,
		"quota":      quota,
		"updated_at": common.GetTimestamp(),
	})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return GetTeamById(teamId)
}

func DeleteTeam(teamId string) error {
	now := common.GetTimestamp()
	return DB.Transaction(func(tx *gorm.DB) error {
		var team Team
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&team, "id = ? AND status = ?", teamId, TeamStatusActive).Error; err != nil {
			return err
		}
		if err := tx.Model(&Team{}).Where("id = ?", teamId).Updates(map[string]interface{}{
			"status":     TeamStatusDeleted,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		return tx.Model(&TeamMembership{}).Where("team_id = ?", teamId).Updates(map[string]interface{}{
			"status":     MembershipInactive,
			"updated_at": now,
		}).Error
	})
}

func DeactivateUserTeamMemberships(userId string) error {
	now := common.GetTimestamp()
	return DB.Model(&TeamMembership{}).
		Where("user_id = ? AND status = ?", strings.TrimSpace(userId), MembershipActive).
		Updates(map[string]interface{}{
			"status":     MembershipInactive,
			"updated_at": now,
		}).Error
}

func UpdateTeamFromWorkOSOrganization(workOSOrganizationId string, name string) error {
	workOSOrganizationId = strings.TrimSpace(workOSOrganizationId)
	name = strings.TrimSpace(name)
	if workOSOrganizationId == "" {
		return errors.New("workos organization id is required")
	}
	updates := map[string]interface{}{
		"updated_at": common.GetTimestamp(),
	}
	if name != "" {
		updates["name"] = name
	}
	return DB.Model(&Team{}).Where("workos_organization_id = ? AND status = ?", workOSOrganizationId, TeamStatusActive).Updates(updates).Error
}

func DeleteTeamByWorkOSOrganizationId(workOSOrganizationId string) error {
	workOSOrganizationId = strings.TrimSpace(workOSOrganizationId)
	if workOSOrganizationId == "" {
		return errors.New("workos organization id is required")
	}
	now := common.GetTimestamp()
	return DB.Transaction(func(tx *gorm.DB) error {
		var team Team
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&team, "workos_organization_id = ? AND status = ?", workOSOrganizationId, TeamStatusActive).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		if err := tx.Model(&Team{}).Where("id = ?", team.Id).Updates(map[string]interface{}{
			"status":     TeamStatusDeleted,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
		return tx.Model(&TeamMembership{}).Where("team_id = ?", team.Id).Updates(map[string]interface{}{
			"status":     MembershipInactive,
			"updated_at": now,
		}).Error
	})
}

func GetTeamMembership(teamId string, userId string) (*TeamMembership, error) {
	var membership TeamMembership
	if err := DB.First(&membership, "team_id = ? AND user_id = ? AND status = ?", teamId, userId, MembershipActive).Error; err != nil {
		return nil, err
	}
	return &membership, nil
}

func RequireTeamMember(teamId string, userId string) (*TeamMembership, error) {
	return GetTeamMembership(teamId, userId)
}

func RequireTeamAdmin(teamId string, userId string) (*TeamMembership, error) {
	membership, err := GetTeamMembership(teamId, userId)
	if err != nil {
		return nil, err
	}
	if membership.Role != TeamRoleAdmin {
		return nil, errors.New("team admin permission required")
	}
	return membership, nil
}

func ListTeamMembers(teamId string) ([]TeamMembership, error) {
	var members []TeamMembership
	err := DB.Where("team_id = ?", teamId).Order("created_at ASC").Find(&members).Error
	return members, err
}

func ListTeamInvitations(teamId string) ([]TeamInvitation, error) {
	var invitations []TeamInvitation
	err := DB.Where("team_id = ?", teamId).Order("created_at DESC").Find(&invitations).Error
	return invitations, err
}

func FindPendingTeamInvitationByEmail(teamId string, email string) (*TeamInvitation, error) {
	var invitation TeamInvitation
	err := DB.Where("team_id = ? AND lower(email) = ? AND status = ?", teamId, strings.ToLower(strings.TrimSpace(email)), InvitationPending).
		Order("created_at DESC").
		First(&invitation).Error
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

func GetTeamInvitationById(invitationId string, teamId string) (*TeamInvitation, error) {
	var invitation TeamInvitation
	err := DB.First(&invitation, "id = ? AND team_id = ?", strings.TrimSpace(invitationId), strings.TrimSpace(teamId)).Error
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

func CreateTeamInvitation(params InviteTeamMemberParams) (*TeamInvitation, error) {
	role, err := normalizeTeamRole(params.Role)
	if err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(params.Email))
	if email == "" || !strings.Contains(email, "@") {
		return nil, errors.New("valid email is required")
	}
	invitation := &TeamInvitation{
		TeamId:             strings.TrimSpace(params.TeamId),
		Email:              email,
		Role:               role,
		WorkOSInvitationId: strings.TrimSpace(params.WorkOSInvitationId),
		Status:             InvitationPending,
		InvitedByUserId:    strings.TrimSpace(params.InvitedByUserId),
		ExpiresAt:          params.ExpiresAt,
	}
	if invitation.TeamId == "" || invitation.InvitedByUserId == "" {
		return nil, errors.New("invalid team invitation args")
	}
	if invitation.WorkOSInvitationId == "" {
		fillTypedID(&invitation.Id, "tinv")
		invitation.WorkOSInvitationId = invitation.Id
	}
	if err := DB.Create(invitation).Error; err != nil {
		return nil, err
	}
	return invitation, nil
}

func AttachWorkOSInvitationToTeamInvitation(invitationId string, workOSInvitationId string, expiresAt int64) (*TeamInvitation, error) {
	invitationId = strings.TrimSpace(invitationId)
	workOSInvitationId = strings.TrimSpace(workOSInvitationId)
	if invitationId == "" || workOSInvitationId == "" {
		return nil, errors.New("invalid team invitation args")
	}
	result := DB.Model(&TeamInvitation{}).Where("id = ? AND status = ?", invitationId, InvitationPending).Updates(map[string]interface{}{
		"workos_invitation_id": workOSInvitationId,
		"expires_at":           expiresAt,
		"updated_at":           common.GetTimestamp(),
	})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	var invitation TeamInvitation
	if err := DB.First(&invitation, "id = ?", invitationId).Error; err != nil {
		return nil, err
	}
	return &invitation, nil
}

func MarkTeamInvitationStatus(workOSInvitationId string, status string, acceptedByUserId string) error {
	updates := map[string]interface{}{
		"status":     strings.TrimSpace(status),
		"updated_at": common.GetTimestamp(),
	}
	if acceptedByUserId != "" {
		updates["accepted_by_user_id"] = acceptedByUserId
	}
	return DB.Model(&TeamInvitation{}).Where("workos_invitation_id = ?", strings.TrimSpace(workOSInvitationId)).Updates(updates).Error
}

func SyncTeamMembership(params SyncTeamMembershipParams) (*TeamMembership, error) {
	role, err := normalizeTeamRole(params.Role)
	if err != nil {
		return nil, err
	}
	status := normalizeMembershipStatus(params.Status)
	now := common.GetTimestamp()
	var membership TeamMembership
	err = DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&membership, "team_id = ? AND user_id = ?", params.TeamId, params.UserId).Error
		switch {
		case err == nil:
			if status == MembershipActive && membership.Status != MembershipActive {
				if err := canActivateTeamMembershipTx(tx, params.UserId); err != nil {
					return err
				}
			}
			if membership.Role == TeamRoleAdmin && membership.Status == MembershipActive && (role != TeamRoleAdmin || status != MembershipActive) {
				count, err := lockActiveAdminMembershipsTx(tx, params.TeamId)
				if err != nil {
					return err
				}
				if count <= 1 {
					return errors.New("cannot sync away the last active team admin")
				}
			}
			updates := map[string]interface{}{
				"workos_organization_membership_id": strings.TrimSpace(params.WorkOSOrganizationMembershipId),
				"role":                              role,
				"status":                            status,
				"updated_at":                        now,
			}
			if status == MembershipActive && membership.JoinedAt == 0 {
				updates["joined_at"] = now
			}
			if err := tx.Model(&TeamMembership{}).Where("id = ?", membership.Id).Updates(updates).Error; err != nil {
				return err
			}
		case errors.Is(err, gorm.ErrRecordNotFound):
			if status == MembershipActive {
				if err := canActivateTeamMembershipTx(tx, params.UserId); err != nil {
					return err
				}
			}
			membership = TeamMembership{
				TeamId:                         strings.TrimSpace(params.TeamId),
				UserId:                         strings.TrimSpace(params.UserId),
				WorkOSOrganizationMembershipId: strings.TrimSpace(params.WorkOSOrganizationMembershipId),
				Role:                           role,
				Status:                         status,
				JoinedAt:                       now,
				CreatedAt:                      now,
				UpdatedAt:                      now,
			}
			if err := tx.Create(&membership).Error; err != nil {
				return err
			}
		default:
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	var synced TeamMembership
	if err := DB.First(&synced, "team_id = ? AND user_id = ?", params.TeamId, params.UserId).Error; err != nil {
		return nil, err
	}
	return &synced, nil
}

func activeAdminCountTx(tx *gorm.DB, teamId string) (int64, error) {
	var count int64
	err := tx.Model(&TeamMembership{}).Where("team_id = ? AND role = ? AND status = ?", teamId, TeamRoleAdmin, MembershipActive).Count(&count).Error
	return count, err
}

func lockActiveAdminMembershipsTx(tx *gorm.DB, teamId string) (int64, error) {
	var admins []TeamMembership
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("team_id = ? AND role = ? AND status = ?", teamId, TeamRoleAdmin, MembershipActive).
		Order("id ASC").
		Find(&admins).Error
	if err != nil {
		return 0, err
	}
	return int64(len(admins)), nil
}

func UpdateTeamMemberRole(teamId string, targetUserId string, role string) error {
	role, err := normalizeTeamRole(role)
	if err != nil {
		return err
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var membership TeamMembership
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&membership, "team_id = ? AND user_id = ?", teamId, targetUserId).Error; err != nil {
			return err
		}
		if membership.Role == TeamRoleAdmin && role != TeamRoleAdmin && membership.Status == MembershipActive {
			count, err := lockActiveAdminMembershipsTx(tx, teamId)
			if err != nil {
				return err
			}
			if count <= 1 {
				return errors.New("cannot downgrade the last active team admin")
			}
		}
		return tx.Model(&TeamMembership{}).Where("id = ?", membership.Id).Updates(map[string]interface{}{
			"role":       role,
			"updated_at": common.GetTimestamp(),
		}).Error
	})
}

func EnsureCanUpdateTeamMemberRole(teamId string, targetUserId string, role string) error {
	role, err := normalizeTeamRole(role)
	if err != nil {
		return err
	}
	var membership TeamMembership
	if err := DB.First(&membership, "team_id = ? AND user_id = ?", teamId, targetUserId).Error; err != nil {
		return err
	}
	if membership.Role == TeamRoleAdmin && role != TeamRoleAdmin && membership.Status == MembershipActive {
		var count int64
		if err := DB.Model(&TeamMembership{}).Where("team_id = ? AND role = ? AND status = ?", teamId, TeamRoleAdmin, MembershipActive).Count(&count).Error; err != nil {
			return err
		}
		if count <= 1 {
			return errors.New("cannot downgrade the last active team admin")
		}
	}
	return nil
}

func RemoveTeamMember(teamId string, targetUserId string) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var membership TeamMembership
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&membership, "team_id = ? AND user_id = ?", teamId, targetUserId).Error; err != nil {
			return err
		}
		if membership.Role == TeamRoleAdmin && membership.Status == MembershipActive {
			count, err := lockActiveAdminMembershipsTx(tx, teamId)
			if err != nil {
				return err
			}
			if count <= 1 {
				return errors.New("cannot remove the last active team admin")
			}
		}
		return tx.Model(&TeamMembership{}).Where("id = ?", membership.Id).Updates(map[string]interface{}{
			"status":     MembershipInactive,
			"updated_at": common.GetTimestamp(),
		}).Error
	})
}

func EnsureCanRemoveTeamMember(teamId string, targetUserId string) error {
	var membership TeamMembership
	if err := DB.First(&membership, "team_id = ? AND user_id = ?", teamId, targetUserId).Error; err != nil {
		return err
	}
	if membership.Role == TeamRoleAdmin && membership.Status == MembershipActive {
		var count int64
		if err := DB.Model(&TeamMembership{}).Where("team_id = ? AND role = ? AND status = ?", teamId, TeamRoleAdmin, MembershipActive).Count(&count).Error; err != nil {
			return err
		}
		if count <= 1 {
			return errors.New("cannot remove the last active team admin")
		}
	}
	return nil
}

func GetTeamPolicy(teamId string) (*TeamPolicy, error) {
	var policy TeamPolicy
	err := DB.First(&policy, "team_id = ?", teamId).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		doc := defaultTeamPolicyDocument()
		policy = TeamPolicy{
			TeamId:      teamId,
			ModelPolicy: encodePolicySet(doc.Models),
			GroupPolicy: encodePolicySet(doc.Groups),
			UpdatedAt:   common.GetTimestamp(),
		}
		return &policy, nil
	}
	return &policy, err
}

func UpdateTeamPolicy(teamId string, actorUserId string, modelPolicy PolicyToggleSet, groupPolicy PolicyToggleSet) (*TeamPolicy, error) {
	policy := &TeamPolicy{
		TeamId:          teamId,
		ModelPolicy:     encodePolicySet(modelPolicy),
		GroupPolicy:     encodePolicySet(groupPolicy),
		UpdatedByUserId: actorUserId,
		UpdatedAt:       common.GetTimestamp(),
	}
	err := DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "team_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"model_policy",
			"group_policy",
			"updated_by_user_id",
			"updated_at",
		}),
	}).Create(policy).Error
	if err != nil {
		return nil, err
	}
	return GetTeamPolicy(teamId)
}

func policyAllows(value string, set PolicyToggleSet) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return true
	}
	disabled := map[string]bool{}
	for _, item := range set.Disabled {
		disabled[strings.TrimSpace(item)] = true
	}
	if disabled[value] {
		return false
	}
	return set.DefaultEnabled
}

func TeamPolicyAllowsModel(policy *TeamPolicy, modelName string) bool {
	if policy == nil {
		return true
	}
	return policyAllows(modelName, DecodePolicySet(policy.ModelPolicy))
}

func TeamPolicyAllowsGroup(policy *TeamPolicy, groupName string) bool {
	if policy == nil {
		return true
	}
	return policyAllows(groupName, DecodePolicySet(policy.GroupPolicy))
}

func UpdateTeamUsage(teamId string, quota int, count int) {
	if teamId == "" {
		return
	}
	if err := DB.Model(&Team{}).Where("id = ?", teamId).Updates(map[string]interface{}{
		"used_quota":    gorm.Expr("used_quota + ?", quota),
		"request_count": gorm.Expr("request_count + ?", count),
		"updated_at":    common.GetTimestamp(),
	}).Error; err != nil {
		common.SysLog("failed to update team usage: " + err.Error())
	}
}

func UpdateAccountUsedQuotaAndRequestCount(account AccountContext, userId string, quota int) {
	switch account.Type {
	case AccountTypeTeam:
		UpdateTeamUsage(account.Id, quota, 1)
	default:
		UpdateUserUsedQuotaAndRequestCount(userId, quota)
	}
}

func GetTeamQuota(id string) (quota int, err error) {
	err = DB.Model(&Team{}).Where("id = ? AND status = ?", id, TeamStatusActive).Select("quota").Find(&quota).Error
	return quota, err
}

func GetAccountQuota(account AccountContext) (int, error) {
	switch account.Type {
	case AccountTypePersonal:
		return GetUserQuota(account.Id, false)
	case AccountTypeTeam:
		return GetTeamQuota(account.Id)
	default:
		return 0, errors.New("unsupported account type")
	}
}

func optionIntValue(key string, fallback int) int {
	common.OptionMapRWMutex.RLock()
	value := strings.TrimSpace(common.OptionMap[key])
	common.OptionMapRWMutex.RUnlock()
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func optionBoolValue(key string, fallback bool) bool {
	common.OptionMapRWMutex.RLock()
	value := strings.TrimSpace(common.OptionMap[key])
	common.OptionMapRWMutex.RUnlock()
	if value == "" {
		return fallback
	}
	return value == "true"
}

func GetMaxTeamsCreatedPerUser() int {
	return optionIntValue("max_teams_created_per_user", 5)
}

func GetMaxTeamMembershipsPerUser() int {
	return optionIntValue("max_team_memberships_per_user", 20)
}

func TeamCreationEnabled() bool {
	return optionBoolValue("team_creation_enabled", true)
}

func TeamInvitationEnabled() bool {
	return optionBoolValue("team_invitation_enabled", true)
}
