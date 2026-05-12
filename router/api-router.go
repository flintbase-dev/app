package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
)

func SetApiRouter(router *gin.Engine) {
	apiRouter := router.Group("/api")
	apiRouter.Use(middleware.RouteTag("api"))
	apiRouter.Use(gzip.Gzip(
		gzip.DefaultCompression,
		gzip.WithExcludedPaths([]string{"/api/playground/chat/completions"}),
	))
	apiRouter.Use(middleware.BodyStorageCleanup()) // 清理请求体存储
	apiRouter.Use(middleware.GlobalAPIRateLimit())
	apiRouter.POST("/graphql", NewGraphQLAPIHandler())
	apiRouter.POST(
		"/playground/chat/completions",
		middleware.UserAuth(),
		middleware.SetupPlaygroundContext(),
		middleware.SystemPerformanceCheck(),
		middleware.ModelRequestRateLimit(),
		middleware.Distribute(),
		controller.Playground,
	)

	// External protocol callbacks stay as protocol endpoints. They are not
	// browser data API routes and cannot be represented as GraphQL operations.
	apiRouter.GET("/workos/callback", middleware.CriticalRateLimit(), controller.WorkOSCallback)
	apiRouter.POST("/stripe/webhook", controller.StripeWebhook)
}
