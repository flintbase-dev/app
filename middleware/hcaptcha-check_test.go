package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestHCaptchaCheckRequiresToken(t *testing.T) {
	router := newHCaptchaTestRouter()
	restore := setHCaptchaTestConfig(true, "")
	defer restore()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), "hCaptcha token 为空")
}

func TestHCaptchaCheckVerifiesToken(t *testing.T) {
	var form url.Values
	verifyServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodPost, r.Method)
		require.NoError(t, r.ParseForm())
		form = r.PostForm
		require.NoError(t, json.NewEncoder(w).Encode(gin.H{"success": true}))
	}))
	defer verifyServer.Close()

	router := newHCaptchaTestRouter()
	restore := setHCaptchaTestConfig(true, verifyServer.URL)
	defer restore()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/protected?hcaptcha=test-token", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), "ok")
	require.Equal(t, "test-secret", form.Get("secret"))
	require.Equal(t, "test-token", form.Get("response"))
	require.Equal(t, "test-site-key", form.Get("sitekey"))
	require.NotEmpty(t, form.Get("remoteip"))
}

func newHCaptchaTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-secret"))))
	router.GET("/protected", HCaptchaCheck(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "ok"})
	})
	return router
}

func setHCaptchaTestConfig(enabled bool, verifyURL string) func() {
	previousEnabled := common.HCaptchaCheckEnabled
	previousSiteKey := common.HCaptchaSiteKey
	previousSecretKey := common.HCaptchaSecretKey
	previousVerifyURL := hCaptchaSiteVerifyURL

	common.HCaptchaCheckEnabled = enabled
	common.HCaptchaSiteKey = "test-site-key"
	common.HCaptchaSecretKey = "test-secret"
	if verifyURL != "" {
		hCaptchaSiteVerifyURL = verifyURL
	}

	return func() {
		common.HCaptchaCheckEnabled = previousEnabled
		common.HCaptchaSiteKey = previousSiteKey
		common.HCaptchaSecretKey = previousSecretKey
		hCaptchaSiteVerifyURL = previousVerifyURL
	}
}
