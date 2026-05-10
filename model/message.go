package model

import (
	"encoding/json"
	"errors"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	InboxItemTypeMessage   = "message"
	InboxItemTypeBroadcast = "broadcast"

	UserMessageDeliveryPending = "pending"
	UserMessageDeliverySent    = "sent"
	UserMessageDeliverySkipped = "skipped"
	UserMessageDeliveryFailed  = "failed"

	BroadcastAudienceSelected       = "selected"
	BroadcastAudienceAllUsers       = "all_users"
	BroadcastAudienceUsersAndGuests = "users_and_guests"

	BroadcastStatusSent = "sent"
)

var (
	ErrBroadcastNotVisible = errors.New("broadcast is not visible to this user")
)

type UserMessage struct {
	Id               string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	UserId           string `json:"user_id" gorm:"type:varchar(32);index;not null"`
	Title            string `json:"title" gorm:"type:varchar(255);not null"`
	Content          string `json:"content" gorm:"type:text;not null"`
	NotificationType string `json:"notification_type" gorm:"type:varchar(64);default:'';index"`
	SourceType       string `json:"source_type" gorm:"type:varchar(64);default:''"`
	SourceId         string `json:"source_id" gorm:"type:varchar(128);default:''"`
	DeliveryChannel  string `json:"delivery_channel" gorm:"type:varchar(32);default:''"`
	DeliveryStatus   string `json:"delivery_status" gorm:"type:varchar(32);default:'pending'"`
	EmailTo          string `json:"email_to" gorm:"type:varchar(255);default:''"`
	Metadata         string `json:"metadata" gorm:"type:text;default:'{}'"`
	CreatedAt        int64  `json:"created_at" gorm:"type:bigint;index;not null"`
	ReadAt           int64  `json:"read_at" gorm:"type:bigint;default:0;index"`
}

func (UserMessage) TableName() string {
	return "messages"
}

type Broadcast struct {
	Id               string         `json:"id" gorm:"primaryKey;type:varchar(32)"`
	Title            string         `json:"title" gorm:"type:varchar(255);not null"`
	Content          string         `json:"content" gorm:"type:text;not null"`
	AudienceType     string         `json:"audience_type" gorm:"type:varchar(32);index;not null"`
	Audience         string         `json:"audience" gorm:"type:text;not null;default:'{}'"`
	EmailEnabled     bool           `json:"email_enabled" gorm:"default:false"`
	Status           string         `json:"status" gorm:"type:varchar(32);index;not null;default:'sent'"`
	CreatedBy        string         `json:"created_by" gorm:"type:varchar(32);index;not null"`
	RecipientCount   int            `json:"recipient_count" gorm:"type:int;default:0"`
	EmailSentCount   int            `json:"email_sent_count" gorm:"type:int;default:0"`
	EmailFailedCount int            `json:"email_failed_count" gorm:"type:int;default:0"`
	CreatedAt        int64          `json:"created_at" gorm:"type:bigint;index;not null"`
	SentAt           int64          `json:"sent_at" gorm:"type:bigint;index;not null"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

type BroadcastReadReceipt struct {
	Id          string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	BroadcastId string `json:"broadcast_id" gorm:"type:varchar(32);uniqueIndex:idx_broadcast_read_user,priority:1;not null"`
	UserId      string `json:"user_id" gorm:"type:varchar(32);uniqueIndex:idx_broadcast_read_user,priority:2;not null"`
	ReadAt      int64  `json:"read_at" gorm:"type:bigint;not null"`
}

type BroadcastAudience struct {
	UserIds []string `json:"user_ids"`
	Groups  []string `json:"groups"`
	Roles   []int    `json:"roles"`
}

type InboxItem struct {
	Id               string            `json:"id"`
	ItemType         string            `json:"item_type"`
	Title            string            `json:"title"`
	Content          string            `json:"content"`
	NotificationType string            `json:"notification_type,omitempty"`
	DeliveryChannel  string            `json:"delivery_channel,omitempty"`
	DeliveryStatus   string            `json:"delivery_status,omitempty"`
	AudienceType     string            `json:"audience_type,omitempty"`
	EmailEnabled     bool              `json:"email_enabled,omitempty"`
	RecipientCount   int               `json:"recipient_count,omitempty"`
	EmailSentCount   int               `json:"email_sent_count,omitempty"`
	EmailFailedCount int               `json:"email_failed_count,omitempty"`
	CreatedAt        int64             `json:"created_at"`
	ReadAt           int64             `json:"read_at"`
	Metadata         map[string]string `json:"metadata,omitempty"`
}

type PublicBroadcast struct {
	Id           string `json:"id"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	AudienceType string `json:"audience_type"`
	SentAt       int64  `json:"sent_at"`
}

func (m *UserMessage) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&m.Id, "msg")
	if m.CreatedAt == 0 {
		m.CreatedAt = common.GetTimestamp()
	}
	if strings.TrimSpace(m.DeliveryStatus) == "" {
		m.DeliveryStatus = UserMessageDeliveryPending
	}
	if strings.TrimSpace(m.Metadata) == "" {
		m.Metadata = "{}"
	}
	return nil
}

func (b *Broadcast) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&b.Id, "brd")
	now := common.GetTimestamp()
	if b.CreatedAt == 0 {
		b.CreatedAt = now
	}
	if b.SentAt == 0 {
		b.SentAt = now
	}
	if strings.TrimSpace(b.Status) == "" {
		b.Status = BroadcastStatusSent
	}
	if strings.TrimSpace(b.Audience) == "" {
		b.Audience = "{}"
	}
	return nil
}

func (r *BroadcastReadReceipt) BeforeCreate(tx *gorm.DB) error {
	fillTypedID(&r.Id, "brr")
	if r.ReadAt == 0 {
		r.ReadAt = common.GetTimestamp()
	}
	return nil
}

func NormalizeBroadcastAudienceType(value string) string {
	switch strings.TrimSpace(value) {
	case BroadcastAudienceAllUsers:
		return BroadcastAudienceAllUsers
	case BroadcastAudienceUsersAndGuests:
		return BroadcastAudienceUsersAndGuests
	default:
		return BroadcastAudienceSelected
	}
}

func MarshalBroadcastAudience(audience BroadcastAudience) string {
	normalizeBroadcastAudience(&audience)
	payload, err := json.Marshal(audience)
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func ParseBroadcastAudience(payload string) BroadcastAudience {
	var audience BroadcastAudience
	if strings.TrimSpace(payload) == "" {
		return audience
	}
	if err := json.Unmarshal([]byte(payload), &audience); err != nil {
		return BroadcastAudience{}
	}
	normalizeBroadcastAudience(&audience)
	return audience
}

func normalizeBroadcastAudience(audience *BroadcastAudience) {
	audience.UserIds = uniqueStrings(audience.UserIds)
	audience.Groups = uniqueStrings(audience.Groups)
	audience.Roles = uniqueRoles(audience.Roles)
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func uniqueRoles(values []int) []int {
	seen := map[int]struct{}{}
	result := make([]int, 0, len(values))
	for _, role := range values {
		if !common.IsValidateRole(role) || role == common.RoleGuestUser {
			continue
		}
		if _, ok := seen[role]; ok {
			continue
		}
		seen[role] = struct{}{}
		result = append(result, role)
	}
	sort.Ints(result)
	return result
}

func CreateUserMessage(message *UserMessage) error {
	if message == nil {
		return nil
	}
	message.Title = strings.TrimSpace(message.Title)
	message.Content = strings.TrimSpace(message.Content)
	if common.IsEmptyID(message.UserId) || message.Title == "" || message.Content == "" {
		return errors.New("message user, title and content are required")
	}
	return DB.Create(message).Error
}

func UpdateUserMessageDeliveryStatus(id string, status string) error {
	if common.IsEmptyID(id) || strings.TrimSpace(status) == "" {
		return nil
	}
	return DB.Model(&UserMessage{}).Where("id = ?", id).Update("delivery_status", status).Error
}

func ListInboxItems(user *User, pageInfo *common.PageInfo, itemType string) ([]InboxItem, int, error) {
	if user == nil || common.IsEmptyID(user.Id) {
		return nil, 0, errors.New("user is required")
	}

	items := make([]InboxItem, 0)
	if itemType == "" || itemType == "all" || itemType == InboxItemTypeMessage {
		messages, err := listUserMessages(user.Id)
		if err != nil {
			return nil, 0, err
		}
		for _, message := range messages {
			items = append(items, inboxItemFromMessage(message))
		}
	}
	if itemType == "" || itemType == "all" || itemType == InboxItemTypeBroadcast {
		broadcasts, err := listVisibleBroadcastsForUser(user)
		if err != nil {
			return nil, 0, err
		}
		readMap, err := getBroadcastReadMap(user.Id, broadcasts)
		if err != nil {
			return nil, 0, err
		}
		for _, broadcast := range broadcasts {
			items = append(items, inboxItemFromBroadcast(broadcast, readMap[broadcast.Id]))
		}
	}

	sortInboxItems(items)
	total := len(items)
	start := pageInfo.GetStartIdx()
	if start >= total {
		return []InboxItem{}, total, nil
	}
	end := start + pageInfo.GetPageSize()
	if end > total {
		end = total
	}
	return items[start:end], total, nil
}

func CountUnreadInboxItems(user *User) (int, error) {
	if user == nil || common.IsEmptyID(user.Id) {
		return 0, errors.New("user is required")
	}

	var directUnread int64
	if err := DB.Model(&UserMessage{}).Where("user_id = ? AND read_at = 0", user.Id).Count(&directUnread).Error; err != nil {
		return 0, err
	}

	broadcasts, err := listVisibleBroadcastsForUser(user)
	if err != nil {
		return 0, err
	}
	readMap, err := getBroadcastReadMap(user.Id, broadcasts)
	if err != nil {
		return 0, err
	}
	unreadBroadcasts := 0
	for _, broadcast := range broadcasts {
		if readMap[broadcast.Id] == 0 {
			unreadBroadcasts++
		}
	}
	return int(directUnread) + unreadBroadcasts, nil
}

func listUserMessages(userID string) ([]UserMessage, error) {
	var messages []UserMessage
	err := DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&messages).Error
	return messages, err
}

func listVisibleBroadcastsForUser(user *User) ([]Broadcast, error) {
	var broadcasts []Broadcast
	if err := DB.Where("status = ?", BroadcastStatusSent).Order("sent_at DESC").Find(&broadcasts).Error; err != nil {
		return nil, err
	}
	visible := make([]Broadcast, 0, len(broadcasts))
	for _, broadcast := range broadcasts {
		if BroadcastVisibleToUser(broadcast, user) {
			visible = append(visible, broadcast)
		}
	}
	return visible, nil
}

func BroadcastVisibleToUser(broadcast Broadcast, user *User) bool {
	if user == nil {
		return broadcast.AudienceType == BroadcastAudienceUsersAndGuests
	}
	switch broadcast.AudienceType {
	case BroadcastAudienceAllUsers, BroadcastAudienceUsersAndGuests:
		return true
	case BroadcastAudienceSelected:
		audience := ParseBroadcastAudience(broadcast.Audience)
		if stringInSlice(user.Id, audience.UserIds) {
			return true
		}
		if stringInSlice(user.Group, audience.Groups) {
			return true
		}
		for _, role := range audience.Roles {
			if user.Role == role {
				return true
			}
		}
	}
	return false
}

func ResolveBroadcastRecipients(audienceType string, audience BroadcastAudience) ([]User, error) {
	audienceType = NormalizeBroadcastAudienceType(audienceType)
	normalizeBroadcastAudience(&audience)

	var users []User
	query := DB.Where("status = ?", common.UserStatusEnabled)
	switch audienceType {
	case BroadcastAudienceAllUsers, BroadcastAudienceUsersAndGuests:
		err := query.Find(&users).Error
		return users, err
	case BroadcastAudienceSelected:
		if len(audience.UserIds) == 0 && len(audience.Groups) == 0 && len(audience.Roles) == 0 {
			return []User{}, nil
		}
		orQuery := DB.Where("id IN ?", nonEmptyOrPlaceholder(audience.UserIds)).
			Or(commonGroupCol+" IN ?", nonEmptyOrPlaceholder(audience.Groups)).
			Or("role IN ?", nonEmptyIntOrPlaceholder(audience.Roles))
		err := query.Where(orQuery).Find(&users).Error
		return dedupeUsers(users), err
	default:
		return []User{}, nil
	}
}

func CreateBroadcast(broadcast *Broadcast) error {
	if broadcast == nil {
		return errors.New("broadcast is required")
	}
	broadcast.Title = strings.TrimSpace(broadcast.Title)
	broadcast.Content = strings.TrimSpace(broadcast.Content)
	broadcast.AudienceType = NormalizeBroadcastAudienceType(broadcast.AudienceType)
	if broadcast.Title == "" || broadcast.Content == "" || common.IsEmptyID(broadcast.CreatedBy) {
		return errors.New("broadcast title, content and creator are required")
	}
	return DB.Create(broadcast).Error
}

func UpdateBroadcastDeliveryCounts(id string, recipientCount int, emailSentCount int, emailFailedCount int) error {
	return DB.Model(&Broadcast{}).Where("id = ?", id).Updates(map[string]interface{}{
		"recipient_count":    recipientCount,
		"email_sent_count":   emailSentCount,
		"email_failed_count": emailFailedCount,
	}).Error
}

func ListAdminBroadcasts(pageInfo *common.PageInfo) ([]Broadcast, int64, error) {
	var total int64
	query := DB.Model(&Broadcast{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var broadcasts []Broadcast
	err := query.Order("sent_at DESC").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&broadcasts).Error
	return broadcasts, total, err
}

func DeleteBroadcast(id string) error {
	if common.IsEmptyID(id) {
		return errors.New("broadcast id is required")
	}
	return DB.Delete(&Broadcast{}, "id = ?", id).Error
}

func ListPublicBroadcasts(pageInfo *common.PageInfo) ([]PublicBroadcast, int64, error) {
	var total int64
	query := DB.Model(&Broadcast{}).Where("status = ? AND audience_type = ?", BroadcastStatusSent, BroadcastAudienceUsersAndGuests)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var broadcasts []Broadcast
	if err := query.Order("sent_at DESC").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&broadcasts).Error; err != nil {
		return nil, 0, err
	}
	publicBroadcasts := make([]PublicBroadcast, 0, len(broadcasts))
	for _, broadcast := range broadcasts {
		publicBroadcasts = append(publicBroadcasts, PublicBroadcast{
			Id:           broadcast.Id,
			Title:        broadcast.Title,
			Content:      broadcast.Content,
			AudienceType: broadcast.AudienceType,
			SentAt:       broadcast.SentAt,
		})
	}
	return publicBroadcasts, total, nil
}

func MarkInboxItemRead(user *User, itemType string, id string) error {
	if user == nil || common.IsEmptyID(user.Id) || common.IsEmptyID(id) {
		return errors.New("user and item id are required")
	}
	now := common.GetTimestamp()
	switch itemType {
	case InboxItemTypeMessage:
		return DB.Model(&UserMessage{}).Where("id = ? AND user_id = ?", id, user.Id).Update("read_at", now).Error
	case InboxItemTypeBroadcast:
		var broadcast Broadcast
		if err := DB.First(&broadcast, "id = ? AND status = ?", id, BroadcastStatusSent).Error; err != nil {
			return err
		}
		if !BroadcastVisibleToUser(broadcast, user) {
			return ErrBroadcastNotVisible
		}
		receipt := BroadcastReadReceipt{
			BroadcastId: id,
			UserId:      user.Id,
			ReadAt:      now,
		}
		return DB.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "broadcast_id"}, {Name: "user_id"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"read_at": now,
			}),
		}).Create(&receipt).Error
	default:
		return errors.New("unknown inbox item type")
	}
}

func MarkAllInboxRead(user *User) error {
	if user == nil || common.IsEmptyID(user.Id) {
		return errors.New("user is required")
	}
	now := common.GetTimestamp()
	if err := DB.Model(&UserMessage{}).Where("user_id = ? AND read_at = 0", user.Id).Update("read_at", now).Error; err != nil {
		return err
	}
	broadcasts, err := listVisibleBroadcastsForUser(user)
	if err != nil {
		return err
	}
	for _, broadcast := range broadcasts {
		if err := MarkInboxItemRead(user, InboxItemTypeBroadcast, broadcast.Id); err != nil {
			return err
		}
	}
	return nil
}

func getBroadcastReadMap(userID string, broadcasts []Broadcast) (map[string]int64, error) {
	result := map[string]int64{}
	if len(broadcasts) == 0 {
		return result, nil
	}
	ids := make([]string, 0, len(broadcasts))
	for _, broadcast := range broadcasts {
		ids = append(ids, broadcast.Id)
	}
	var receipts []BroadcastReadReceipt
	if err := DB.Where("user_id = ? AND broadcast_id IN ?", userID, ids).Find(&receipts).Error; err != nil {
		return nil, err
	}
	for _, receipt := range receipts {
		result[receipt.BroadcastId] = receipt.ReadAt
	}
	return result, nil
}

func inboxItemFromMessage(message UserMessage) InboxItem {
	return InboxItem{
		Id:               message.Id,
		ItemType:         InboxItemTypeMessage,
		Title:            message.Title,
		Content:          message.Content,
		NotificationType: message.NotificationType,
		DeliveryChannel:  message.DeliveryChannel,
		DeliveryStatus:   message.DeliveryStatus,
		CreatedAt:        message.CreatedAt,
		ReadAt:           message.ReadAt,
	}
}

func inboxItemFromBroadcast(broadcast Broadcast, readAt int64) InboxItem {
	return InboxItem{
		Id:               broadcast.Id,
		ItemType:         InboxItemTypeBroadcast,
		Title:            broadcast.Title,
		Content:          broadcast.Content,
		AudienceType:     broadcast.AudienceType,
		EmailEnabled:     broadcast.EmailEnabled,
		RecipientCount:   broadcast.RecipientCount,
		EmailSentCount:   broadcast.EmailSentCount,
		EmailFailedCount: broadcast.EmailFailedCount,
		CreatedAt:        broadcast.SentAt,
		ReadAt:           readAt,
	}
}

func sortInboxItems(items []InboxItem) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].CreatedAt == items[j].CreatedAt {
			return items[i].Id > items[j].Id
		}
		return items[i].CreatedAt > items[j].CreatedAt
	})
}

func stringInSlice(value string, values []string) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}
	return false
}

func nonEmptyOrPlaceholder(values []string) []string {
	if len(values) == 0 {
		return []string{"__no_match__"}
	}
	return values
}

func nonEmptyIntOrPlaceholder(values []int) []int {
	if len(values) == 0 {
		return []int{-1}
	}
	return values
}

func dedupeUsers(users []User) []User {
	seen := map[string]struct{}{}
	result := make([]User, 0, len(users))
	for _, user := range users {
		if _, ok := seen[user.Id]; ok {
			continue
		}
		seen[user.Id] = struct{}{}
		result = append(result, user)
	}
	return result
}
