package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func SetupPlaygroundContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetBool("use_access_token") {
			abortWithOpenAiMessage(c, http.StatusForbidden, "暂不支持使用 access token", types.ErrorCodeAccessDenied)
			return
		}

		var req dto.PlayGroundRequest
		if err := common.UnmarshalBodyReusable(c, &req); err != nil {
			abortWithOpenAiMessage(c, http.StatusBadRequest, i18n.T(c, i18n.MsgDistributorInvalidPlayground, map[string]any{"Error": err.Error()}))
			return
		}

		userId := c.GetString("id")
		if common.IsEmptyID(userId) {
			abortWithOpenAiMessage(c, http.StatusUnauthorized, common.TranslateMessage(c, i18n.MsgAuthNotLoggedIn))
			return
		}

		userCache, err := model.GetUserCache(userId)
		if err != nil {
			common.SysLog(fmt.Sprintf("SetupPlaygroundContext GetUserCache error for user %s: %v", userId, err))
			abortWithOpenAiMessage(c, http.StatusInternalServerError, common.TranslateMessage(c, i18n.MsgDatabaseError))
			return
		}
		if userCache.Status != common.UserStatusEnabled {
			abortWithOpenAiMessage(c, http.StatusForbidden, common.TranslateMessage(c, i18n.MsgAuthUserBanned))
			return
		}
		userCache.WriteContext(c)

		userGroup := userCache.Group
		usingGroup := strings.TrimSpace(req.Group)
		if usingGroup == "" {
			usingGroup = userGroup
		}
		if !service.GroupInUserUsableGroups(userGroup, usingGroup) {
			abortWithOpenAiMessage(c, http.StatusForbidden, fmt.Sprintf("无权访问 %s 分组", usingGroup), types.ErrorCodeAccessDenied)
			return
		}

		common.SetContextKey(c, constant.ContextKeyPlayground, true)
		common.SetContextKey(c, constant.ContextKeyUsingGroup, usingGroup)
		common.SetContextKey(c, constant.ContextKeyTokenGroup, usingGroup)
		c.Set("relay_mode", relayconstant.RelayModeChatCompletions)
		if c.Request != nil && c.Request.URL != nil {
			c.Request.URL.Path = "/v1/chat/completions"
		}

		_ = SetupContextForToken(c, &model.Token{
			UserId: userId,
			Name:   fmt.Sprintf("playground-%s", usingGroup),
			Group:  usingGroup,
		})

		c.Next()
	}
}
