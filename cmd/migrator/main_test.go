package main

import (
	"strings"
	"testing"
)

func TestSetupBootstrapSQLIncludesTypedIDColumn(t *testing.T) {
	sql := strings.Join(strings.Fields(setupBootstrapSQL), " ")

	if !strings.Contains(sql, "INSERT INTO setups (id, version, initialized_at)") {
		t.Fatalf("setup bootstrap SQL must insert the required typed ID column: %s", sql)
	}
	if !strings.Contains(sql, "SELECT $1, $2, $3") {
		t.Fatalf("setup bootstrap SQL must bind id, version, and initialized_at: %s", sql)
	}
	if !strings.Contains(sql, "WHERE NOT EXISTS (SELECT 1 FROM setups)") {
		t.Fatalf("setup bootstrap SQL must remain idempotent: %s", sql)
	}
}
