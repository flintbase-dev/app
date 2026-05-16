package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRelayRouterRegistersModelsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetRelayRouter(router)

	routes := map[string]bool{}
	for _, route := range router.Routes() {
		routes[route.Method+" "+route.Path] = true
	}

	require.True(t, routes["GET /v1/models"])
	require.True(t, routes["GET /v1/models/:model"])
}

func TestRelayModelsEndpointUsesTokenAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	SetRelayRouter(router)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/v1/models", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusUnauthorized, recorder.Code)
	require.NotEqual(t, http.StatusNotFound, recorder.Code)
}
