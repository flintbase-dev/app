package model

import (
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"

	"gorm.io/driver/clickhouse"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var commonGroupCol string
var commonKeyCol string
var commonTrueVal string
var commonFalseVal string

var logKeyCol string
var logGroupCol string

func init() {
	initCol()
}

func initCol() {
	commonGroupCol = `"group"`
	commonKeyCol = `"key"`
	commonTrueVal = "true"
	commonFalseVal = "false"
	logGroupCol = commonGroupCol
	logKeyCol = commonKeyCol
}

var DB *gorm.DB

var LOG_DB *gorm.DB

func CheckSetup() {
	setup := GetSetup()
	if setup == nil {
		common.SysLog("system is not initialized; run the database migrator/bootstrap service")
		constant.Setup = false
	} else {
		common.SysLog("system is already initialized at: " + time.Unix(setup.InitializedAt, 0).String())
		constant.Setup = true
	}
}

func chooseDB(envName string) (*gorm.DB, error) {
	defer func() {
		initCol()
	}()
	dsn := os.Getenv(envName)
	if dsn == "" {
		return nil, fmt.Errorf("%s is required and must be a PostgreSQL DSN", envName)
	}
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		return nil, fmt.Errorf("%s must use postgres:// or postgresql://", envName)
	}
	common.SysLog("using PostgreSQL as database")
	return gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // disables implicit prepared statement usage
	}), &gorm.Config{
		PrepareStmt: true, // precompile SQL
	})
}

func chooseClickHouseDB(envName string) (*gorm.DB, error) {
	dsn := os.Getenv(envName)
	if dsn == "" {
		return nil, fmt.Errorf("%s is required and must use a ClickHouse DSN", envName)
	}
	if !strings.HasPrefix(dsn, "clickhouse://") {
		return nil, fmt.Errorf("%s must use clickhouse://", envName)
	}
	common.SysLog("using ClickHouse as categorized event log database")
	return gorm.Open(clickhouse.Open(dsn), &gorm.Config{
		PrepareStmt: false,
	})
}

func InitDB() (err error) {
	db, err := chooseDB("SQL_DSN")
	if err == nil {
		if common.DebugEnabled {
			db = db.Debug()
		}
		DB = db
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		sqlDB.SetMaxIdleConns(common.GetEnvOrDefault("SQL_MAX_IDLE_CONNS", 100))
		sqlDB.SetMaxOpenConns(common.GetEnvOrDefault("SQL_MAX_OPEN_CONNS", 1000))
		sqlDB.SetConnMaxLifetime(time.Second * time.Duration(common.GetEnvOrDefault("SQL_MAX_LIFETIME", 60)))
		return nil
	} else {
		common.FatalLog(err)
	}
	return err
}

func InitLogDB() (err error) {
	db, err := chooseClickHouseDB("LOG_CLICKHOUSE_DSN")
	if err == nil {
		if common.DebugEnabled {
			db = db.Debug()
		}
		LOG_DB = db
		sqlDB, err := LOG_DB.DB()
		if err != nil {
			return err
		}
		sqlDB.SetMaxIdleConns(common.GetEnvOrDefault("LOG_CLICKHOUSE_MAX_IDLE_CONNS", 20))
		sqlDB.SetMaxOpenConns(common.GetEnvOrDefault("LOG_CLICKHOUSE_MAX_OPEN_CONNS", 200))
		sqlDB.SetConnMaxLifetime(time.Second * time.Duration(common.GetEnvOrDefault("LOG_CLICKHOUSE_MAX_LIFETIME", 300)))
		if err := ensureClickHouseLogSchema(); err != nil {
			return err
		}
		return nil
	} else {
		common.FatalLog(err)
	}
	return err
}

func closeDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	err = sqlDB.Close()
	return err
}

func CloseDB() error {
	if LOG_DB != nil && LOG_DB != DB {
		err := closeDB(LOG_DB)
		if err != nil {
			return err
		}
	}
	return closeDB(DB)
}

func PingLogDB() error {
	if LOG_DB == nil {
		return fmt.Errorf("log database is not initialized")
	}
	sqlDB, err := LOG_DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

var (
	lastPingTime time.Time
	pingMutex    sync.Mutex
)

func PingDB() error {
	pingMutex.Lock()
	defer pingMutex.Unlock()

	if time.Since(lastPingTime) < time.Second*10 {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Printf("Error getting sql.DB from GORM: %v", err)
		return err
	}

	err = sqlDB.Ping()
	if err != nil {
		log.Printf("Error pinging DB: %v", err)
		return err
	}

	lastPingTime = time.Now()
	common.SysLog("Database pinged successfully")
	return nil
}
