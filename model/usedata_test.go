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

func TestOrderUsageBucketsAscUsesGroupedExpression(t *testing.T) {
	db := openDryRunClickHouseDB(t)
	bucketExpr := usageBucketExpr(3600)

	sql := db.ToSQL(func(tx *gorm.DB) *gorm.DB {
		query := tx.Table(tableUsageLogs).
			Select(fmt.Sprintf("model_name, %s AS created_at, sum(prompt_tokens + completion_tokens) AS token_used, count() AS count, sum(quota) AS quota", bucketExpr)).
			Group(fmt.Sprintf("model_name, %s", bucketExpr))
		query = orderUsageBucketsAsc(query, bucketExpr)
		query = applyUsageTimeRange(query, 1778316464, 1778406464)
		return query.Find(&[]*QuotaData{})
	})

	if strings.Contains(sql, "ORDER BY created_at ASC") {
		t.Fatalf("bucket query orders by aliased created_at column: %s", sql)
	}
	wantOrder := "ORDER BY intDiv(created_at, 3600) * 3600 ASC"
	if !strings.Contains(sql, wantOrder) {
		t.Fatalf("bucket query must order by grouped bucket expression %q, got: %s", wantOrder, sql)
	}
}
