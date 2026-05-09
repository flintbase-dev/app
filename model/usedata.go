package model

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// QuotaData is dashboard data aggregated from immutable usage logs.
type QuotaData struct {
	Id        int    `json:"id"`
	UserID    int    `json:"user_id" gorm:"column:user_id"`
	Username  string `json:"username" gorm:"column:username"`
	ModelName string `json:"model_name" gorm:"column:model_name"`
	CreatedAt int64  `json:"created_at" gorm:"column:created_at"`
	TokenUsed int    `json:"token_used" gorm:"column:token_used"`
	Count     int    `json:"count" gorm:"column:count"`
	Quota     int    `json:"quota" gorm:"column:quota"`
}

func usageLogsQuery() (*gorm.DB, error) {
	if LOG_DB == nil {
		return nil, errors.New("clickhouse log database is not initialized")
	}
	return LOG_DB.Table(tableUsageLogs), nil
}

func usageBucketExpr(bucketSize int64) string {
	if bucketSize <= 0 {
		bucketSize = 3600
	}
	return fmt.Sprintf("intDiv(created_at, %d) * %d", bucketSize, bucketSize)
}

func applyUsageTimeRange(query *gorm.DB, startTime int64, endTime int64) *gorm.DB {
	if startTime > 0 {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		query = query.Where("created_at <= ?", endTime)
	}
	return query
}

func GetQuotaDataByUsername(username string, startTime int64, endTime int64) (quotaData []*QuotaData, err error) {
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	bucketExpr := usageBucketExpr(3600)
	query = query.
		Select(fmt.Sprintf("user_id, username, model_name, %s AS created_at, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
		Where("username = ?", username).
		Group(fmt.Sprintf("user_id, username, model_name, %s", bucketExpr)).
		Order("created_at ASC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&quotaData).Error
	return quotaData, err
}

func GetQuotaDataByUserId(userId int, startTime int64, endTime int64) (quotaData []*QuotaData, err error) {
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	bucketExpr := usageBucketExpr(3600)
	query = query.
		Select(fmt.Sprintf("user_id, any(username) AS username, model_name, %s AS created_at, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
		Where("user_id = ?", userId).
		Group(fmt.Sprintf("user_id, model_name, %s", bucketExpr)).
		Order("created_at ASC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&quotaData).Error
	return quotaData, err
}

func GetQuotaDataGroupByUser(startTime int64, endTime int64) (quotaData []*QuotaData, err error) {
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	bucketExpr := usageBucketExpr(3600)
	query = query.
		Select(fmt.Sprintf("user_id, username, %s AS created_at, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
		Group(fmt.Sprintf("user_id, username, %s", bucketExpr)).
		Order("created_at ASC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&quotaData).Error
	return quotaData, err
}

func GetAllQuotaDates(startTime int64, endTime int64, username string) (quotaData []*QuotaData, err error) {
	if username != "" {
		return GetQuotaDataByUsername(username, startTime, endTime)
	}
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	bucketExpr := usageBucketExpr(3600)
	query = query.
		Select(fmt.Sprintf("model_name, %s AS created_at, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
		Group(fmt.Sprintf("model_name, %s", bucketExpr)).
		Order("created_at ASC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&quotaData).Error
	return quotaData, err
}
