package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupWorkOSTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	store := cookie.NewStore([]byte("workos-controller-test-secret"))
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   3600,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	router.Use(sessions.Sessions("session", store))
	return router
}

func TestWorkOSLoginRedirectsToHostedUIAndStoresState(t *testing.T) {
	t.Setenv("WORKOS_API_BASE_URL", "https://api.workos.test")
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "https://app.example.com/api/workos/callback")

	router := setupWorkOSTestRouter()
	router.GET("/api/workos/login", WorkOSLogin)
	router.GET("/debug/session", func(c *gin.Context) {
		session := sessions.Default(c)
		c.JSON(http.StatusOK, gin.H{
			"state":     session.Get(workOSStateSessionKey),
			"return_to": session.Get(workOSReturnToSessionKey),
			"aff":       session.Get(workOSAffCodeSessionKey),
		})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(
		http.MethodGet,
		"/api/workos/login?return_to=/console&aff=aff123&screen_hint=sign-up&prompt=login",
		nil,
	)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusFound, recorder.Code)
	location := recorder.Header().Get("Location")
	parsed, err := url.Parse(location)
	require.NoError(t, err)
	require.Equal(t, "https", parsed.Scheme)
	require.Equal(t, "api.workos.test", parsed.Host)
	require.Equal(t, "/user_management/authorize", parsed.Path)

	query := parsed.Query()
	require.Equal(t, "client_test", query.Get("client_id"))
	require.Equal(t, "https://app.example.com/api/workos/callback", query.Get("redirect_uri"))
	require.Equal(t, "code", query.Get("response_type"))
	require.Equal(t, "authkit", query.Get("provider"))
	require.Equal(t, "sign-up", query.Get("screen_hint"))
	require.Equal(t, "login", query.Get("prompt"))
	require.NotEmpty(t, query.Get("state"))

	sessionRecorder := httptest.NewRecorder()
	sessionRequest := httptest.NewRequest(http.MethodGet, "/debug/session", nil)
	for _, cookie := range recorder.Result().Cookies() {
		sessionRequest.AddCookie(cookie)
	}
	router.ServeHTTP(sessionRecorder, sessionRequest)

	require.Equal(t, http.StatusOK, sessionRecorder.Code)
	var sessionPayload map[string]string
	require.NoError(t, json.Unmarshal(sessionRecorder.Body.Bytes(), &sessionPayload))
	require.Equal(t, query.Get("state"), sessionPayload["state"])
	require.Equal(t, "/console", sessionPayload["return_to"])
	require.Equal(t, "aff123", sessionPayload["aff"])
}

func TestSetupWorkOSLoginSessionStoresSessionIDButNotAccessToken(t *testing.T) {
	router := setupWorkOSTestRouter()
	router.GET("/setup", func(c *gin.Context) {
		session := sessions.Default(c)
		setupWorkOSLoginSession(c, session, &model.User{
			Id:       "usr_WorkOSTest01",
			Username: "workos-user@example.com",
			Role:     10,
			Status:   1,
			Group:    "default",
			WorkOSId: "user_123",
		}, "eyJhbGciOiJub25lIn0.eyJzaWQiOiJzZXNzXzEyMyJ9.")
		require.NoError(t, session.Save())
		c.Status(http.StatusNoContent)
	})
	router.GET("/debug/session", func(c *gin.Context) {
		session := sessions.Default(c)
		c.JSON(http.StatusOK, gin.H{
			"id":                  session.Get("id"),
			"username":            session.Get("username"),
			"workos_id":           session.Get("workos_id"),
			"workos_session_id":   session.Get(workOSSessionIDSessionKey),
			"workos_access_token": session.Get("workos_access_token"),
		})
	})

	setupRecorder := httptest.NewRecorder()
	setupRequest := httptest.NewRequest(http.MethodGet, "/setup", nil)
	router.ServeHTTP(setupRecorder, setupRequest)
	require.Equal(t, http.StatusNoContent, setupRecorder.Code)

	sessionRecorder := httptest.NewRecorder()
	sessionRequest := httptest.NewRequest(http.MethodGet, "/debug/session", nil)
	for _, cookie := range setupRecorder.Result().Cookies() {
		sessionRequest.AddCookie(cookie)
	}
	router.ServeHTTP(sessionRecorder, sessionRequest)

	require.Equal(t, http.StatusOK, sessionRecorder.Code)
	var sessionPayload map[string]any
	require.NoError(t, json.Unmarshal(sessionRecorder.Body.Bytes(), &sessionPayload))
	require.Equal(t, "usr_WorkOSTest01", sessionPayload["id"])
	require.Equal(t, "workos-user@example.com", sessionPayload["username"])
	require.Equal(t, "user_123", sessionPayload["workos_id"])
	require.Equal(t, "sess_123", sessionPayload["workos_session_id"])
	require.Nil(t, sessionPayload["workos_access_token"])
}

func TestWorkOSLogoutRedirectsToWorkOSSessionLogout(t *testing.T) {
	t.Setenv("WORKOS_API_BASE_URL", "https://api.workos.test")
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "https://app.example.com/api/workos/callback")

	router := setupWorkOSTestRouter()
	router.GET("/seed", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Set(workOSSessionIDSessionKey, "sess_123")
		require.NoError(t, session.Save())
		c.Status(http.StatusNoContent)
	})
	router.GET("/api/workos/logout", WorkOSLogout)

	seedRecorder := httptest.NewRecorder()
	seedRequest := httptest.NewRequest(http.MethodGet, "http://app.example.com/seed", nil)
	router.ServeHTTP(seedRecorder, seedRequest)
	require.Equal(t, http.StatusNoContent, seedRecorder.Code)

	logoutRecorder := httptest.NewRecorder()
	logoutRequest := httptest.NewRequest(http.MethodGet, "http://app.example.com/api/workos/logout", nil)
	for _, cookie := range seedRecorder.Result().Cookies() {
		logoutRequest.AddCookie(cookie)
	}
	router.ServeHTTP(logoutRecorder, logoutRequest)

	require.Equal(t, http.StatusFound, logoutRecorder.Code)
	location := logoutRecorder.Header().Get("Location")
	parsed, err := url.Parse(location)
	require.NoError(t, err)
	require.Equal(t, "https", parsed.Scheme)
	require.Equal(t, "api.workos.test", parsed.Host)
	require.Equal(t, "/user_management/sessions/logout", parsed.Path)
	require.Equal(t, "sess_123", parsed.Query().Get("session_id"))
	require.Equal(t, "http://app.example.com/login", parsed.Query().Get("return_to"))
}
