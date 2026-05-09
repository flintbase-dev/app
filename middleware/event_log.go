package middleware

import (
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func AuditMutation(resourceType string) gin.HandlerFunc {
	return mutationEventLog(model.LogCategoryAudit, "api.audit.mutation", resourceType)
}

func ActivityMutation(resourceType string) gin.HandlerFunc {
	return mutationEventLog(model.LogCategoryActivity, "api.activity.mutation", resourceType)
}

func mutationEventLog(category model.LogCategory, event string, resourceType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if !isMutationMethod(c.Request.Method) || c.Writer.Status() >= http.StatusBadRequest {
			return
		}

		resourceId := c.Param("id")
		if resourceId == "" {
			resourceId = c.Param("token_id")
		}
		fullPath := c.FullPath()
		if fullPath == "" {
			fullPath = c.Request.URL.Path
		}

		params := model.LogEventParams{
			UserId:       c.GetInt("id"),
			ActorUserId:  c.GetInt("id"),
			Event:        event,
			Content:      fmt.Sprintf("%s %s", c.Request.Method, fullPath),
			ResourceType: resourceType,
			ResourceId:   resourceId,
			Result:       "http_completed",
			RequestId:    c.GetString(common.RequestIdKey),
			Ip:           c.ClientIP(),
			Other: map[string]interface{}{
				"method": c.Request.Method,
				"path":   fullPath,
				"status": c.Writer.Status(),
			},
		}

		switch category {
		case model.LogCategoryActivity:
			model.RecordActivityEvent(params)
		default:
			model.RecordAuditEvent(params)
		}
	}
}

func isMutationMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}
