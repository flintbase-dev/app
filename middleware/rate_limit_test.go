package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

func TestSearchRateLimitFallsBackToMemoryWhenRedisClientNil(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalRedisEnabled := common.RedisEnabled
	originalRDB := common.RDB
	originalSearchEnabled := common.SearchRateLimitEnable
	originalSearchLimit := common.SearchRateLimitNum
	originalSearchDuration := common.SearchRateLimitDuration

	common.RedisEnabled = true
	common.RDB = nil
	common.SearchRateLimitEnable = true
	common.SearchRateLimitNum = 10
	common.SearchRateLimitDuration = 60
	inMemoryRateLimiter = common.InMemoryRateLimiter{}

	t.Cleanup(func() {
		common.RedisEnabled = originalRedisEnabled
		common.RDB = originalRDB
		common.SearchRateLimitEnable = originalSearchEnabled
		common.SearchRateLimitNum = originalSearchLimit
		common.SearchRateLimitDuration = originalSearchDuration
		inMemoryRateLimiter = common.InMemoryRateLimiter{}
	})

	router := gin.New()
	router.GET(
		"/",
		func(c *gin.Context) {
			c.Set("id", "usr_RateLimitTest01")
		},
		SearchRateLimit(),
		func(c *gin.Context) {
			c.Status(http.StatusNoContent)
		},
	)

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()

	defer func() {
		if recovered := recover(); recovered != nil {
			t.Fatalf("SearchRateLimit panicked with nil Redis client: %v", recovered)
		}
	}()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, response.Code)
	}
}
