package model

import (
	"fmt"
	"strings"
	"testing"

	"gorm.io/driver/clickhouse"
	"gorm.io/gorm"
)

func openDryRunClickHouseDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(clickhouse.New(clickhouse.Config{
		DSN:                       "clickhouse://default:@127.0.0.1:9000/default",
		SkipInitializeWithVersion: true,
	}), &gorm.Config{
		DisableAutomaticPing: true,
		DryRun:               true,
	})
	if err != nil {
		t.Fatalf("failed to open dry-run ClickHouse db: %v", err)
	}
	return db
}

func TestUsageBucketQueriesAvoidCreatedAtAliasShadowing(t *testing.T) {
	db := openDryRunClickHouseDB(t)
	bucketExpr := usageBucketExpr(3600)

	sql := db.ToSQL(func(tx *gorm.DB) *gorm.DB {
		query := tx.Table(tableUsageLogs).
			Select(fmt.Sprintf("user_id, any(username) AS username, model_name, %s AS bucket, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
			Where("user_id = ?", "usr_aHTKdzZEDe8c").
			Group(fmt.Sprintf("user_id, model_name, %s", bucketExpr))
		query = orderUsageBucketsAsc(query)
		query = applyUsageTimeRange(query, 1778316464, 1778406464)
		return query.Find(&[]*QuotaData{})
	})

	if strings.Contains(sql, " AS created_at") {
		t.Fatalf("bucket query aliases grouped bucket as created_at: %s", sql)
	}
	if strings.Contains(sql, "ORDER BY intDiv(created_at") {
		t.Fatalf("bucket query orders by the raw created_at expression instead of the bucket alias: %s", sql)
	}
	if !strings.Contains(sql, "AS bucket") {
		t.Fatalf("bucket query must select the grouped bucket with a non-conflicting alias, got: %s", sql)
	}
	wantOrder := "ORDER BY bucket ASC"
	if !strings.Contains(sql, wantOrder) {
		t.Fatalf("bucket query must order by grouped bucket alias %q, got: %s", wantOrder, sql)
	}
}
