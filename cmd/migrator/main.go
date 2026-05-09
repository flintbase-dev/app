package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	_ "github.com/jackc/pgx/v5/stdlib"
)

const migrationTableSQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`

type migration struct {
	version string
	path    string
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	dsn := strings.TrimSpace(os.Getenv("SQL_DSN"))
	if dsn == "" {
		log.Fatal("SQL_DSN is required")
	}
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		log.Fatal("SQL_DSN must use postgres:// or postgresql://")
	}

	ctx, cancel := context.WithTimeout(context.Background(), envDuration("MIGRATION_TIMEOUT", 5*time.Minute))
	defer cancel()

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := waitForDatabase(ctx, db); err != nil {
		log.Fatalf("database is not ready: %v", err)
	}
	if err := applyMigrations(ctx, db, envString("MIGRATION_DIR", "migrations")); err != nil {
		log.Fatalf("apply migrations: %v", err)
	}
	if envBool("RUN_DB_BOOTSTRAP", true) {
		if err := bootstrap(ctx, db); err != nil {
			log.Fatalf("bootstrap database: %v", err)
		}
	}

	log.Print("database migration service completed")
}

func waitForDatabase(ctx context.Context, db *sql.DB) error {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	var lastErr error
	for {
		if err := db.PingContext(ctx); err == nil {
			return nil
		} else {
			lastErr = err
		}

		select {
		case <-ctx.Done():
			if lastErr != nil {
				return lastErr
			}
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func applyMigrations(ctx context.Context, db *sql.DB, migrationDir string) error {
	if migrationDir == "" {
		return errors.New("migration directory is required")
	}
	if _, err := db.ExecContext(ctx, migrationTableSQL); err != nil {
		return fmt.Errorf("create migration table: %w", err)
	}

	migrations, err := listMigrations(migrationDir)
	if err != nil {
		return err
	}
	if len(migrations) == 0 {
		return fmt.Errorf("no .sql migrations found in %s", migrationDir)
	}

	for _, item := range migrations {
		applied, err := migrationApplied(ctx, db, item.version)
		if err != nil {
			return err
		}
		if applied {
			log.Printf("migration %s already applied", item.version)
			continue
		}
		sqlBytes, err := os.ReadFile(item.path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", item.path, err)
		}
		if err := applyMigration(ctx, db, item.version, string(sqlBytes)); err != nil {
			return err
		}
		log.Printf("migration %s applied", item.version)
	}

	return nil
}

func listMigrations(dir string) ([]migration, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read migration dir %s: %w", dir, err)
	}
	migrations := make([]migration, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		version := strings.TrimSuffix(entry.Name(), ".sql")
		migrations = append(migrations, migration{
			version: version,
			path:    filepath.Join(dir, entry.Name()),
		})
	}
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].version < migrations[j].version
	})
	return migrations, nil
}

func migrationApplied(ctx context.Context, db *sql.DB, version string) (bool, error) {
	var exists bool
	if err := db.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists); err != nil {
		return false, fmt.Errorf("check migration %s: %w", version, err)
	}
	return exists, nil
}

func applyMigration(ctx context.Context, db *sql.DB, version string, sqlText string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", version, err)
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, sqlText); err != nil {
		return fmt.Errorf("execute migration %s: %w", version, err)
	}
	if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
		return fmt.Errorf("record migration %s: %w", version, err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", version, err)
	}
	return nil
}

func bootstrap(ctx context.Context, db *sql.DB) error {
	now := time.Now().Unix()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
INSERT INTO setups (version, initialized_at)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM setups)
`, common.Version, now); err != nil {
		return fmt.Errorf("create setup record: %w", err)
	}

	if err := insertOption(ctx, tx, "SelfUseModeEnabled", strconv.FormatBool(envBool("INIT_SELF_USE_MODE_ENABLED", false))); err != nil {
		return err
	}
	if err := insertOption(ctx, tx, "DemoSiteEnabled", strconv.FormatBool(envBool("INIT_DEMO_SITE_ENABLED", false))); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	log.Print("database bootstrap completed")
	return nil
}

func insertOption(ctx context.Context, tx *sql.Tx, key string, value string) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO options ("key", value) VALUES ($1, $2) ON CONFLICT ("key") DO NOTHING`, key, value)
	if err != nil {
		return fmt.Errorf("insert option %s: %w", key, err)
	}
	return nil
}

func envString(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	seconds, err := strconv.Atoi(value)
	if err != nil || seconds <= 0 {
		return fallback
	}
	return time.Duration(seconds) * time.Second
}
