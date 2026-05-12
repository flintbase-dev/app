package model

import "fmt"

type RankingQuotaTotal struct {
	ModelName   string `json:"model_name"`
	TotalTokens int64  `json:"total_tokens"`
}

type RankingQuotaBucket struct {
	ModelName string `json:"model_name"`
	Bucket    int64  `json:"bucket"`
	Tokens    int64  `json:"tokens"`
}

func GetRankingQuotaTotals(startTime int64, endTime int64) ([]RankingQuotaTotal, error) {
	var rows []RankingQuotaTotal
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	query = query.
		Select("model_name, sum(prompt_tokens + completion_tokens) as total_tokens").
		Where("model_name <> ''").
		Group("model_name").
		Having("sum(prompt_tokens + completion_tokens) > 0").
		Order("total_tokens DESC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&rows).Error
	return rows, err
}

func GetRankingQuotaBuckets(startTime int64, endTime int64, bucketSize int64) ([]RankingQuotaBucket, error) {
	if bucketSize <= 0 {
		bucketSize = 3600
	}
	bucketExpr := rankingBucketExpr(bucketSize)
	var rows []RankingQuotaBucket
	query, err := usageLogsQuery()
	if err != nil {
		return nil, err
	}
	query = query.
		Select(fmt.Sprintf("model_name, %s as bucket, sum(prompt_tokens + completion_tokens) as tokens", bucketExpr)).
		Where("model_name <> ''").
		Group(fmt.Sprintf("model_name, %s", bucketExpr)).
		Having("sum(prompt_tokens + completion_tokens) > 0").
		Order("bucket ASC")
	query = applyUsageTimeRange(query, startTime, endTime)
	err = query.Find(&rows).Error
	return rows, err
}

func rankingBucketExpr(bucketSize int64) string {
	return fmt.Sprintf("intDiv(created_at, %d) * %d", bucketSize, bucketSize)
}
