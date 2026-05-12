package middleware

import (
	"encoding/json"
	"net/http"
	"net/url"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

var hCaptchaSiteVerifyURL = "https://api.hcaptcha.com/siteverify"

type hCaptchaCheckResponse struct {
	Success bool `json:"success"`
}

func HCaptchaCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		if common.HCaptchaCheckEnabled {
			session := sessions.Default(c)
			hCaptchaChecked := session.Get("hcaptcha")
			if hCaptchaChecked != nil {
				c.Next()
				return
			}
			response := c.Query("hcaptcha")
			if response == "" {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "hCaptcha token 为空",
				})
				c.Abort()
				return
			}
			rawRes, err := http.PostForm(hCaptchaSiteVerifyURL, url.Values{
				"secret":   {common.HCaptchaSecretKey},
				"response": {response},
				"remoteip": {c.ClientIP()},
				"sitekey":  {common.HCaptchaSiteKey},
			})
			if err != nil {
				common.SysLog(err.Error())
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				c.Abort()
				return
			}
			defer rawRes.Body.Close()
			var res hCaptchaCheckResponse
			err = json.NewDecoder(rawRes.Body).Decode(&res)
			if err != nil {
				common.SysLog(err.Error())
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				c.Abort()
				return
			}
			if !res.Success {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": "hCaptcha 校验失败，请刷新重试！",
				})
				c.Abort()
				return
			}
			session.Set("hcaptcha", true)
			err = session.Save()
			if err != nil {
				c.JSON(http.StatusOK, gin.H{
					"message": "无法保存会话信息，请重试",
					"success": false,
				})
				return
			}
		}
		c.Next()
	}
}
