# Logging and Accounting Architecture

## Log Taxonomy

| Category | Business fact | Storage | Retention | Notes |
| --- | --- | --- | --- | --- |
| `usage` | yes | ClickHouse `usage_logs` | 3 years | Billing, quota, reconciliation, and rankings source of truth. Production cold tier should be backed by a ClickHouse S3 storage policy. |
| `audit` | yes | Postgres `audit_logs` | 5+ years by database policy | Append-only from the application; protected by update/delete triggers. |
| `error` | partial | ClickHouse `error_logs` | 90 days | SLA and support diagnostics. |
| `security` | partial | ClickHouse `security_logs` | 1 year | Risk, access denial, secret-view, policy violation, and abuse events. |
| `activity` | no | ClickHouse `activity_logs` | 30 days | User workflow/support context. |
| `internal` | no | stdout/stderr | external log pipeline policy | Debug/runtime logs are not persisted by the application. |

The application writes ClickHouse tables from `LOG_CLICKHOUSE_DSN` and creates categorized ClickHouse schemas on startup. Docker Compose includes a dedicated ClickHouse service and makes the app wait for its healthcheck.

## Accounting

User wallet credit is modeled as:

- `credit_grants`: positive credit sources with remaining amount, status, source, actor, and metadata.
- `credit_ledger_entries`: append-only grant, consume, refund, adjustment, reversal, and expiry facts.
- `users.quota`: projection/cache for fast authorization checks, not the audit source of truth.

Consumption uses FIFO across active grants. Credits and debits carry `source_type`, `source_id`, `request_id`, actor, reason, and metadata so retries, rollbacks, and reconciliation can be traced.
