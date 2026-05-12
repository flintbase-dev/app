package router

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func newGraphQLAPITestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("graphql-api-test-secret"))))
	SetApiRouter(router)
	return router
}

func executeGraphQLAPITestRequest(t *testing.T, router http.Handler, payload map[string]interface{}) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	request := httptest.NewRequest(http.MethodPost, "/api/graphql", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	return recorder
}

func TestGraphQLAPIStatusQuery(t *testing.T) {
	router := newGraphQLAPITestRouter()
	recorder := executeGraphQLAPITestRequest(t, router, map[string]interface{}{
		"query": "query { status }",
	})

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload map[string]interface{}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.NotContains(t, payload, "errors")

	data := payload["data"].(map[string]interface{})
	status := data["status"].(map[string]interface{})
	require.Equal(t, true, status["success"])
	require.Contains(t, status, "data")
}

func TestGraphQLAPIRejectsOldRestRoute(t *testing.T) {
	router := newGraphQLAPITestRouter()
	request := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusNotFound, recorder.Code)
}

func TestAPIRouterRegistersCookieAuthenticatedPlaygroundEndpoint(t *testing.T) {
	router := newGraphQLAPITestRouter()
	request := httptest.NewRequest(http.MethodPost, "/api/playground/chat/completions", bytes.NewBufferString(`{"model":"gpt-4o","messages":[]}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusUnauthorized, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":false`)
	require.NotContains(t, recorder.Body.String(), "token invalid")
}

func TestGraphQLAPIRejectsUnknownOperation(t *testing.T) {
	router := newGraphQLAPITestRouter()
	recorder := executeGraphQLAPITestRequest(t, router, map[string]interface{}{
		"query": "query { oldRestStatus }",
	})

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload map[string]interface{}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.NotEmpty(t, payload["errors"])
}

func TestGraphQLAPIRequiresResourceID(t *testing.T) {
	router := newGraphQLAPITestRouter()
	recorder := executeGraphQLAPITestRequest(t, router, map[string]interface{}{
		"query": "mutation { deleteChannel }",
	})

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload map[string]interface{}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.NotEmpty(t, payload["errors"])
}

func TestGraphQLAPIRejectsPathArgument(t *testing.T) {
	router := newGraphQLAPITestRouter()
	recorder := executeGraphQLAPITestRequest(t, router, map[string]interface{}{
		"query": `mutation DeleteChannel($path: JSON) { deleteChannel(path: $path) }`,
		"variables": map[string]interface{}{
			"path": map[string]interface{}{"id": 1},
		},
	})

	require.Equal(t, http.StatusOK, recorder.Code)
	var payload map[string]interface{}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.NotEmpty(t, payload["errors"])
}

func TestGraphQLAPIRouterHasNoInternalRESTRoutes(t *testing.T) {
	source, err := os.ReadFile("api-router.go")
	require.NoError(t, err)

	require.NotContains(t, string(source), "registerGraphQLResolverRoutes")
	require.NotContains(t, string(source), `apiRouter.GET("/status"`)
	require.NotContains(t, string(source), `apiRouter.Group("/user"`)
	require.NotContains(t, string(source), `apiRouter.Group("/channel"`)
}

func TestGraphQLAPIRegistryHasNoRESTTransportManifest(t *testing.T) {
	source, err := os.ReadFile("graphql_api.go")
	require.NoError(t, err)

	require.NotContains(t, string(source), "newInternalGraphQLAPIRouter")
	require.NotContains(t, string(source), "registerGraphQLResolverRoutes")
	require.NotContains(t, string(source), "httptest")
	require.NotContains(t, string(source), "Method:")
	require.NotContains(t, string(source), "Path:")
	require.NotContains(t, string(source), "/api/user")
	require.NotContains(t, string(source), "/api/channel")
}
