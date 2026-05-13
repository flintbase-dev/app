package router

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/graphql-go/graphql"
	"github.com/graphql-go/graphql/language/ast"
)

type apiOperationKind string

const (
	apiOperationQuery    apiOperationKind = "query"
	apiOperationMutation apiOperationKind = "mutation"
)

type apiOperation struct {
	Name           string
	Kind           apiOperationKind
	Handler        gin.HandlerFunc
	Middlewares    []gin.HandlerFunc
	ResourceParams []string
}

type apiOperationOption func(*apiOperation)

type graphqlGinContextKey struct{}
type graphqlSessionContextKey struct{}
type graphqlOperationPayloadKey struct{}

type graphqlOperationPayload struct {
	input  map[string]interface{}
	params map[string]interface{}
}

var (
	graphqlAPISchemaOnce       sync.Once
	graphqlAPISchema           graphql.Schema
	graphqlAPISchemaErr        error
	graphqlOperationEngine     *gin.Engine
	graphqlOperationEngineErr  error
	graphqlOperationEngineOnce sync.Once
)

var graphqlJSONScalar = graphql.NewScalar(graphql.ScalarConfig{
	Name:        "JSON",
	Description: "Arbitrary JSON value used by the dashboard GraphQL API.",
	Serialize:   func(value interface{}) interface{} { return value },
	ParseValue:  func(value interface{}) interface{} { return value },
	ParseLiteral: func(valueAST ast.Value) interface{} {
		return parseGraphQLJSONLiteral(valueAST)
	},
})

func NewGraphQLAPIHandler() gin.HandlerFunc {
	schema, err := getGraphQLAPISchema()
	return func(c *gin.Context) {
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"errors": []gin.H{{"message": err.Error()}},
			})
			return
		}

		var request struct {
			Query         string                 `json:"query"`
			OperationName string                 `json:"operationName"`
			Variables     map[string]interface{} `json:"variables"`
		}
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"errors": []gin.H{{"message": "invalid GraphQL request: " + err.Error()}},
			})
			return
		}
		if strings.TrimSpace(request.Query) == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"errors": []gin.H{{"message": "GraphQL query is required"}},
			})
			return
		}

		ctx := context.WithValue(c.Request.Context(), graphqlGinContextKey{}, c)
		result := graphql.Do(graphql.Params{
			Schema:         schema,
			RequestString:  request.Query,
			OperationName:  request.OperationName,
			VariableValues: request.Variables,
			Context:        ctx,
		})
		c.JSON(http.StatusOK, result)
	}
}

func getGraphQLAPISchema() (graphql.Schema, error) {
	graphqlAPISchemaOnce.Do(func() {
		queryFields := graphql.Fields{}
		mutationFields := graphql.Fields{}
		for _, operation := range graphqlAPIOperations {
			op := operation
			field := &graphql.Field{
				Type: graphqlJSONScalar,
				Args: graphql.FieldConfigArgument{
					"input":  &graphql.ArgumentConfig{Type: graphqlJSONScalar},
					"params": &graphql.ArgumentConfig{Type: graphqlJSONScalar},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					outer, ok := p.Context.Value(graphqlGinContextKey{}).(*gin.Context)
					if !ok || outer == nil {
						return nil, fmt.Errorf("missing GraphQL request context")
					}
					return executeGraphQLAPIOperation(outer, op, p.Args)
				},
			}
			switch op.Kind {
			case apiOperationQuery:
				queryFields[op.Name] = field
			case apiOperationMutation:
				mutationFields[op.Name] = field
			default:
				graphqlAPISchemaErr = fmt.Errorf("unknown GraphQL API operation kind %q for %s", op.Kind, op.Name)
				return
			}
		}

		schemaConfig := graphql.SchemaConfig{
			Query: graphql.NewObject(graphql.ObjectConfig{
				Name:   "Query",
				Fields: queryFields,
			}),
			Mutation: graphql.NewObject(graphql.ObjectConfig{
				Name:   "Mutation",
				Fields: mutationFields,
			}),
		}
		graphqlAPISchema, graphqlAPISchemaErr = graphql.NewSchema(schemaConfig)
	})
	return graphqlAPISchema, graphqlAPISchemaErr
}

func getGraphQLOperationEngine() (*gin.Engine, error) {
	graphqlOperationEngineOnce.Do(func() {
		engine := gin.New()
		engine.Use(gin.Recovery())
		engine.Use(middleware.RouteTag("api"))
		engine.Use(func(c *gin.Context) {
			if sessionValue := c.Request.Context().Value(graphqlSessionContextKey{}); sessionValue != nil {
				c.Set(sessions.DefaultKey, sessionValue)
			}
			c.Next()
		})
		engine.Use(middleware.BodyStorageCleanup())

		seen := map[string]struct{}{}
		for _, operation := range graphqlAPIOperations {
			op := operation
			if _, ok := seen[op.Name]; ok {
				graphqlOperationEngineErr = fmt.Errorf("duplicate GraphQL API operation %s", op.Name)
				return
			}
			seen[op.Name] = struct{}{}
			if op.Handler == nil {
				graphqlOperationEngineErr = fmt.Errorf("GraphQL API operation %s has no handler", op.Name)
				return
			}
			handlers := []gin.HandlerFunc{graphQLOperationPrepare(op)}
			handlers = append(handlers, op.Middlewares...)
			handlers = append(handlers, graphQLOperationResolver(op))
			engine.Handle(graphQLOperationHTTPMethod(op.Kind), "/"+op.Name, handlers...)
		}

		graphqlOperationEngine = engine
	})
	return graphqlOperationEngine, graphqlOperationEngineErr
}

func graphQLOperationPrepare(operation apiOperation) gin.HandlerFunc {
	return func(c *gin.Context) {
		payload, ok := c.Request.Context().Value(graphqlOperationPayloadKey{}).(graphqlOperationPayload)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "missing GraphQL operation payload",
			})
			c.Abort()
			return
		}
		applyGraphQLOperationResourceParams(c, operation, payload)
	}
}

func graphQLOperationResolver(operation apiOperation) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Request.Context().Value(graphqlOperationPayloadKey{}).(graphqlOperationPayload); !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "missing GraphQL operation payload",
			})
			return
		}
		operation.Handler(c)
	}
}

func graphQLOperationHTTPMethod(kind apiOperationKind) string {
	if kind == apiOperationQuery {
		return http.MethodGet
	}
	return http.MethodPost
}

func executeGraphQLAPIOperation(outer *gin.Context, operation apiOperation, args map[string]interface{}) (interface{}, error) {
	payload, err := parseGraphQLOperationPayload(args)
	if err != nil {
		return nil, err
	}
	if err := validateGraphQLOperationResourceParams(operation, payload); err != nil {
		return nil, err
	}

	engine, err := getGraphQLOperationEngine()
	if err != nil {
		return nil, err
	}

	target := "/" + operation.Name
	if query := graphQLOperationQuery(payload.params); query != "" {
		target += "?" + query
	}

	body, err := graphQLOperationBody(payload.input)
	if err != nil {
		return nil, err
	}

	ctx := context.WithValue(outer.Request.Context(), graphqlOperationPayloadKey{}, payload)
	if sessionValue, ok := outer.Get(sessions.DefaultKey); ok {
		ctx = context.WithValue(ctx, graphqlSessionContextKey{}, sessionValue)
	}
	req, err := http.NewRequestWithContext(ctx, graphQLOperationHTTPMethod(operation.Kind), target, body)
	if err != nil {
		return nil, err
	}
	req.RemoteAddr = outer.Request.RemoteAddr
	req.Host = outer.Request.Host
	copyRequestHeaders(req.Header, outer.Request.Header)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	recorder := newGraphQLOperationResponse()
	engine.ServeHTTP(recorder, req)
	copyGraphQLResponseHeaders(outer, recorder)

	statusCode := recorder.StatusCode()
	responseBody := recorder.Body()
	if statusCode >= http.StatusMultipleChoices && statusCode < http.StatusBadRequest {
		return gin.H{
			"success": true,
			"message": "",
			"data": gin.H{
				"location": recorder.Header().Get("Location"),
				"status":   statusCode,
			},
		}, nil
	}
	if len(bytes.TrimSpace(responseBody)) == 0 {
		return gin.H{
			"success": statusCode >= http.StatusOK && statusCode < http.StatusMultipleChoices,
			"message": http.StatusText(statusCode),
		}, nil
	}

	var payloadResponse interface{}
	if err := json.Unmarshal(responseBody, &payloadResponse); err != nil {
		return nil, fmt.Errorf("GraphQL API operation %s returned non-JSON response: %w", operation.Name, err)
	}
	return payloadResponse, nil
}

func parseGraphQLOperationPayload(args map[string]interface{}) (graphqlOperationPayload, error) {
	input, err := jsonObjectArg(args, "input")
	if err != nil {
		return graphqlOperationPayload{}, err
	}
	params, err := jsonObjectArg(args, "params")
	if err != nil {
		return graphqlOperationPayload{}, err
	}
	return graphqlOperationPayload{
		input:  input,
		params: params,
	}, nil
}

func validateGraphQLOperationResourceParams(operation apiOperation, payload graphqlOperationPayload) error {
	for _, name := range operation.ResourceParams {
		if _, ok := graphQLOperationResourceParamValue(payload, name); !ok {
			return fmt.Errorf("missing required GraphQL API argument %q for operation %s", name, operation.Name)
		}
	}
	return nil
}

func applyGraphQLOperationResourceParams(c *gin.Context, operation apiOperation, payload graphqlOperationPayload) {
	for _, name := range operation.ResourceParams {
		value, ok := graphQLOperationResourceParamValue(payload, name)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": fmt.Sprintf("missing required GraphQL API argument %q", name),
			})
			c.Abort()
			return
		}
		c.Params = append(c.Params, gin.Param{
			Key:   name,
			Value: formatGraphQLValue(value),
		})
	}
}

func graphQLOperationResourceParamValue(payload graphqlOperationPayload, name string) (interface{}, bool) {
	if value, ok := payload.input[name]; ok && value != nil {
		return value, true
	}
	if value, ok := payload.params[name]; ok && value != nil {
		return value, true
	}
	return nil, false
}

type graphqlOperationResponse struct {
	header http.Header
	status int
	body   bytes.Buffer
}

func newGraphQLOperationResponse() *graphqlOperationResponse {
	return &graphqlOperationResponse{
		header: http.Header{},
	}
}

func (r *graphqlOperationResponse) Header() http.Header {
	return r.header
}

func (r *graphqlOperationResponse) Write(data []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.body.Write(data)
}

func (r *graphqlOperationResponse) WriteHeader(statusCode int) {
	if r.status == 0 {
		r.status = statusCode
	}
}

func (r *graphqlOperationResponse) StatusCode() int {
	if r.status == 0 {
		return http.StatusOK
	}
	return r.status
}

func (r *graphqlOperationResponse) Body() []byte {
	return r.body.Bytes()
}

func copyRequestHeaders(dst http.Header, src http.Header) {
	for key, values := range src {
		if strings.EqualFold(key, "Accept-Encoding") || strings.EqualFold(key, "Content-Length") {
			continue
		}
		for _, value := range values {
			dst.Add(key, value)
		}
	}
}

func copyGraphQLResponseHeaders(outer *gin.Context, recorder *graphqlOperationResponse) {
	for _, headerName := range []string{"Set-Cookie", "Auth-Version", "Cache-Control", "Pragma", "Expires"} {
		for _, value := range recorder.Header().Values(headerName) {
			outer.Writer.Header().Add(headerName, value)
		}
	}
}

func graphQLOperationQuery(params map[string]interface{}) string {
	values := url.Values{}
	for key, value := range params {
		appendGraphQLQueryValue(values, key, value)
	}
	return values.Encode()
}

func appendGraphQLQueryValue(values url.Values, key string, value interface{}) {
	switch typed := value.(type) {
	case nil:
		return
	case []interface{}:
		for _, item := range typed {
			appendGraphQLQueryValue(values, key, item)
		}
	case []string:
		for _, item := range typed {
			values.Add(key, item)
		}
	default:
		values.Add(key, formatGraphQLValue(typed))
	}
}

func graphQLOperationBody(input map[string]interface{}) (io.Reader, error) {
	if len(input) == 0 {
		return nil, nil
	}
	body, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(body), nil
}

func jsonObjectArg(args map[string]interface{}, name string) (map[string]interface{}, error) {
	value, ok := args[name]
	if !ok || value == nil {
		return map[string]interface{}{}, nil
	}
	if object, ok := value.(map[string]interface{}); ok {
		return object, nil
	}
	return nil, fmt.Errorf("GraphQL API argument %q must be a JSON object", name)
}

func formatGraphQLValue(value interface{}) string {
	switch typed := value.(type) {
	case string:
		return typed
	case bool:
		return strconv.FormatBool(typed)
	case int:
		return strconv.Itoa(typed)
	case int64:
		return strconv.FormatInt(typed, 10)
	case float64:
		if math.Trunc(typed) == typed {
			return strconv.FormatInt(int64(typed), 10)
		}
		return strconv.FormatFloat(typed, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(typed), 'f', -1, 32)
	default:
		return fmt.Sprint(typed)
	}
}

func parseGraphQLJSONLiteral(valueAST ast.Value) interface{} {
	switch value := valueAST.(type) {
	case *ast.StringValue:
		return value.Value
	case *ast.BooleanValue:
		return value.Value
	case *ast.IntValue:
		parsed, _ := strconv.ParseInt(value.Value, 10, 64)
		return parsed
	case *ast.FloatValue:
		parsed, _ := strconv.ParseFloat(value.Value, 64)
		return parsed
	case *ast.ListValue:
		items := make([]interface{}, 0, len(value.Values))
		for _, item := range value.Values {
			items = append(items, parseGraphQLJSONLiteral(item))
		}
		return items
	case *ast.ObjectValue:
		object := map[string]interface{}{}
		for _, field := range value.Fields {
			object[field.Name.Value] = parseGraphQLJSONLiteral(field.Value)
		}
		return object
	default:
		return nil
	}
}

func apiQuery(name string, handler gin.HandlerFunc, opts ...apiOperationOption) apiOperation {
	return newAPIOperation(apiOperationQuery, name, handler, opts...)
}

func apiMutation(name string, handler gin.HandlerFunc, opts ...apiOperationOption) apiOperation {
	return newAPIOperation(apiOperationMutation, name, handler, opts...)
}

func newAPIOperation(kind apiOperationKind, name string, handler gin.HandlerFunc, opts ...apiOperationOption) apiOperation {
	operation := apiOperation{
		Name:    name,
		Kind:    kind,
		Handler: handler,
	}
	for _, opt := range opts {
		opt(&operation)
	}
	return operation
}

func withMiddlewares(handlers ...gin.HandlerFunc) apiOperationOption {
	return func(operation *apiOperation) {
		operation.Middlewares = append(operation.Middlewares, handlers...)
	}
}

func withResourceParams(names ...string) apiOperationOption {
	return func(operation *apiOperation) {
		operation.ResourceParams = append(operation.ResourceParams, names...)
	}
}

func tryUserAuth() apiOperationOption {
	return withMiddlewares(middleware.TryUserAuth())
}

func userAuth() apiOperationOption {
	return withMiddlewares(middleware.UserAuth())
}

func adminAuth() apiOperationOption {
	return withMiddlewares(middleware.AdminAuth())
}

func rootAuth() apiOperationOption {
	return withMiddlewares(middleware.RootAuth())
}

func teamMemberAuth() apiOperationOption {
	return withMiddlewares(middleware.TeamMemberAuth())
}

func teamAdminAuth() apiOperationOption {
	return withMiddlewares(middleware.TeamAdminAuth())
}

func accountContextAuth() apiOperationOption {
	return userAuth()
}

func userActivity(resourceType string) apiOperationOption {
	return withMiddlewares(middleware.UserAuth(), middleware.ActivityMutation(resourceType))
}

func adminAudit(resourceType string) apiOperationOption {
	return withMiddlewares(middleware.AdminAuth(), middleware.AuditMutation(resourceType))
}

func rootAudit(resourceType string) apiOperationOption {
	return withMiddlewares(middleware.RootAuth(), middleware.AuditMutation(resourceType))
}

func logAuditWithAuth(auth gin.HandlerFunc) apiOperationOption {
	return withMiddlewares(middleware.AuditMutation("log"), auth)
}

func criticalRateLimit() apiOperationOption {
	return withMiddlewares(middleware.CriticalRateLimit())
}

func searchRateLimit() apiOperationOption {
	return withMiddlewares(middleware.SearchRateLimit())
}

func disableCache() apiOperationOption {
	return withMiddlewares(middleware.DisableCache())
}

func hcaptchaCheck() apiOperationOption {
	return withMiddlewares(middleware.HCaptchaCheck())
}

var graphqlAPIOperations = []apiOperation{
	apiQuery("setup", controller.GetSetup),
	apiQuery("status", controller.GetStatus),
	apiQuery("uptimeStatus", controller.GetUptimeKumaStatus),
	apiQuery("dashboardModels", controller.DashboardListModels, userAuth()),
	apiQuery("adminStatus", controller.GetAdminStatus, adminAuth()),
	apiQuery("userAgreement", controller.GetUserAgreement),
	apiQuery("privacyPolicy", controller.GetPrivacyPolicy),
	apiQuery("about", controller.GetAbout),
	apiQuery("homePageContent", controller.GetHomePageContent),
	apiQuery("publicBroadcasts", controller.GetPublicBroadcasts),
	apiQuery("pricing", controller.GetPricing, tryUserAuth()),
	apiQuery("perfMetricsSummary", controller.GetPerfMetricsSummary, tryUserAuth()),
	apiQuery("perfMetrics", controller.GetPerfMetrics, tryUserAuth()),
	apiQuery("rankings", controller.GetRankings),
	apiQuery("ratioConfig", controller.GetRatioConfig, criticalRateLimit()),
	apiMutation("workosLogin", controller.WorkOSLogin, criticalRateLimit()),
	apiMutation("workosLogout", controller.WorkOSLogout),

	apiQuery("userGroups", controller.GetUserGroups),
	apiQuery("selfGroups", controller.GetUserGroups, userActivity("user_self")),
	apiQuery("self", controller.GetSelf, userActivity("user_self")),
	apiQuery("inbox", controller.GetInbox, userActivity("message")),
	apiQuery("inboxUnreadCount", controller.GetInboxUnreadCount, userActivity("message")),
	apiMutation("markInboxItemRead", controller.MarkInboxItemRead, userActivity("message")),
	apiMutation("markAllInboxRead", controller.MarkAllInboxRead, userActivity("message")),
	apiQuery("userModels", controller.GetUserModels, userActivity("user_self")),
	apiQuery("accountContext", controller.GetAccountContext, accountContextAuth()),
	apiQuery("teams", controller.GetTeams, userActivity("team")),
	apiQuery("team", controller.GetTeam, teamMemberAuth(), withResourceParams("team_id")),
	apiQuery("teamMembers", controller.GetTeamMembers, teamAdminAuth(), withResourceParams("team_id")),
	apiQuery("teamInvitations", controller.GetTeamInvitations, teamAdminAuth(), withResourceParams("team_id")),
	apiQuery("teamPolicy", controller.GetTeamPolicy, teamAdminAuth(), withResourceParams("team_id")),
	apiQuery("teamBillingSummary", controller.GetTeamBillingSummary, teamAdminAuth(), withResourceParams("team_id")),
	apiQuery("teamTopups", controller.GetTeamTopups, teamAdminAuth(), withResourceParams("team_id")),
	apiQuery("teamTokens", controller.GetTeamTokens, teamMemberAuth(), withResourceParams("team_id")),
	apiQuery("teamToken", controller.GetTeamToken, teamMemberAuth(), withResourceParams("team_id", "id")),
	apiQuery("teamUsage", controller.GetTeamUsage, teamMemberAuth(), withResourceParams("team_id")),
	apiMutation("createTeam", controller.CreateTeam, userActivity("team"), criticalRateLimit()),
	apiMutation("updateTeam", controller.UpdateTeam, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("deleteTeam", controller.DeleteTeam, teamAdminAuth(), criticalRateLimit(), withResourceParams("team_id")),
	apiMutation("inviteTeamMember", controller.InviteTeamMember, teamAdminAuth(), criticalRateLimit(), withResourceParams("team_id")),
	apiMutation("revokeTeamInvitation", controller.RevokeTeamInvitation, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("updateTeamMemberRole", controller.UpdateTeamMemberRole, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("removeTeamMember", controller.RemoveTeamMember, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("updateTeamPolicy", controller.UpdateTeamPolicy, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("teamStripeAmount", controller.RequestTeamStripeAmount, teamAdminAuth(), withResourceParams("team_id")),
	apiMutation("teamStripePay", controller.RequestTeamStripePay, teamAdminAuth(), criticalRateLimit(), withResourceParams("team_id")),
	apiMutation("teamStripeBillingPortal", controller.RequestTeamStripeBillingPortal, teamAdminAuth(), criticalRateLimit(), withResourceParams("team_id")),
	apiMutation("createTeamToken", controller.CreateTeamToken, teamMemberAuth(), withResourceParams("team_id")),
	apiMutation("updateTeamToken", controller.UpdateTeamToken, teamMemberAuth(), withResourceParams("team_id")),
	apiMutation("deleteTeamToken", controller.DeleteTeamToken, teamMemberAuth(), withResourceParams("team_id", "id")),
	apiMutation("deleteTeamTokens", controller.DeleteTeamTokens, teamMemberAuth(), withResourceParams("team_id")),
	apiMutation("teamTokenKey", controller.GetTeamTokenKey, teamMemberAuth(), criticalRateLimit(), disableCache(), withResourceParams("team_id", "id")),
	apiMutation("teamTokenKeysBatch", controller.GetTeamTokenKeysBatch, teamMemberAuth(), criticalRateLimit(), disableCache(), withResourceParams("team_id")),
	apiMutation("generateAccessToken", controller.GenerateAccessToken, userActivity("user_self")),
	apiQuery("affCode", controller.GetAffCode, userActivity("user_self")),
	apiQuery("topupInfo", controller.GetTopUpInfo, userActivity("user_self")),
	apiQuery("userTopups", controller.GetUserTopUps, userActivity("user_self")),
	apiMutation("topup", controller.TopUp, userActivity("user_self"), criticalRateLimit()),
	apiMutation("stripePay", controller.RequestStripePay, userActivity("user_self"), criticalRateLimit()),
	apiMutation("stripeAmount", controller.RequestStripeAmount, userActivity("user_self")),
	apiQuery("stripeCheckoutResult", controller.RequestStripeCheckoutResult, userActivity("user_self"), criticalRateLimit()),
	apiMutation("stripeBillingPortal", controller.RequestStripeBillingPortal, userActivity("user_self"), criticalRateLimit()),
	apiMutation("affTransfer", controller.TransferAffQuota, userActivity("user_self")),
	apiMutation("updateSelf", controller.UpdateSelf, userActivity("user_self")),
	apiMutation("deleteSelf", controller.DeleteSelf, userActivity("user_self")),
	apiMutation("updateUserSetting", controller.UpdateUserSetting, userActivity("user_self")),
	apiQuery("checkinStatus", controller.GetCheckinStatus, userActivity("user_self")),
	apiMutation("checkin", controller.DoCheckin, userActivity("user_self"), hcaptchaCheck()),

	apiQuery("users", controller.GetAllUsers, adminAudit("user")),
	apiQuery("adminBroadcasts", controller.AdminListBroadcasts, adminAudit("broadcast")),
	apiMutation("createBroadcast", controller.AdminCreateBroadcast, adminAudit("broadcast")),
	apiMutation("deleteBroadcast", controller.AdminDeleteBroadcast, adminAudit("broadcast"), withResourceParams("id")),
	apiQuery("adminTopups", controller.GetAllTopUps, adminAudit("user")),
	apiQuery("searchUsers", controller.SearchUsers, adminAudit("user")),
	apiQuery("user", controller.GetUser, adminAudit("user"), withResourceParams("id")),
	apiMutation("manageUser", controller.ManageUser, adminAudit("user")),
	apiMutation("updateUser", controller.UpdateUser, adminAudit("user")),
	apiMutation("deleteUser", controller.DeleteUser, adminAudit("user"), withResourceParams("id")),

	apiQuery("subscriptionPlans", controller.GetSubscriptionPlans, userActivity("subscription")),
	apiQuery("subscriptionSelf", controller.GetSubscriptionSelf, userActivity("subscription")),
	apiMutation("updateSubscriptionPreference", controller.UpdateSubscriptionPreference, userActivity("subscription")),
	apiMutation("subscriptionStripePay", controller.SubscriptionRequestStripePay, userActivity("subscription"), criticalRateLimit()),
	apiQuery("adminSubscriptionPlans", controller.AdminListSubscriptionPlans, adminAudit("subscription")),
	apiMutation("createSubscriptionPlan", controller.AdminCreateSubscriptionPlan, adminAudit("subscription")),
	apiMutation("updateSubscriptionPlan", controller.AdminUpdateSubscriptionPlan, adminAudit("subscription"), withResourceParams("id")),
	apiMutation("updateSubscriptionPlanStatus", controller.AdminUpdateSubscriptionPlanStatus, adminAudit("subscription"), withResourceParams("id")),
	apiMutation("bindSubscription", controller.AdminBindSubscription, adminAudit("subscription")),
	apiQuery("userSubscriptions", controller.AdminListUserSubscriptions, adminAudit("subscription"), withResourceParams("id")),
	apiMutation("createUserSubscription", controller.AdminCreateUserSubscription, adminAudit("subscription"), withResourceParams("id")),
	apiMutation("invalidateUserSubscription", controller.AdminInvalidateUserSubscription, adminAudit("subscription"), withResourceParams("id")),
	apiMutation("deleteUserSubscription", controller.AdminDeleteUserSubscription, adminAudit("subscription"), withResourceParams("id")),

	apiQuery("options", controller.GetOptions, rootAudit("option")),
	apiQuery("optionRevisions", controller.GetOptionRevisions, rootAudit("option")),
	apiMutation("updateOption", controller.UpdateOption, rootAudit("option")),
	apiQuery("channelAffinityCache", controller.GetChannelAffinityCacheStats, rootAudit("option")),
	apiMutation("clearChannelAffinityCache", controller.ClearChannelAffinityCache, rootAudit("option")),
	apiMutation("resetModelPrices", controller.ResetModelPrices, rootAudit("option")),
	apiQuery("performanceStats", controller.GetPerformanceStats, rootAudit("performance")),
	apiMutation("clearDiskCache", controller.ClearDiskCache, rootAudit("performance")),
	apiMutation("resetPerformanceStats", controller.ResetPerformanceStats, rootAudit("performance")),
	apiMutation("forceGC", controller.ForceGC, rootAudit("performance")),
	apiQuery("syncableChannels", controller.GetSyncableChannels, rootAudit("ratio_sync")),
	apiMutation("fetchUpstreamRatios", controller.FetchUpstreamRatios, rootAudit("ratio_sync")),

	apiQuery("channels", controller.GetAllChannels, adminAudit("channel")),
	apiQuery("searchChannels", controller.SearchChannels, adminAudit("channel")),
	apiQuery("channelModels", controller.ChannelListModels, adminAudit("channel")),
	apiQuery("enabledChannelModels", controller.EnabledListModels, adminAudit("channel")),
	apiQuery("channel", controller.GetChannel, adminAudit("channel"), withResourceParams("id")),
	apiMutation("channelKey", controller.GetChannelKey, adminAudit("channel"), rootAuth(), criticalRateLimit(), disableCache(), withResourceParams("id")),
	apiMutation("testAllChannels", controller.TestAllChannels, adminAudit("channel")),
	apiMutation("testChannel", controller.TestChannel, adminAudit("channel"), withResourceParams("id")),
	apiMutation("updateAllChannelBalance", controller.UpdateAllChannelsBalance, adminAudit("channel")),
	apiMutation("updateChannelBalance", controller.UpdateChannelBalance, adminAudit("channel"), withResourceParams("id")),
	apiMutation("createChannel", controller.AddChannel, adminAudit("channel")),
	apiMutation("updateChannel", controller.UpdateChannel, adminAudit("channel")),
	apiMutation("deleteDisabledChannels", controller.DeleteDisabledChannel, adminAudit("channel")),
	apiMutation("disableTagChannels", controller.DisableTagChannels, adminAudit("channel")),
	apiMutation("enableTagChannels", controller.EnableTagChannels, adminAudit("channel")),
	apiMutation("editTagChannels", controller.EditTagChannels, adminAudit("channel")),
	apiMutation("deleteChannel", controller.DeleteChannel, adminAudit("channel"), withResourceParams("id")),
	apiMutation("deleteChannels", controller.DeleteChannelBatch, adminAudit("channel")),
	apiMutation("fixChannelsAbilities", controller.FixChannelsAbilities, adminAudit("channel")),
	apiMutation("fetchUpstreamModels", controller.FetchUpstreamModels, adminAudit("channel"), withResourceParams("id")),
	apiMutation("fetchModels", controller.FetchModels, adminAudit("channel"), rootAuth()),
	apiMutation("batchSetChannelTag", controller.BatchSetChannelTag, adminAudit("channel")),
	apiQuery("tagModels", controller.GetTagModels, adminAudit("channel")),
	apiMutation("copyChannel", controller.CopyChannel, adminAudit("channel"), withResourceParams("id")),
	apiMutation("manageMultiKeys", controller.ManageMultiKeys, adminAudit("channel")),
	apiMutation("applyChannelUpstreamUpdates", controller.ApplyChannelUpstreamModelUpdates, adminAudit("channel")),
	apiMutation("applyAllChannelUpstreamUpdates", controller.ApplyAllChannelUpstreamModelUpdates, adminAudit("channel")),
	apiMutation("detectChannelUpstreamUpdates", controller.DetectChannelUpstreamModelUpdates, adminAudit("channel")),
	apiMutation("detectAllChannelUpstreamUpdates", controller.DetectAllChannelUpstreamModelUpdates, adminAudit("channel")),

	apiQuery("tokens", controller.GetAllTokens, userActivity("token")),
	apiQuery("searchTokens", controller.SearchTokens, userActivity("token"), searchRateLimit()),
	apiQuery("token", controller.GetToken, userActivity("token"), withResourceParams("id")),
	apiMutation("tokenKey", controller.GetTokenKey, userActivity("token"), criticalRateLimit(), disableCache(), withResourceParams("id")),
	apiMutation("createToken", controller.AddToken, userActivity("token")),
	apiMutation("updateToken", controller.UpdateToken, userActivity("token")),
	apiMutation("deleteToken", controller.DeleteToken, userActivity("token"), withResourceParams("id")),
	apiMutation("deleteTokens", controller.DeleteTokenBatch, userActivity("token")),
	apiMutation("tokenKeysBatch", controller.GetTokenKeysBatch, userActivity("token"), criticalRateLimit(), disableCache()),

	apiQuery("redemptions", controller.GetAllRedemptions, adminAudit("redemption")),
	apiQuery("searchRedemptions", controller.SearchRedemptions, adminAudit("redemption")),
	apiQuery("redemption", controller.GetRedemption, adminAudit("redemption"), withResourceParams("id")),
	apiMutation("createRedemption", controller.AddRedemption, adminAudit("redemption")),
	apiMutation("updateRedemption", controller.UpdateRedemption, adminAudit("redemption")),
	apiMutation("deleteInvalidRedemptions", controller.DeleteInvalidRedemption, adminAudit("redemption")),
	apiMutation("deleteRedemption", controller.DeleteRedemption, adminAudit("redemption"), withResourceParams("id")),

	apiQuery("logs", controller.GetAllLogs, logAuditWithAuth(middleware.AdminAuth())),
	apiMutation("deleteHistoryLogs", controller.DeleteHistoryLogs, logAuditWithAuth(middleware.AdminAuth())),
	apiQuery("logsStat", controller.GetLogsStat, logAuditWithAuth(middleware.AdminAuth())),
	apiQuery("logsSelfStat", controller.GetLogsSelfStat, logAuditWithAuth(middleware.UserAuth())),
	apiQuery("channelAffinityUsageCache", controller.GetChannelAffinityUsageCacheStats, logAuditWithAuth(middleware.AdminAuth())),
	apiQuery("userLogs", controller.GetUserLogs, logAuditWithAuth(middleware.UserAuth())),
	apiQuery("quotaDates", controller.GetAllQuotaDates, adminAuth()),
	apiQuery("quotaDatesByUser", controller.GetQuotaDatesByUser, adminAuth()),
	apiQuery("quotaDatesSelf", controller.GetUserQuotaDates, userAuth()),
	apiQuery("groups", controller.GetGroups, adminAuth()),

	apiQuery("prefillGroups", controller.GetPrefillGroups, adminAudit("prefill_group")),
	apiMutation("createPrefillGroup", controller.CreatePrefillGroup, adminAudit("prefill_group")),
	apiMutation("updatePrefillGroup", controller.UpdatePrefillGroup, adminAudit("prefill_group")),
	apiMutation("deletePrefillGroup", controller.DeletePrefillGroup, adminAudit("prefill_group"), withResourceParams("id")),
	apiQuery("vendors", controller.GetAllVendors, adminAudit("vendor")),
	apiQuery("searchVendors", controller.SearchVendors, adminAudit("vendor")),
	apiQuery("vendor", controller.GetVendorMeta, adminAudit("vendor"), withResourceParams("id")),
	apiMutation("createVendor", controller.CreateVendorMeta, adminAudit("vendor")),
	apiMutation("updateVendor", controller.UpdateVendorMeta, adminAudit("vendor")),
	apiMutation("deleteVendor", controller.DeleteVendorMeta, adminAudit("vendor"), withResourceParams("id")),
	apiQuery("syncUpstreamPreview", controller.SyncUpstreamPreview, adminAudit("model")),
	apiMutation("syncUpstreamModels", controller.SyncUpstreamModels, adminAudit("model")),
	apiQuery("missingModels", controller.GetMissingModels, adminAudit("model")),
	apiQuery("modelsMeta", controller.GetAllModelsMeta, adminAudit("model")),
	apiQuery("searchModelsMeta", controller.SearchModelsMeta, adminAudit("model")),
	apiQuery("modelMeta", controller.GetModelMeta, adminAudit("model"), withResourceParams("id")),
	apiMutation("createModelMeta", controller.CreateModelMeta, adminAudit("model")),
	apiMutation("updateModelMeta", controller.UpdateModelMeta, adminAudit("model")),
	apiMutation("deleteModelMeta", controller.DeleteModelMeta, adminAudit("model"), withResourceParams("id")),
}
