CREATE TABLE channels (
    id VARCHAR(32) PRIMARY KEY,
    type BIGINT DEFAULT 0,
    "key" TEXT NOT NULL,
    open_ai_organization TEXT,
    test_model TEXT,
    status BIGINT DEFAULT 1,
    name TEXT,
    weight BIGINT DEFAULT 0,
    created_time BIGINT,
    test_time BIGINT,
    response_time BIGINT,
    base_url TEXT DEFAULT '',
    other TEXT,
    balance DOUBLE PRECISION,
    balance_updated_time BIGINT,
    models TEXT,
    "group" VARCHAR(64) DEFAULT 'default',
    used_quota BIGINT DEFAULT 0,
    model_mapping TEXT,
    status_code_mapping VARCHAR(1024) DEFAULT '',
    priority BIGINT DEFAULT 0,
    auto_ban BIGINT DEFAULT 1,
    other_info TEXT,
    tag TEXT,
    setting TEXT,
    param_override TEXT,
    header_override TEXT,
    remark VARCHAR(255),
    channel_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings TEXT
);

CREATE INDEX idx_channels_name ON channels (name);
CREATE INDEX idx_channels_tag ON channels (tag);

CREATE TABLE tokens (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32),
    "key" VARCHAR(128),
    status BIGINT DEFAULT 1,
    name TEXT,
    created_time BIGINT,
    accessed_time BIGINT,
    expired_time BIGINT DEFAULT -1,
    remain_quota BIGINT DEFAULT 0,
    unlimited_quota BOOLEAN DEFAULT false,
    model_limits_enabled BOOLEAN DEFAULT false,
    model_limits TEXT,
    allow_ips TEXT DEFAULT '',
    used_quota BIGINT DEFAULT 0,
    "group" TEXT DEFAULT '',
    cross_group_retry BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_tokens_key ON tokens ("key");
CREATE INDEX idx_tokens_user_id ON tokens (user_id);
CREATE INDEX idx_tokens_name ON tokens (name);
CREATE INDEX idx_tokens_deleted_at ON tokens (deleted_at);

CREATE TABLE users (
    id VARCHAR(32) PRIMARY KEY,
    username TEXT,
    workos_id TEXT NOT NULL,
    workos_organization_id TEXT DEFAULT '',
    workos_authentication_method TEXT DEFAULT '',
    display_name TEXT,
    role BIGINT DEFAULT 1,
    status BIGINT DEFAULT 1,
    email TEXT,
    access_token CHAR(32),
    quota BIGINT DEFAULT 0,
    used_quota BIGINT DEFAULT 0,
    request_count BIGINT DEFAULT 0,
    "group" VARCHAR(64) DEFAULT 'default',
    aff_code VARCHAR(32),
    aff_count BIGINT DEFAULT 0,
    aff_quota BIGINT DEFAULT 0,
    aff_history BIGINT DEFAULT 0,
    inviter_id VARCHAR(32),
    deleted_at TIMESTAMPTZ,
    setting TEXT,
    remark VARCHAR(255),
    stripe_customer VARCHAR(64),
    created_at BIGINT DEFAULT 0,
    last_login_at BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_workos_id ON users (workos_id);
CREATE INDEX idx_users_workos_organization_id ON users (workos_organization_id);
CREATE INDEX idx_users_display_name ON users (display_name);
CREATE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_access_token ON users (access_token);
CREATE UNIQUE INDEX idx_users_aff_code ON users (aff_code);
CREATE INDEX idx_users_inviter_id ON users (inviter_id);
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
CREATE INDEX idx_users_stripe_customer ON users (stripe_customer);

CREATE TABLE messages (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(64) DEFAULT '',
    source_type VARCHAR(64) DEFAULT '',
    source_id VARCHAR(128) DEFAULT '',
    delivery_channel VARCHAR(32) DEFAULT '',
    delivery_status VARCHAR(32) DEFAULT 'pending',
    email_to VARCHAR(255) DEFAULT '',
    metadata TEXT DEFAULT '{}',
    created_at BIGINT NOT NULL,
    read_at BIGINT DEFAULT 0
);

CREATE INDEX idx_messages_user_created_at ON messages (user_id, created_at);
CREATE INDEX idx_messages_user_read_at ON messages (user_id, read_at);
CREATE INDEX idx_messages_notification_type ON messages (notification_type);

CREATE TABLE broadcasts (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    audience_type VARCHAR(32) NOT NULL CHECK (audience_type IN ('selected', 'all_users', 'users_and_guests')),
    audience TEXT NOT NULL DEFAULT '{}',
    email_enabled BOOLEAN DEFAULT false,
    status VARCHAR(32) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent')),
    created_by VARCHAR(32) NOT NULL REFERENCES users(id),
    recipient_count INT DEFAULT 0,
    email_sent_count INT DEFAULT 0,
    email_failed_count INT DEFAULT 0,
    created_at BIGINT NOT NULL,
    sent_at BIGINT NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_broadcasts_sent_at ON broadcasts (sent_at);
CREATE INDEX idx_broadcasts_audience_status ON broadcasts (audience_type, status);
CREATE INDEX idx_broadcasts_created_by ON broadcasts (created_by);
CREATE INDEX idx_broadcasts_deleted_at ON broadcasts (deleted_at);

CREATE TABLE broadcast_read_receipts (
    id VARCHAR(32) PRIMARY KEY,
    broadcast_id VARCHAR(32) NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    user_id VARCHAR(32) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at BIGINT NOT NULL,
    UNIQUE (broadcast_id, user_id)
);

CREATE INDEX idx_broadcast_read_receipts_user ON broadcast_read_receipts (user_id, read_at);

CREATE TABLE options (
    "key" VARCHAR(191) PRIMARY KEY,
    value TEXT
);

CREATE TABLE redemptions (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32),
    "key" VARCHAR(24),
    status BIGINT DEFAULT 1,
    name TEXT,
    quota BIGINT DEFAULT 100,
    created_time BIGINT,
    redeemed_time BIGINT,
    used_user_id VARCHAR(32),
    deleted_at TIMESTAMPTZ,
    expired_time BIGINT
);

CREATE UNIQUE INDEX idx_redemptions_key ON redemptions ("key");
CREATE INDEX idx_redemptions_name ON redemptions (name);
CREATE INDEX idx_redemptions_deleted_at ON redemptions (deleted_at);

CREATE TABLE abilities (
    "group" VARCHAR(64) NOT NULL,
    model VARCHAR(255) NOT NULL,
    channel_id VARCHAR(32) NOT NULL,
    enabled BOOLEAN DEFAULT false,
    priority BIGINT DEFAULT 0,
    weight BIGINT DEFAULT 0,
    tag TEXT,
    PRIMARY KEY ("group", model, channel_id)
);

CREATE INDEX idx_abilities_channel_id ON abilities (channel_id);
CREATE INDEX idx_abilities_priority ON abilities (priority);
CREATE INDEX idx_abilities_weight ON abilities (weight);
CREATE INDEX idx_abilities_tag ON abilities (tag);

CREATE TABLE audit_logs (
    id VARCHAR(32) PRIMARY KEY,
    created_at BIGINT NOT NULL,
    type BIGINT NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'audit' CHECK (category = 'audit'),
    event VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'info',
    result VARCHAR(32) NOT NULL DEFAULT 'success',
    user_id VARCHAR(32) NOT NULL DEFAULT '',
    actor_user_id VARCHAR(32) NOT NULL DEFAULT '',
    content TEXT,
    username TEXT DEFAULT '',
    token_name TEXT DEFAULT '',
    model_name TEXT DEFAULT '',
    quota BIGINT DEFAULT 0,
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    use_time BIGINT DEFAULT 0,
    is_stream BOOLEAN DEFAULT false,
    channel_id VARCHAR(32) DEFAULT '',
    token_id VARCHAR(32) DEFAULT '',
    group_name TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    request_id VARCHAR(64) DEFAULT '',
    resource_type VARCHAR(64) DEFAULT '',
    resource_id VARCHAR(128) DEFAULT '',
    node_name VARCHAR(128) DEFAULT '',
    other TEXT DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_user_created_at ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at);
CREATE INDEX idx_audit_logs_event_created_at ON audit_logs (event, created_at);
CREATE INDEX idx_audit_logs_request_id ON audit_logs (request_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_prevent_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER audit_logs_prevent_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TABLE credit_grants (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    source_type VARCHAR(64) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    remaining_amount BIGINT NOT NULL CHECK (remaining_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    effective_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    created_by VARCHAR(32) NOT NULL DEFAULT '',
    request_id VARCHAR(64) NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    CHECK (remaining_amount <= amount),
    CHECK (status IN ('active', 'consumed', 'revoked', 'expired'))
);

CREATE UNIQUE INDEX idx_credit_grants_source ON credit_grants (source_type, source_id);
CREATE INDEX idx_credit_grants_user_status ON credit_grants (user_id, status, remaining_amount);
CREATE INDEX idx_credit_grants_fifo ON credit_grants (user_id, status, expires_at, effective_at, id);
CREATE INDEX idx_credit_grants_request_id ON credit_grants (request_id);

CREATE TABLE credit_ledger_entries (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    grant_id VARCHAR(32) REFERENCES credit_grants(id),
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('grant', 'consume', 'refund', 'adjustment', 'reversal', 'expire')),
    amount_delta BIGINT NOT NULL CHECK (amount_delta <> 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    request_id VARCHAR(64) NOT NULL DEFAULT '',
    source_type VARCHAR(64) NOT NULL,
    source_id VARCHAR(128) NOT NULL,
    actor_user_id VARCHAR(32) NOT NULL DEFAULT '',
    reason TEXT,
    created_at BIGINT NOT NULL,
    reversal_of_id VARCHAR(32) REFERENCES credit_ledger_entries(id),
    metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_credit_ledger_user_created_at ON credit_ledger_entries (user_id, created_at);
CREATE INDEX idx_credit_ledger_grant_id ON credit_ledger_entries (grant_id);
CREATE INDEX idx_credit_ledger_request_id ON credit_ledger_entries (request_id);
CREATE INDEX idx_credit_ledger_source ON credit_ledger_entries (source_type, source_id);
CREATE INDEX idx_credit_ledger_actor_created_at ON credit_ledger_entries (actor_user_id, created_at);

CREATE TRIGGER credit_ledger_entries_prevent_update
BEFORE UPDATE ON credit_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TRIGGER credit_ledger_entries_prevent_delete
BEFORE DELETE ON credit_ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();

CREATE TABLE midjourneys (
    id VARCHAR(32) PRIMARY KEY,
    code BIGINT,
    user_id VARCHAR(32),
    action VARCHAR(40),
    mj_id TEXT,
    prompt TEXT,
    prompt_en TEXT,
    description TEXT,
    state TEXT,
    submit_time BIGINT,
    start_time BIGINT,
    finish_time BIGINT,
    image_url TEXT,
    video_url TEXT,
    video_urls TEXT,
    status VARCHAR(20),
    progress VARCHAR(30),
    fail_reason TEXT,
    channel_id VARCHAR(32),
    quota BIGINT,
    buttons TEXT,
    properties TEXT
);

CREATE INDEX idx_midjourneys_user_id ON midjourneys (user_id);
CREATE INDEX idx_midjourneys_action ON midjourneys (action);
CREATE INDEX idx_midjourneys_mj_id ON midjourneys (mj_id);
CREATE INDEX idx_midjourneys_submit_time ON midjourneys (submit_time);
CREATE INDEX idx_midjourneys_start_time ON midjourneys (start_time);
CREATE INDEX idx_midjourneys_finish_time ON midjourneys (finish_time);
CREATE INDEX idx_midjourneys_status ON midjourneys (status);
CREATE INDEX idx_midjourneys_progress ON midjourneys (progress);

CREATE TABLE top_ups (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32),
    amount BIGINT,
    money DOUBLE PRECISION,
    trade_no VARCHAR(255),
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50) DEFAULT '',
    create_time BIGINT,
    complete_time BIGINT,
    status TEXT
);

CREATE UNIQUE INDEX idx_top_ups_trade_no ON top_ups (trade_no);
CREATE INDEX idx_top_ups_user_id ON top_ups (user_id);

CREATE TABLE tasks (
    id VARCHAR(32) PRIMARY KEY,
    created_at BIGINT,
    updated_at BIGINT,
    task_id VARCHAR(191),
    platform VARCHAR(30),
    user_id VARCHAR(32),
    "group" VARCHAR(50),
    channel_id VARCHAR(32),
    quota BIGINT,
    action VARCHAR(40),
    status VARCHAR(20),
    fail_reason TEXT,
    submit_time BIGINT,
    start_time BIGINT,
    finish_time BIGINT,
    progress VARCHAR(20),
    properties JSONB,
    private_data JSONB,
    data JSONB
);

CREATE INDEX idx_tasks_created_at ON tasks (created_at);
CREATE INDEX idx_tasks_task_id ON tasks (task_id);
CREATE INDEX idx_tasks_platform ON tasks (platform);
CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_channel_id ON tasks (channel_id);
CREATE INDEX idx_tasks_action ON tasks (action);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_submit_time ON tasks (submit_time);
CREATE INDEX idx_tasks_start_time ON tasks (start_time);
CREATE INDEX idx_tasks_finish_time ON tasks (finish_time);
CREATE INDEX idx_tasks_progress ON tasks (progress);

CREATE TABLE models (
    id VARCHAR(32) PRIMARY KEY,
    model_name VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(128),
    tags VARCHAR(255),
    vendor_id VARCHAR(32),
    endpoints TEXT,
    status BIGINT DEFAULT 1,
    sync_official BIGINT DEFAULT 1,
    created_time BIGINT,
    updated_time BIGINT,
    deleted_at TIMESTAMPTZ,
    name_rule BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX uk_model_name_delete_at ON models (model_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_models_vendor_id ON models (vendor_id);
CREATE INDEX idx_models_deleted_at ON models (deleted_at);

CREATE TABLE vendors (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(128),
    status BIGINT DEFAULT 1,
    created_time BIGINT,
    updated_time BIGINT,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_vendor_name_delete_at ON vendors (name) WHERE deleted_at IS NULL;
CREATE INDEX idx_vendors_deleted_at ON vendors (deleted_at);

CREATE TABLE prefill_groups (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    items JSONB,
    description VARCHAR(255),
    created_time BIGINT,
    updated_time BIGINT,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uk_prefill_name ON prefill_groups (name) WHERE deleted_at IS NULL;
CREATE INDEX idx_prefill_groups_type ON prefill_groups (type);
CREATE INDEX idx_prefill_groups_deleted_at ON prefill_groups (deleted_at);

CREATE TABLE setups (
    id VARCHAR(32) PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    initialized_at BIGINT NOT NULL
);

CREATE TABLE checkins (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    checkin_date VARCHAR(10) NOT NULL,
    quota_awarded BIGINT NOT NULL,
    created_at BIGINT
);

CREATE UNIQUE INDEX idx_user_checkin_date ON checkins (user_id, checkin_date);

CREATE TABLE subscription_orders (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32),
    plan_id VARCHAR(32),
    money DOUBLE PRECISION,
    trade_no VARCHAR(255),
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50) DEFAULT '',
    status TEXT,
    create_time BIGINT,
    complete_time BIGINT,
    provider_payload TEXT
);

CREATE UNIQUE INDEX idx_subscription_orders_trade_no ON subscription_orders (trade_no);
CREATE INDEX idx_subscription_orders_user_id ON subscription_orders (user_id);
CREATE INDEX idx_subscription_orders_plan_id ON subscription_orders (plan_id);

CREATE TABLE user_subscriptions (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(32),
    plan_id VARCHAR(32),
    amount_total BIGINT NOT NULL DEFAULT 0,
    amount_used BIGINT NOT NULL DEFAULT 0,
    start_time BIGINT,
    end_time BIGINT,
    status VARCHAR(32),
    source VARCHAR(32) DEFAULT 'order',
    last_reset_time BIGINT DEFAULT 0,
    next_reset_time BIGINT DEFAULT 0,
    upgrade_group VARCHAR(64) DEFAULT '',
    prev_user_group VARCHAR(64) DEFAULT '',
    created_at BIGINT,
    updated_at BIGINT
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions (plan_id);
CREATE INDEX idx_user_subscriptions_end_time ON user_subscriptions (end_time);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions (status);
CREATE INDEX idx_user_subscriptions_next_reset_time ON user_subscriptions (next_reset_time);
CREATE INDEX idx_user_sub_active ON user_subscriptions (user_id, status, end_time);

CREATE TABLE subscription_pre_consume_records (
    id VARCHAR(32) PRIMARY KEY,
    request_id VARCHAR(64),
    user_id VARCHAR(32),
    user_subscription_id VARCHAR(32),
    pre_consumed BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32),
    created_at BIGINT,
    updated_at BIGINT
);

CREATE UNIQUE INDEX idx_subscription_pre_consume_records_request_id ON subscription_pre_consume_records (request_id);
CREATE INDEX idx_subscription_pre_consume_records_user_id ON subscription_pre_consume_records (user_id);
CREATE INDEX idx_subscription_pre_consume_records_user_subscription_id ON subscription_pre_consume_records (user_subscription_id);
CREATE INDEX idx_subscription_pre_consume_records_status ON subscription_pre_consume_records (status);
CREATE INDEX idx_subscription_pre_consume_records_updated_at ON subscription_pre_consume_records (updated_at);

CREATE TABLE perf_metrics (
    id VARCHAR(32) PRIMARY KEY,
    model_name VARCHAR(128),
    "group" VARCHAR(64),
    bucket_ts BIGINT,
    request_count BIGINT DEFAULT 0,
    success_count BIGINT DEFAULT 0,
    total_latency_ms BIGINT DEFAULT 0,
    ttft_sum_ms BIGINT DEFAULT 0,
    ttft_count BIGINT DEFAULT 0,
    output_tokens BIGINT DEFAULT 0,
    generation_ms BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX idx_perf_model_group_bucket ON perf_metrics (model_name, "group", bucket_ts);
CREATE INDEX idx_perf_bucket_ts ON perf_metrics (bucket_ts);

CREATE TABLE subscription_plans (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    subtitle VARCHAR(255) DEFAULT '',
    price_amount NUMERIC(10,6) NOT NULL DEFAULT 0,
    duration_unit VARCHAR(16) NOT NULL DEFAULT 'month',
    duration_value BIGINT NOT NULL DEFAULT 1,
    custom_seconds BIGINT NOT NULL DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    sort_order BIGINT DEFAULT 0,
    stripe_price_id VARCHAR(128) DEFAULT '',
    creem_product_id VARCHAR(128) DEFAULT '',
    max_purchase_per_user BIGINT DEFAULT 0,
    upgrade_group VARCHAR(64) DEFAULT '',
    total_amount BIGINT NOT NULL DEFAULT 0,
    quota_reset_period VARCHAR(16) DEFAULT 'never',
    quota_reset_custom_seconds BIGINT DEFAULT 0,
    created_at BIGINT,
    updated_at BIGINT
);
