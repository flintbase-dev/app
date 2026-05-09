package model

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LogCategory string

const (
	LogCategoryUsage    LogCategory = "usage"
	LogCategoryAudit    LogCategory = "audit"
	LogCategoryError    LogCategory = "error"
	LogCategorySecurity LogCategory = "security"
	LogCategoryActivity LogCategory = "activity"
	LogCategoryInternal LogCategory = "internal"
)

// These category ids are the persisted API codes for the new log taxonomy.
const (
	LogTypeUnknown  = 0
	LogTypeUsage    = 1
	LogTypeAudit    = 2
	LogTypeError    = 3
	LogTypeSecurity = 4
	LogTypeActivity = 5
)

const (
	tableAuditLogs    = "audit_logs"
	tableUsageLogs    = "usage_logs"
	tableErrorLogs    = "error_logs"
	tableSecurityLogs = "security_logs"
	tableActivityLogs = "activity_logs"
)

var logIDCounter uint64

type Log struct {
	Id               int64  `json:"id" gorm:"primaryKey;column:id"`
	CreatedAt        int64  `json:"created_at" gorm:"column:created_at;index"`
	Type             int    `json:"type" gorm:"column:type;index"`
	Category         string `json:"category" gorm:"column:category;index"`
	Event            string `json:"event" gorm:"column:event;index"`
	Severity         string `json:"severity" gorm:"column:severity;default:''"`
	Result           string `json:"result" gorm:"column:result;default:''"`
	UserId           int    `json:"user_id" gorm:"column:user_id;index"`
	ActorUserId      int    `json:"actor_user_id" gorm:"column:actor_user_id;index;default:0"`
	Content          string `json:"content" gorm:"column:content"`
	Username         string `json:"username" gorm:"column:username;index;default:''"`
	TokenName        string `json:"token_name" gorm:"column:token_name;index;default:''"`
	ModelName        string `json:"model_name" gorm:"column:model_name;index;default:''"`
	Quota            int    `json:"quota" gorm:"column:quota;default:0"`
	PromptTokens     int    `json:"prompt_tokens" gorm:"column:prompt_tokens;default:0"`
	CompletionTokens int    `json:"completion_tokens" gorm:"column:completion_tokens;default:0"`
	UseTime          int    `json:"use_time" gorm:"column:use_time;default:0"`
	IsStream         bool   `json:"is_stream" gorm:"column:is_stream;default:false"`
	ChannelId        int    `json:"channel" gorm:"column:channel_id;index"`
	ChannelName      string `json:"channel_name" gorm:"-"`
	TokenId          int    `json:"token_id" gorm:"column:token_id;default:0;index"`
	Group            string `json:"group" gorm:"column:group_name;index;default:''"`
	Ip               string `json:"ip" gorm:"column:ip;index;default:''"`
	RequestId        string `json:"request_id,omitempty" gorm:"column:request_id;type:varchar(64);index;default:''"`
	ResourceType     string `json:"resource_type" gorm:"column:resource_type;default:''"`
	ResourceId       string `json:"resource_id" gorm:"column:resource_id;default:''"`
	NodeName         string `json:"node_name" gorm:"column:node_name;default:''"`
	Other            string `json:"other" gorm:"column:other"`
}

type LogEventParams struct {
	UserId           int
	ActorUserId      int
	Event            string
	Severity         string
	Result           string
	Content          string
	Username         string
	TokenName        string
	ModelName        string
	Quota            int
	PromptTokens     int
	CompletionTokens int
	UseTimeSeconds   int
	IsStream         bool
	ChannelId        int
	TokenId          int
	Group            string
	Ip               string
	RequestId        string
	ResourceType     string
	ResourceId       string
	Other            map[string]interface{}
}

type RecordConsumeLogParams struct {
	ChannelId        int                    `json:"channel_id"`
	PromptTokens     int                    `json:"prompt_tokens"`
	CompletionTokens int                    `json:"completion_tokens"`
	ModelName        string                 `json:"model_name"`
	TokenName        string                 `json:"token_name"`
	Quota            int                    `json:"quota"`
	Content          string                 `json:"content"`
	TokenId          int                    `json:"token_id"`
	UseTimeSeconds   int                    `json:"use_time_seconds"`
	IsStream         bool                   `json:"is_stream"`
	Group            string                 `json:"group"`
	Other            map[string]interface{} `json:"other"`
}

type LogFilter struct {
	Category       LogCategory
	UserId         int
	StartTimestamp int64
	EndTimestamp   int64
	ModelName      string
	Username       string
	TokenName      string
	StartIdx       int
	Num            int
	Channel        int
	TokenId        int
	Group          string
	RequestId      string
	Event          string
}

func nextLogID() int64 {
	counter := atomic.AddUint64(&logIDCounter, 1) % 1000
	return time.Now().UnixNano() + int64(counter)
}

func jsonObjectString(m map[string]interface{}) string {
	if len(m) == 0 {
		return "{}"
	}
	result := common.MapToJsonStr(m)
	if result == "" || result == "null" {
		return "{}"
	}
	return result
}

func logTypeForCategory(category LogCategory) int {
	switch category {
	case LogCategoryUsage:
		return LogTypeUsage
	case LogCategoryAudit:
		return LogTypeAudit
	case LogCategoryError:
		return LogTypeError
	case LogCategorySecurity:
		return LogTypeSecurity
	case LogCategoryActivity:
		return LogTypeActivity
	default:
		return LogTypeUnknown
	}
}

func normalizeLogCategory(category string) (LogCategory, error) {
	switch LogCategory(strings.ToLower(strings.TrimSpace(category))) {
	case "", LogCategoryUsage:
		return LogCategoryUsage, nil
	case LogCategoryAudit:
		return LogCategoryAudit, nil
	case LogCategoryError:
		return LogCategoryError, nil
	case LogCategorySecurity:
		return LogCategorySecurity, nil
	case LogCategoryActivity:
		return LogCategoryActivity, nil
	case LogCategoryInternal:
		return LogCategoryInternal, nil
	default:
		return "", fmt.Errorf("unknown log category: %s", category)
	}
}

func tableForLogCategory(category LogCategory) (string, error) {
	switch category {
	case LogCategoryUsage:
		return tableUsageLogs, nil
	case LogCategoryAudit:
		return tableAuditLogs, nil
	case LogCategoryError:
		return tableErrorLogs, nil
	case LogCategorySecurity:
		return tableSecurityLogs, nil
	case LogCategoryActivity:
		return tableActivityLogs, nil
	default:
		return "", fmt.Errorf("log category %q is not persisted", category)
	}
}

func dbForLogCategory(category LogCategory) (*gorm.DB, string, error) {
	table, err := tableForLogCategory(category)
	if err != nil {
		return nil, "", err
	}
	if category == LogCategoryAudit {
		if DB == nil {
			return nil, "", errors.New("postgres database is not initialized")
		}
		return DB.Table(table), table, nil
	}
	if LOG_DB == nil {
		return nil, "", errors.New("clickhouse log database is not initialized")
	}
	return LOG_DB.Table(table), table, nil
}

func clickHouseLogTableSQL(table string, ttl string) string {
	return fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS %s (
	id Int64,
	created_at Int64,
	type Int32,
	category LowCardinality(String),
	event LowCardinality(String),
	severity LowCardinality(String),
	result LowCardinality(String),
	user_id Int64,
	actor_user_id Int64,
	content String,
	username String,
	token_name String,
	model_name String,
	quota Int64,
	prompt_tokens Int64,
	completion_tokens Int64,
	use_time Int64,
	is_stream UInt8,
	channel_id Int64,
	token_id Int64,
	group_name LowCardinality(String),
	ip String,
	request_id String,
	resource_type LowCardinality(String),
	resource_id String,
	node_name LowCardinality(String),
	other String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(toDateTime(created_at))
ORDER BY (created_at, user_id, request_id, id)
%s
SETTINGS index_granularity = 8192`, table, ttl)
}

func ensureClickHouseLogSchema() error {
	if LOG_DB == nil {
		return errors.New("clickhouse log database is not initialized")
	}
	statements := []string{
		clickHouseLogTableSQL(tableUsageLogs, "TTL toDateTime(created_at) + INTERVAL 3 YEAR DELETE"),
		clickHouseLogTableSQL(tableErrorLogs, "TTL toDateTime(created_at) + INTERVAL 90 DAY DELETE"),
		clickHouseLogTableSQL(tableSecurityLogs, "TTL toDateTime(created_at) + INTERVAL 1 YEAR DELETE"),
		clickHouseLogTableSQL(tableActivityLogs, "TTL toDateTime(created_at) + INTERVAL 30 DAY DELETE"),
	}
	for _, statement := range statements {
		if err := LOG_DB.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}

func enrichLogFromUser(log *Log) {
	if log.Username != "" || log.UserId <= 0 {
		return
	}
	username, err := GetUsernameById(log.UserId, false)
	if err == nil {
		log.Username = username
	}
}

func normalizeLogEntry(category LogCategory, params LogEventParams) *Log {
	entry := &Log{
		Id:               nextLogID(),
		CreatedAt:        common.GetTimestamp(),
		Type:             logTypeForCategory(category),
		Category:         string(category),
		Event:            strings.TrimSpace(params.Event),
		Severity:         strings.TrimSpace(params.Severity),
		Result:           strings.TrimSpace(params.Result),
		UserId:           params.UserId,
		ActorUserId:      params.ActorUserId,
		Content:          common.MaskSensitiveInfo(params.Content),
		Username:         params.Username,
		TokenName:        params.TokenName,
		ModelName:        params.ModelName,
		Quota:            params.Quota,
		PromptTokens:     params.PromptTokens,
		CompletionTokens: params.CompletionTokens,
		UseTime:          params.UseTimeSeconds,
		IsStream:         params.IsStream,
		ChannelId:        params.ChannelId,
		TokenId:          params.TokenId,
		Group:            params.Group,
		Ip:               params.Ip,
		RequestId:        params.RequestId,
		ResourceType:     params.ResourceType,
		ResourceId:       params.ResourceId,
		NodeName:         common.NodeName,
		Other:            jsonObjectString(params.Other),
	}
	if entry.Event == "" {
		entry.Event = string(category) + ".event"
	}
	if entry.Severity == "" {
		entry.Severity = "info"
	}
	if entry.Result == "" {
		entry.Result = "success"
	}
	enrichLogFromUser(entry)
	return entry
}

func recordCategorizedLog(category LogCategory, params LogEventParams) error {
	if category == LogCategoryInternal {
		common.SysLog(params.Content)
		return nil
	}
	entry := normalizeLogEntry(category, params)
	tx, _, err := dbForLogCategory(category)
	if err != nil {
		return err
	}
	if category == LogCategoryAudit {
		return tx.Omit("id").Create(entry).Error
	}
	return tx.Create(entry).Error
}

func RecordAuditEvent(params LogEventParams) {
	if err := recordCategorizedLog(LogCategoryAudit, params); err != nil {
		common.SysError("failed to record audit log: " + err.Error())
	}
}

func RecordSecurityEvent(params LogEventParams) {
	if err := recordCategorizedLog(LogCategorySecurity, params); err != nil {
		common.SysError("failed to record security log: " + err.Error())
	}
}

func RecordActivityEvent(params LogEventParams) {
	if err := recordCategorizedLog(LogCategoryActivity, params); err != nil {
		common.SysError("failed to record activity log: " + err.Error())
	}
}

func RecordAuditEventWithContext(c *gin.Context, params LogEventParams) {
	augmentLogParamsFromGin(c, &params)
	RecordAuditEvent(params)
}

func RecordSecurityEventWithContext(c *gin.Context, params LogEventParams) {
	augmentLogParamsFromGin(c, &params)
	RecordSecurityEvent(params)
}

func RecordActivityEventWithContext(c *gin.Context, params LogEventParams) {
	augmentLogParamsFromGin(c, &params)
	RecordActivityEvent(params)
}

func augmentLogParamsFromGin(c *gin.Context, params *LogEventParams) {
	if c == nil || params == nil {
		return
	}
	if params.UserId == 0 {
		params.UserId = c.GetInt("id")
	}
	if params.ActorUserId == 0 {
		params.ActorUserId = c.GetInt("id")
	}
	if params.Username == "" {
		params.Username = c.GetString("username")
	}
	if params.RequestId == "" {
		params.RequestId = c.GetString(common.RequestIdKey)
	}
	if params.Ip == "" {
		params.Ip = c.ClientIP()
	}
}

func shouldRecordUsageIP(userId int) bool {
	if settingMap, err := GetUserSetting(userId, false); err == nil {
		return settingMap.RecordIpLog
	}
	return false
}

func RecordTopupLog(userId int, tradeNo string, content string, callerIp string, paymentMethod string, callbackPaymentMethod string) {
	RecordAuditEvent(LogEventParams{
		UserId:       userId,
		Event:        "billing.topup.completed",
		Content:      content,
		Ip:           callerIp,
		ResourceType: "topup",
		ResourceId:   tradeNo,
		Result:       "success",
		Other: map[string]interface{}{
			"caller_ip":               callerIp,
			"payment_method":          paymentMethod,
			"callback_payment_method": callbackPaymentMethod,
			"node_name":               common.NodeName,
			"version":                 common.Version,
		},
	})
}

func RecordErrorLog(c *gin.Context, userId int, channelId int, modelName string, tokenName string, content string, tokenId int, useTimeSeconds int,
	isStream bool, group string, other map[string]interface{}) {
	params := LogEventParams{
		UserId:           userId,
		Event:            "relay.error",
		Severity:         "error",
		Result:           "failed",
		Content:          content,
		TokenName:        tokenName,
		ModelName:        modelName,
		PromptTokens:     0,
		CompletionTokens: 0,
		Quota:            0,
		ChannelId:        channelId,
		TokenId:          tokenId,
		UseTimeSeconds:   useTimeSeconds,
		IsStream:         isStream,
		Group:            group,
		Other:            other,
	}
	augmentLogParamsFromGin(c, &params)
	if !shouldRecordUsageIP(userId) {
		params.Ip = ""
	}
	if err := recordCategorizedLog(LogCategoryError, params); err != nil {
		logger.LogError(c, "failed to record error log: "+err.Error())
	}
}

func RecordConsumeLog(c *gin.Context, userId int, params RecordConsumeLogParams) {
	event := "usage.consume"
	if params.Other != nil {
		if violation, ok := params.Other["violation_fee"].(bool); ok && violation {
			event = "usage.violation_fee"
		}
	}
	logParams := LogEventParams{
		UserId:           userId,
		Event:            event,
		Content:          params.Content,
		PromptTokens:     params.PromptTokens,
		CompletionTokens: params.CompletionTokens,
		TokenName:        params.TokenName,
		ModelName:        params.ModelName,
		Quota:            params.Quota,
		ChannelId:        params.ChannelId,
		TokenId:          params.TokenId,
		UseTimeSeconds:   params.UseTimeSeconds,
		IsStream:         params.IsStream,
		Group:            params.Group,
		ResourceType:     "relay_request",
		Other:            params.Other,
	}
	augmentLogParamsFromGin(c, &logParams)
	if !shouldRecordUsageIP(userId) {
		logParams.Ip = ""
	}
	if err := recordCategorizedLog(LogCategoryUsage, logParams); err != nil {
		logger.LogError(c, "failed to record usage log: "+err.Error())
	}
}

func formatUserLogs(logs []*Log, startIdx int) {
	for i := range logs {
		logs[i].ChannelName = ""
		otherMap, _ := common.StrToMap(logs[i].Other)
		if otherMap != nil {
			delete(otherMap, "admin_info")
			delete(otherMap, "stream_status")
		}
		logs[i].Other = jsonObjectString(otherMap)
		logs[i].Id = int64(startIdx + i + 1)
	}
}

func applyLogFilters(tx *gorm.DB, filter LogFilter) (*gorm.DB, error) {
	if filter.UserId > 0 {
		tx = tx.Where("user_id = ?", filter.UserId)
	}
	if filter.Username != "" {
		tx = tx.Where("username = ?", filter.Username)
	}
	if filter.TokenName != "" {
		tx = tx.Where("token_name = ?", filter.TokenName)
	}
	if filter.ModelName != "" {
		modelNamePattern, err := sanitizeLikePattern(filter.ModelName)
		if err != nil {
			return nil, err
		}
		tx = tx.Where("model_name LIKE ?", modelNamePattern)
	}
	if filter.RequestId != "" {
		tx = tx.Where("request_id = ?", filter.RequestId)
	}
	if filter.StartTimestamp != 0 {
		tx = tx.Where("created_at >= ?", filter.StartTimestamp)
	}
	if filter.EndTimestamp != 0 {
		tx = tx.Where("created_at <= ?", filter.EndTimestamp)
	}
	if filter.Channel != 0 {
		tx = tx.Where("channel_id = ?", filter.Channel)
	}
	if filter.TokenId != 0 {
		tx = tx.Where("token_id = ?", filter.TokenId)
	}
	if filter.Group != "" {
		tx = tx.Where("group_name = ?", filter.Group)
	}
	if filter.Event != "" {
		tx = tx.Where("event = ?", filter.Event)
	}
	return tx, nil
}

func hydrateChannelNames(logs []*Log) error {
	channelIds := types.NewSet[int]()
	for _, log := range logs {
		if log.ChannelId != 0 {
			channelIds.Add(log.ChannelId)
		}
	}
	if channelIds.Len() == 0 {
		return nil
	}

	var channels []struct {
		Id   int    `gorm:"column:id"`
		Name string `gorm:"column:name"`
	}
	if common.MemoryCacheEnabled {
		for _, channelId := range channelIds.Items() {
			if cacheChannel, err := CacheGetChannel(channelId); err == nil {
				channels = append(channels, struct {
					Id   int    `gorm:"column:id"`
					Name string `gorm:"column:name"`
				}{
					Id:   channelId,
					Name: cacheChannel.Name,
				})
			}
		}
	} else {
		if err := DB.Table("channels").Select("id, name").Where("id IN ?", channelIds.Items()).Find(&channels).Error; err != nil {
			return err
		}
	}
	channelMap := make(map[int]string, len(channels))
	for _, channel := range channels {
		channelMap[channel.Id] = channel.Name
	}
	for i := range logs {
		logs[i].ChannelName = channelMap[logs[i].ChannelId]
	}
	return nil
}

func queryLogs(filter LogFilter) (logs []*Log, total int64, err error) {
	if filter.Num <= 0 {
		filter.Num = common.ItemsPerPage
	}
	category := filter.Category
	if category == "" {
		category = LogCategoryUsage
	}
	tx, _, err := dbForLogCategory(category)
	if err != nil {
		return nil, 0, err
	}
	tx, err = applyLogFilters(tx, filter)
	if err != nil {
		return nil, 0, err
	}
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := tx.Order("created_at desc, id desc").Limit(filter.Num).Offset(filter.StartIdx).Find(&logs).Error; err != nil {
		return nil, 0, err
	}
	if err := hydrateChannelNames(logs); err != nil {
		return logs, total, err
	}
	return logs, total, nil
}

func GetLogByTokenId(tokenId int) (logs []*Log, err error) {
	filter := LogFilter{
		Category: LogCategoryUsage,
		TokenId:  tokenId,
		Num:      common.MaxRecentItems,
	}
	tx, _, err := dbForLogCategory(LogCategoryUsage)
	if err != nil {
		return nil, err
	}
	tx = tx.Where("token_id = ?", tokenId)
	if err := tx.Order("created_at desc, id desc").Limit(filter.Num).Find(&logs).Error; err != nil {
		return nil, err
	}
	formatUserLogs(logs, 0)
	return logs, nil
}

func GetAllLogs(category string, startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, startIdx int, num int, channel int, group string, requestId string) (logs []*Log, total int64, err error) {
	normalized, err := normalizeLogCategory(category)
	if err != nil {
		return nil, 0, err
	}
	if normalized == LogCategoryInternal {
		return nil, 0, errors.New("internal logs are stdout-only and are not queryable")
	}
	return queryLogs(LogFilter{
		Category:       normalized,
		StartTimestamp: startTimestamp,
		EndTimestamp:   endTimestamp,
		ModelName:      modelName,
		Username:       username,
		TokenName:      tokenName,
		StartIdx:       startIdx,
		Num:            num,
		Channel:        channel,
		Group:          group,
		RequestId:      requestId,
	})
}

const logSearchCountLimit = 10000

func GetUserLogs(userId int, category string, startTimestamp int64, endTimestamp int64, modelName string, tokenName string, startIdx int, num int, group string, requestId string) (logs []*Log, total int64, err error) {
	normalized, err := normalizeLogCategory(category)
	if err != nil {
		return nil, 0, err
	}
	if normalized == LogCategoryInternal || normalized == LogCategoryAudit {
		return nil, 0, errors.New("requested log category is not available for user self-service queries")
	}
	if num > logSearchCountLimit {
		num = logSearchCountLimit
	}
	logs, total, err = queryLogs(LogFilter{
		Category:       normalized,
		UserId:         userId,
		StartTimestamp: startTimestamp,
		EndTimestamp:   endTimestamp,
		ModelName:      modelName,
		TokenName:      tokenName,
		StartIdx:       startIdx,
		Num:            num,
		Group:          group,
		RequestId:      requestId,
	})
	if err != nil {
		return nil, 0, err
	}
	formatUserLogs(logs, startIdx)
	return logs, total, nil
}

type Stat struct {
	Quota int `json:"quota"`
	Rpm   int `json:"rpm"`
	Tpm   int `json:"tpm"`
}

func SumUsedQuota(startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string, channel int, group string) (stat Stat, err error) {
	if LOG_DB == nil {
		return stat, errors.New("clickhouse log database is not initialized")
	}
	tx := LOG_DB.Table(tableUsageLogs).Select("COALESCE(sum(quota), 0) quota")
	rpmTpmQuery := LOG_DB.Table(tableUsageLogs).Select("count(*) rpm, COALESCE(sum(prompt_tokens), 0) + COALESCE(sum(completion_tokens), 0) tpm")

	if username != "" {
		tx = tx.Where("username = ?", username)
		rpmTpmQuery = rpmTpmQuery.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
		rpmTpmQuery = rpmTpmQuery.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		modelNamePattern, err := sanitizeLikePattern(modelName)
		if err != nil {
			return stat, err
		}
		tx = tx.Where("model_name LIKE ?", modelNamePattern)
		rpmTpmQuery = rpmTpmQuery.Where("model_name LIKE ?", modelNamePattern)
	}
	if channel != 0 {
		tx = tx.Where("channel_id = ?", channel)
		rpmTpmQuery = rpmTpmQuery.Where("channel_id = ?", channel)
	}
	if group != "" {
		tx = tx.Where("group_name = ?", group)
		rpmTpmQuery = rpmTpmQuery.Where("group_name = ?", group)
	}

	rpmTpmQuery = rpmTpmQuery.Where("created_at >= ?", time.Now().Add(-60*time.Second).Unix())

	if err := tx.Scan(&stat).Error; err != nil {
		common.SysError("failed to query usage quota stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}
	if err := rpmTpmQuery.Scan(&stat).Error; err != nil {
		common.SysError("failed to query usage rpm/tpm stat: " + err.Error())
		return stat, errors.New("查询统计数据失败")
	}

	return stat, nil
}

func SumUsedToken(startTimestamp int64, endTimestamp int64, modelName string, username string, tokenName string) (token int) {
	if LOG_DB == nil {
		return 0
	}
	tx := LOG_DB.Table(tableUsageLogs).Select("COALESCE(sum(prompt_tokens), 0) + COALESCE(sum(completion_tokens), 0)")
	if username != "" {
		tx = tx.Where("username = ?", username)
	}
	if tokenName != "" {
		tx = tx.Where("token_name = ?", tokenName)
	}
	if startTimestamp != 0 {
		tx = tx.Where("created_at >= ?", startTimestamp)
	}
	if endTimestamp != 0 {
		tx = tx.Where("created_at <= ?", endTimestamp)
	}
	if modelName != "" {
		tx = tx.Where("model_name = ?", modelName)
	}
	tx.Scan(&token)
	return token
}

func DeleteOldLog(ctx context.Context, category string, targetTimestamp int64) (int64, error) {
	normalized, err := normalizeLogCategory(category)
	if err != nil {
		return 0, err
	}
	switch normalized {
	case LogCategoryUsage:
		return 0, errors.New("usage logs are billing facts and can only expire through retention policy")
	case LogCategoryAudit:
		return 0, errors.New("audit logs are immutable and cannot be deleted from the application")
	case LogCategoryInternal:
		return 0, errors.New("internal logs are stdout-only and cannot be deleted from the application")
	}
	tx, table, err := dbForLogCategory(normalized)
	if err != nil {
		return 0, err
	}
	var total int64
	if err := tx.Where("created_at < ?", targetTimestamp).Count(&total).Error; err != nil {
		return 0, err
	}
	if total == 0 {
		return 0, nil
	}
	statement := fmt.Sprintf("ALTER TABLE %s DELETE WHERE created_at < %d", table, targetTimestamp)
	if err := LOG_DB.WithContext(ctx).Exec(statement).Error; err != nil {
		return 0, err
	}
	return total, nil
}
