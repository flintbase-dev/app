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
	apiRouter.Use(gzip.Gzip(gzip.DefaultCompression))
	apiRouter.Use(middleware.BodyStorageCleanup()) // 清理请求体存储
	apiRouter.Use(middleware.GlobalAPIRateLimit())
	apiRouter.POST("/graphql", NewGraphQLAPIHandler())

	// External protocol callbacks stay as protocol endpoints. They are not
	// browser data API routes and cannot be represented as GraphQL operations.
	apiRouter.GET("/workos/callback", middleware.CriticalRateLimit(), controller.WorkOSCallback)
	apiRouter.POST("/stripe/webhook", controller.StripeWebhook)
}
