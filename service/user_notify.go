package service

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
)

func NotifyRootUser(t string, subject string, content string) {
	user := model.GetRootUser().ToBaseUser()
	err := NotifyUser(user.Id, user.Email, dto.NewNotify(t, subject, content, nil))
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to notify root user: %s", err.Error()))
	}
}

func NotifyUpstreamModelUpdateWatchers(subject string, content string) {
	var users []model.User
	if err := model.DB.
		Select("id", "email", "role", "status", "setting").
		Where("status = ? AND role >= ?", common.UserStatusEnabled, common.RoleAdminUser).
		Find(&users).Error; err != nil {
		common.SysLog(fmt.Sprintf("failed to query upstream update notification users: %s", err.Error()))
		return
	}

	notification := dto.NewNotify(dto.NotifyTypeChannelUpdate, subject, content, nil)
	sentCount := 0
	for _, user := range users {
		userSetting := user.GetSetting()
		if !userSetting.UpstreamModelUpdateNotifyEnabled {
			continue
		}
		if err := NotifyUser(user.Id, user.Email, notification); err != nil {
			common.SysLog(fmt.Sprintf("failed to notify user %s for upstream model update: %s", user.Id, err.Error()))
			continue
		}
		sentCount++
	}
	common.SysLog(fmt.Sprintf("upstream model update notifications sent: %d", sentCount))
}

func NotifyUser(userId string, userEmail string, data dto.Notify) error {
	// Check notification limit
	canSend, err := CheckNotificationLimit(userId, data.Type)
	if err != nil {
		common.SysLog(fmt.Sprintf("failed to check notification limit: %s", err.Error()))
		return err
	}
	if !canSend {
		return fmt.Errorf("notification limit exceeded for user %s with type %s", userId, data.Type)
	}

	renderedContent := renderNotifyContent(data)
	emailToUse := strings.TrimSpace(userEmail)
	messageID := ""
	if !data.Sensitive {
		message := &model.UserMessage{
			UserId:           userId,
			Title:            data.Title,
			Content:          renderedContent,
			NotificationType: data.Type,
			SourceType:       "notification",
			DeliveryChannel:  dto.NotifyTypeEmail,
			DeliveryStatus:   model.UserMessageDeliveryPending,
			EmailTo:          emailToUse,
		}
		if err := model.CreateUserMessage(message); err != nil {
			common.SysLog(fmt.Sprintf("failed to create message for user %s: %s", userId, err.Error()))
		} else {
			messageID = message.Id
		}
	}

	var notifyErr error
	deliveryStatus := model.UserMessageDeliverySent
	if emailToUse == "" {
		common.SysLog(fmt.Sprintf("user %s has no account email, skip sending email notification", userId))
		deliveryStatus = model.UserMessageDeliverySkipped
	} else {
		notifyErr = common.SendEmail(data.Title, emailToUse, renderedContent)
	}

	if notifyErr != nil {
		deliveryStatus = model.UserMessageDeliveryFailed
	}
	if messageID != "" {
		if err := model.UpdateUserMessageDeliveryStatus(messageID, deliveryStatus); err != nil {
			common.SysLog(fmt.Sprintf("failed to update message %s delivery status: %s", messageID, err.Error()))
		}
	}
	return notifyErr
}

func renderNotifyContent(data dto.Notify) string {
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}
	return content
}
