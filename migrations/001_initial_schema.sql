CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
    username TEXT,
    password TEXT NOT NULL,
    display_name TEXT,
    role BIGINT DEFAULT 1,
    status BIGINT DEFAULT 1,
    email TEXT,
    github_id TEXT,
    discord_id TEXT,
    oidc_id TEXT,
    wechat_id TEXT,
    telegram_id TEXT,
    access_token CHAR(32),
    quota BIGINT DEFAULT 0,
    used_quota BIGINT DEFAULT 0,
    request_count BIGINT DEFAULT 0,
    "group" VARCHAR(64) DEFAULT 'default',
    aff_code VARCHAR(32),
    aff_count BIGINT DEFAULT 0,
    aff_quota BIGINT DEFAULT 0,
    aff_history BIGINT DEFAULT 0,
    inviter_id BIGINT,
    deleted_at TIMESTAMPTZ,
    linux_do_id TEXT,
    setting TEXT,
    remark VARCHAR(255),
    stripe_customer VARCHAR(64),
    created_at BIGINT DEFAULT 0,
    last_login_at BIGINT DEFAULT 0
);

CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_display_name ON users (display_name);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_github_id ON users (github_id);
CREATE INDEX idx_users_discord_id ON users (discord_id);
CREATE INDEX idx_users_oidc_id ON users (oidc_id);
CREATE INDEX idx_users_wechat_id ON users (wechat_id);
CREATE INDEX idx_users_telegram_id ON users (telegram_id);
CREATE UNIQUE INDEX idx_users_access_token ON users (access_token);
CREATE UNIQUE INDEX idx_users_aff_code ON users (aff_code);
CREATE INDEX idx_users_inviter_id ON users (inviter_id);
CREATE INDEX idx_users_deleted_at ON users (deleted_at);
CREATE INDEX idx_users_linux_do_id ON users (linux_do_id);
CREATE INDEX idx_users_stripe_customer ON users (stripe_customer);

CREATE TABLE passkey_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    credential_id VARCHAR(512) NOT NULL,
    public_key TEXT NOT NULL,
    attestation_type VARCHAR(255),
    aaguid VARCHAR(512),
    sign_count BIGINT DEFAULT 0,
    clone_warning BOOLEAN DEFAULT false,
    user_present BOOLEAN DEFAULT false,
    user_verified BOOLEAN DEFAULT false,
    backup_eligible BOOLEAN DEFAULT false,
    backup_state BOOLEAN DEFAULT false,
    transports TEXT,
    attachment VARCHAR(32),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_passkey_credentials_user_id ON passkey_credentials (user_id);
CREATE UNIQUE INDEX idx_passkey_credentials_credential_id ON passkey_credentials (credential_id);
CREATE INDEX idx_passkey_credentials_deleted_at ON passkey_credentials (deleted_at);

CREATE TABLE options (
    "key" VARCHAR(191) PRIMARY KEY,
    value TEXT
);

CREATE TABLE redemptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    "key" CHAR(32),
    status BIGINT DEFAULT 1,
    name TEXT,
    quota BIGINT DEFAULT 100,
    created_time BIGINT,
    redeemed_time BIGINT,
    used_user_id BIGINT,
    deleted_at TIMESTAMPTZ,
    expired_time BIGINT
);

CREATE UNIQUE INDEX idx_redemptions_key ON redemptions ("key");
CREATE INDEX idx_redemptions_name ON redemptions (name);
CREATE INDEX idx_redemptions_deleted_at ON redemptions (deleted_at);

CREATE TABLE abilities (
    "group" VARCHAR(64) NOT NULL,
    model VARCHAR(255) NOT NULL,
    channel_id BIGINT NOT NULL,
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

CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    created_at BIGINT,
    type BIGINT,
    content TEXT,
    username TEXT DEFAULT '',
    token_name TEXT DEFAULT '',
    model_name TEXT DEFAULT '',
    quota BIGINT DEFAULT 0,
    prompt_tokens BIGINT DEFAULT 0,
    completion_tokens BIGINT DEFAULT 0,
    use_time BIGINT DEFAULT 0,
    is_stream BOOLEAN DEFAULT false,
    channel_id BIGINT,
    token_id BIGINT DEFAULT 0,
    "group" TEXT,
    ip TEXT DEFAULT '',
    request_id VARCHAR(64) DEFAULT '',
    other TEXT
);

CREATE INDEX idx_logs_user_id ON logs (user_id);
CREATE INDEX idx_logs_username ON logs (username);
CREATE INDEX idx_logs_token_name ON logs (token_name);
CREATE INDEX idx_logs_model_name ON logs (model_name);
CREATE INDEX idx_logs_channel_id ON logs (channel_id);
CREATE INDEX idx_logs_token_id ON logs (token_id);
CREATE INDEX idx_logs_group ON logs ("group");
CREATE INDEX idx_logs_ip ON logs (ip);
CREATE INDEX idx_logs_request_id ON logs (request_id);
CREATE INDEX idx_created_at_id ON logs (id, created_at);
CREATE INDEX idx_user_id_id ON logs (user_id, id);
CREATE INDEX idx_created_at_type ON logs (created_at, type);
CREATE INDEX index_username_model_name ON logs (model_name, username);

CREATE TABLE midjourneys (
    id BIGSERIAL PRIMARY KEY,
    code BIGINT,
    user_id BIGINT,
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
    channel_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
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

CREATE TABLE quota_data (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    username VARCHAR(64) DEFAULT '',
    model_name VARCHAR(64) DEFAULT '',
    created_at BIGINT,
    token_used BIGINT DEFAULT 0,
    count BIGINT DEFAULT 0,
    quota BIGINT DEFAULT 0
);

CREATE INDEX idx_quota_data_user_id ON quota_data (user_id);
CREATE INDEX idx_qdt_model_user_name ON quota_data (model_name, username);
CREATE INDEX idx_qdt_created_at ON quota_data (created_at);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    created_at BIGINT,
    updated_at BIGINT,
    task_id VARCHAR(191),
    platform VARCHAR(30),
    user_id BIGINT,
    "group" VARCHAR(50),
    channel_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(128),
    tags VARCHAR(255),
    vendor_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    initialized_at BIGINT NOT NULL
);

CREATE TABLE two_fas (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    failed_attempts BIGINT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_two_fas_user_id ON two_fas (user_id);
CREATE INDEX idx_two_fas_deleted_at ON two_fas (deleted_at);

CREATE TABLE two_fa_backup_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_two_fa_backup_codes_user_id ON two_fa_backup_codes (user_id);
CREATE INDEX idx_two_fa_backup_codes_deleted_at ON two_fa_backup_codes (deleted_at);

CREATE TABLE checkins (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    checkin_date VARCHAR(10) NOT NULL,
    quota_awarded BIGINT NOT NULL,
    created_at BIGINT
);

CREATE UNIQUE INDEX idx_user_checkin_date ON checkins (user_id, checkin_date);

CREATE TABLE subscription_orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    plan_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    plan_id BIGINT,
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
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(64),
    user_id BIGINT,
    user_subscription_id BIGINT,
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

CREATE TABLE custom_oauth_providers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    icon VARCHAR(128) DEFAULT '',
    enabled BOOLEAN DEFAULT false,
    client_id VARCHAR(256),
    client_secret VARCHAR(512),
    authorization_endpoint VARCHAR(512),
    token_endpoint VARCHAR(512),
    user_info_endpoint VARCHAR(512),
    scopes VARCHAR(256) DEFAULT 'openid profile email',
    user_id_field VARCHAR(128) DEFAULT 'sub',
    username_field VARCHAR(128) DEFAULT 'preferred_username',
    display_name_field VARCHAR(128) DEFAULT 'name',
    email_field VARCHAR(128) DEFAULT 'email',
    well_known VARCHAR(512),
    auth_style BIGINT DEFAULT 0,
    access_policy TEXT,
    access_denied_message VARCHAR(512),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_custom_oauth_providers_slug ON custom_oauth_providers (slug);

CREATE TABLE user_oauth_bindings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    provider_user_id VARCHAR(256) NOT NULL,
    created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX ux_user_provider ON user_oauth_bindings (user_id, provider_id);
CREATE UNIQUE INDEX ux_provider_userid ON user_oauth_bindings (provider_id, provider_user_id);

CREATE TABLE perf_metrics (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    subtitle VARCHAR(255) DEFAULT '',
    price_amount NUMERIC(10,6) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
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
