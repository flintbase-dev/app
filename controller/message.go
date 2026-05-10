package controller

import (
	"encoding/json"
	"fmt"
	"html"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type markInboxReadRequest struct {
	ItemType string `json:"item_type"`
	Id       string `json:"id"`
}

type createBroadcastRequest struct {
	Title        string                  `json:"title"`
	Content      string                  `json:"content"`
	AudienceType string                  `json:"audience_type"`
	Audience     model.BroadcastAudience `json:"audience"`
	EmailEnabled bool                    `json:"email_enabled"`
}

func GetInbox(c *gin.Context) {
	user, err := model.GetUserById(c.GetString("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo := common.GetPageQuery(c)
	items, total, err := model.ListInboxItems(user, pageInfo, c.Query("type"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(total)
	pageInfo.SetItems(items)
	common.ApiSuccess(c, pageInfo)
}

func GetInboxUnreadCount(c *gin.Context) {
	user, err := model.GetUserById(c.GetString("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	count, err := model.CountUnreadInboxItems(user)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"count": count})
}

func MarkInboxItemRead(c *gin.Context) {
	var req markInboxReadRequest
	if err := json.NewDecoder(c.Request.Body).Decode(&req); err != nil {
		common.ApiErrorMsg(c, "无效的参数")
		return
	}
	user, err := model.GetUserById(c.GetString("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.MarkInboxItemRead(user, req.ItemType, req.Id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func MarkAllInboxRead(c *gin.Context) {
	user, err := model.GetUserById(c.GetString("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.MarkAllInboxRead(user); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func GetPublicBroadcasts(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	broadcasts, total, err := model.ListPublicBroadcasts(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(broadcasts)
	common.ApiSuccess(c, pageInfo)
}

func AdminListBroadcasts(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	broadcasts, total, err := model.ListAdminBroadcasts(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(broadcasts)
	common.ApiSuccess(c, pageInfo)
}

func AdminCreateBroadcast(c *gin.Context) {
	var req createBroadcastRequest
	if err := json.NewDecoder(c.Request.Body).Decode(&req); err != nil {
		common.ApiErrorMsg(c, "无效的参数")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	req.AudienceType = model.NormalizeBroadcastAudienceType(req.AudienceType)
	if req.Title == "" || req.Content == "" {
		common.ApiErrorMsg(c, "标题和内容不能为空")
		return
	}
	if req.AudienceType == model.BroadcastAudienceSelected &&
		len(req.Audience.UserIds) == 0 &&
		len(req.Audience.Groups) == 0 &&
		len(req.Audience.Roles) == 0 {
		common.ApiErrorMsg(c, "请选择至少一个用户、分组或用户等级")
		return
	}

	audiencePayload := model.MarshalBroadcastAudience(req.Audience)
	broadcast := model.Broadcast{
		Title:        req.Title,
		Content:      req.Content,
		AudienceType: req.AudienceType,
		Audience:     audiencePayload,
		EmailEnabled: req.EmailEnabled,
		Status:       model.BroadcastStatusSent,
		CreatedBy:    c.GetString("id"),
	}
	if err := model.CreateBroadcast(&broadcast); err != nil {
		common.ApiError(c, err)
		return
	}

	recipients, err := model.ResolveBroadcastRecipients(req.AudienceType, req.Audience)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	emailSentCount := 0
	emailFailedCount := 0
	if req.EmailEnabled {
		for _, user := range recipients {
			if strings.TrimSpace(user.Email) == "" {
				emailFailedCount++
				continue
			}
			if err := common.SendEmail(req.Title, user.Email, broadcastEmailBody(req.Content)); err != nil {
				common.SysLog(fmt.Sprintf("failed to send broadcast %s email to user %s: %s", broadcast.Id, user.Id, err.Error()))
				emailFailedCount++
				continue
			}
			emailSentCount++
		}
	}

	if err := model.UpdateBroadcastDeliveryCounts(broadcast.Id, len(recipients), emailSentCount, emailFailedCount); err != nil {
		common.ApiError(c, err)
		return
	}
	broadcast.RecipientCount = len(recipients)
	broadcast.EmailSentCount = emailSentCount
	broadcast.EmailFailedCount = emailFailedCount

	model.RecordAuditEventWithContext(c, model.LogEventParams{
		Event:        "admin.broadcast.send",
		Content:      "broadcast sent",
		ResourceType: "broadcast",
		ResourceId:   broadcast.Id,
		Other: map[string]interface{}{
			"audience_type":      broadcast.AudienceType,
			"email_enabled":      broadcast.EmailEnabled,
			"recipient_count":    broadcast.RecipientCount,
			"email_sent_count":   broadcast.EmailSentCount,
			"email_failed_count": broadcast.EmailFailedCount,
		},
	})

	common.ApiSuccess(c, broadcast)
}

func AdminDeleteBroadcast(c *gin.Context) {
	id := c.Param("id")
	if err := model.DeleteBroadcast(id); err != nil {
		common.ApiError(c, err)
		return
	}
	model.RecordAuditEventWithContext(c, model.LogEventParams{
		Event:        "admin.broadcast.delete",
		Content:      "broadcast deleted",
		ResourceType: "broadcast",
		ResourceId:   id,
	})
	common.ApiSuccess(c, nil)
}

func broadcastEmailBody(content string) string {
	escaped := html.EscapeString(content)
	escaped = strings.ReplaceAll(escaped, "\r\n", "\n")
	escaped = strings.ReplaceAll(escaped, "\n", "<br>")
	return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7;">` + escaped + `</div>`
}
