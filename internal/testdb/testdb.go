package testdb

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var migrateOnce sync.Once
var migrateErr error

func Open(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := strings.TrimSpace(os.Getenv("TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN is required for PostgreSQL integration tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open PostgreSQL test database: %v", err)
	}

	migrateOnce.Do(func() {
		migrateErr = applyInitialSchema(db)
	})
	if migrateErr != nil {
		t.Fatalf("failed to apply PostgreSQL test schema: %v", migrateErr)
	}

	return db
}

func OpenAndReset(t *testing.T) *gorm.DB {
	t.Helper()

	db := Open(t)
	Reset(t, db)
	return db
}

func Reset(t *testing.T, db *gorm.DB) {
	t.Helper()

	tables := []string{
		"subscription_pre_consume_records",
		"user_subscriptions",
		"subscription_orders",
		"subscription_plans",
		"user_oauth_bindings",
		"custom_oauth_providers",
		"two_fa_backup_codes",
		"two_fas",
		"checkins",
		"prefill_groups",
		"vendors",
		"models",
		"tasks",
		"quota_data",
		"top_ups",
		"midjourneys",
		"logs",
		"abilities",
		"redemptions",
		"options",
		"passkey_credentials",
		"tokens",
		"users",
		"channels",
		"setups",
		"perf_metrics",
	}
	if err := db.Exec("TRUNCATE TABLE " + strings.Join(tables, ", ") + " RESTART IDENTITY CASCADE").Error; err != nil {
		t.Fatalf("failed to reset PostgreSQL test database: %v", err)
	}
}

func applyInitialSchema(db *gorm.DB) error {
	var exists bool
	if err := db.Raw("SELECT to_regclass('public.users') IS NOT NULL").Scan(&exists).Error; err != nil {
		return err
	}
	if exists {
		return nil
	}

	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return os.ErrNotExist
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", ".."))
	sqlBytes, err := os.ReadFile(filepath.Join(root, "migrations", "001_initial_schema.sql"))
	if err != nil {
		return err
	}
	return db.Exec(string(sqlBytes)).Error
}
