import {
  type GraphQLObject,
  type GraphQLOperationField,
  graphqlMutation,
  graphqlOperation,
  graphqlQuery,
  unwrapApiData,
} from "@/lib/api/graphql";
import {
  creditsToMoney,
  type DisplayContext,
  toBool,
  toDate,
  toNumber,
  toText,
} from "@/lib/console/format";
import type {
  ActiveSubscription,
  ChatClient,
  ConsoleStatus,
  ConsoleUser,
  InboxItem,
  InvoiceRecord,
  LogEntry,
  PageInfo,
  PricingModel,
  SubscriptionPlan,
  SubscriptionState,
  Token,
  TopupInfo,
  UserGroup,
} from "@/lib/console/types";

const DEFAULT_PAGE_SIZE = 20;

export const CHAT_CLIENTS: ChatClient[] = [
  {
    id: "opencat",
    name: "OpenCat",
    description: "Native chat client for macOS and iOS.",
    template: "opencat://config?host={address}&apiKey={key}",
  },
  {
    id: "chatbox",
    name: "Chatbox",
    description: "Desktop client for model testing and writing.",
    template: "chatbox://config?apiHost={address}&apiKey={key}",
  },
  {
    id: "lobechat",
    name: "LobeChat",
    description: "Chat-driven workspace for research and writing.",
    template:
      "https://chat-preview.lobehub.com/?provider=openai&baseURL={address}&apiKey={key}",
  },
];

export async function loadConsoleLayoutData() {
  const data = await graphqlQuery<{
    status: unknown;
    self: unknown;
    unread: unknown;
  }>([
    { operation: "status" },
    { operation: "self" },
    { operation: "inboxUnreadCount", alias: "unread" },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    unread: toNumber(asRecord(unwrapApiData(data.unread, {})).count),
  };
}

export async function loadDashboardData() {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 7 * 86_400;
  const data = await graphqlQuery<{
    status: unknown;
    self: unknown;
    quotaDates: unknown;
    logsStat: unknown;
    logs: unknown;
    uptime: unknown;
  }>([
    { operation: "status" },
    { operation: "self" },
    {
      operation: "quotaDatesSelf",
      alias: "quotaDates",
      params: { start_timestamp: start, end_timestamp: now },
    },
    {
      operation: "logsSelfStat",
      alias: "logsStat",
      params: { start_timestamp: start, end_timestamp: now },
    },
    {
      operation: "userLogs",
      alias: "logs",
      params: { p: 1, page_size: 10, category: "usage" },
    },
    { operation: "uptimeStatus", alias: "uptime" },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  const quotaDates = asArray(unwrapApiData(data.quotaDates, []));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    stat: asRecord(unwrapApiData(data.logsStat, {})),
    usageSeries: normalizeUsageSeries(quotaDates, status),
    modelUsage: normalizeModelUsage(quotaDates, status),
    logs: normalizePageInfo<LogEntry>(data.logs, (item) =>
      normalizeLog(item, status),
    ),
    uptime: normalizeUptime(unwrapApiData(data.uptime, [])),
  };
}

export async function loadTokenList(params: GraphQLObject = {}) {
  const fields: GraphQLOperationField[] = [
    {
      operation: params.keyword || params.token ? "searchTokens" : "tokens",
      alias: "tokens",
      params: { p: 1, page_size: DEFAULT_PAGE_SIZE, ...params },
    },
    { operation: "self" },
    { operation: "status" },
  ];
  const data = await graphqlQuery<{
    tokens: unknown;
    self: unknown;
    status: unknown;
  }>(fields);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    tokens: normalizePageInfo<Token>(data.tokens, (item) =>
      normalizeToken(item, status),
    ),
  };
}

export async function loadTokenEditor(id?: string) {
  const fields: GraphQLOperationField[] = [
    { operation: "selfGroups", alias: "groups" },
    { operation: "userModels", alias: "models" },
    { operation: "status" },
  ];
  if (id) fields.push({ operation: "token", params: { id } });
  const data = await graphqlQuery<{
    groups: unknown;
    models: unknown;
    status: unknown;
    token?: unknown;
  }>(fields);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    groups: normalizeGroups(unwrapApiData(data.groups, {})),
    models: asArray(unwrapApiData(data.models, [])).map((item) => toText(item)),
    token: id ? normalizeToken(data.token, status) : null,
  };
}

export async function loadMessages(params: GraphQLObject = {}) {
  const data = await graphqlQuery<{
    inbox: unknown;
    unread: unknown;
  }>([
    {
      operation: "inbox",
      params: { p: 1, page_size: DEFAULT_PAGE_SIZE, ...params },
    },
    { operation: "inboxUnreadCount", alias: "unread" },
  ]);
  return {
    inbox: normalizePageInfo<InboxItem>(data.inbox, normalizeInboxItem),
    unread: toNumber(asRecord(unwrapApiData(data.unread, {})).count),
  };
}

export async function loadLogs(params: GraphQLObject = {}) {
  const data = await graphqlQuery<{
    status: unknown;
    logs: unknown;
  }>([
    { operation: "status" },
    {
      operation: "userLogs",
      alias: "logs",
      params: {
        p: 1,
        page_size: DEFAULT_PAGE_SIZE,
        category: "usage",
        ...params,
      },
    },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return normalizePageInfo<LogEntry>(data.logs, (item) =>
    normalizeLog(item, status),
  );
}

export async function loadPersonalData() {
  const data = await graphqlQuery<{
    status: unknown;
    self: unknown;
    checkin?: unknown;
  }>([
    { operation: "status" },
    { operation: "self" },
    {
      operation: "checkinStatus",
      alias: "checkin",
      params: { month: new Date().toISOString().slice(0, 7) },
    },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    checkin: data.checkin ? unwrapApiData(data.checkin, null) : null,
  };
}

export async function loadPricingCatalog() {
  const data = await graphqlQuery<{ pricing: unknown; status: unknown }>([
    { operation: "status" },
    { operation: "pricing" },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    models: normalizePricingModels(data.pricing),
  };
}

export async function loadPublicContent() {
  const data = await graphqlQuery<{
    status: unknown;
    home: unknown;
    about: unknown;
    broadcasts: unknown;
    userAgreement: unknown;
    privacyPolicy: unknown;
  }>([
    { operation: "status" },
    { operation: "homePageContent", alias: "home" },
    { operation: "about" },
    {
      operation: "publicBroadcasts",
      alias: "broadcasts",
      params: { p: 1, page_size: 20 },
    },
    { operation: "userAgreement" },
    { operation: "privacyPolicy" },
  ]);
  return {
    status: normalizeStatus(unwrapApiData(data.status, {})),
    home: toText(unwrapApiData(data.home, "")),
    about: toText(unwrapApiData(data.about, "")),
    broadcasts: normalizePageInfo(data.broadcasts, normalizeBroadcast),
    userAgreement: toText(unwrapApiData(data.userAgreement, "")),
    privacyPolicy: toText(unwrapApiData(data.privacyPolicy, "")),
  };
}

export async function loadSetupStatus() {
  const data = await graphqlOperation("query", "setup");
  return asRecord(unwrapApiData(data, {}));
}

export async function loadTopupData() {
  const data = await graphqlQuery<{
    status: unknown;
    self: unknown;
    topupInfo: unknown;
    invoices: unknown;
    plans: unknown;
    subscription: unknown;
    affCode: unknown;
  }>([
    { operation: "status" },
    { operation: "self" },
    { operation: "topupInfo" },
    {
      operation: "userTopups",
      alias: "invoices",
      params: { p: 1, page_size: 10 },
    },
    { operation: "subscriptionPlans", alias: "plans" },
    { operation: "subscriptionSelf", alias: "subscription" },
    { operation: "affCode" },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    topupInfo: normalizeTopupInfo(unwrapApiData(data.topupInfo, {})),
    invoices: normalizePageInfo<InvoiceRecord>(data.invoices, (item) =>
      normalizeInvoice(item, status),
    ),
    plans: normalizeSubscriptionPlans(unwrapApiData(data.plans, []), status),
    subscription: normalizeSubscriptionState(
      unwrapApiData(data.subscription, {}),
      status,
    ),
    affCode: toText(unwrapApiData(data.affCode, "")),
  };
}

export async function loadTopupHistory(params: GraphQLObject = {}) {
  const data = await graphqlQuery<{
    status: unknown;
    invoices: unknown;
  }>([
    { operation: "status" },
    {
      operation: "userTopups",
      alias: "invoices",
      params: { p: 1, page_size: DEFAULT_PAGE_SIZE, ...params },
    },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    invoices: normalizePageInfo<InvoiceRecord>(data.invoices, (item) =>
      normalizeInvoice(item, status),
    ),
  };
}

export async function loadGlobalSearchResults(keyword: string) {
  const query = keyword.trim();
  if (!query) return { models: [], requests: [], invoices: [], tokens: [] };
  const data = await graphqlQuery<{
    status: unknown;
    pricing: unknown;
    logs: unknown;
    invoices: unknown;
    tokens: unknown;
  }>([
    { operation: "status" },
    { operation: "pricing" },
    {
      operation: "userLogs",
      alias: "logs",
      params: { p: 1, page_size: 6, request_id: query },
    },
    {
      operation: "userTopups",
      alias: "invoices",
      params: { p: 1, page_size: 6, keyword: query },
    },
    {
      operation: "searchTokens",
      alias: "tokens",
      params: { p: 1, page_size: 6, keyword: query },
    },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  const lower = query.toLowerCase();
  return {
    models: normalizePricingModels(data.pricing)
      .filter((model) =>
        [model.id, model.vendor, model.desc, ...model.tags]
          .join(" ")
          .toLowerCase()
          .includes(lower),
      )
      .slice(0, 6),
    requests: normalizePageInfo<LogEntry>(data.logs, (item) =>
      normalizeLog(item, status),
    ).items,
    invoices: normalizePageInfo<InvoiceRecord>(data.invoices, (item) =>
      normalizeInvoice(item, status),
    ).items,
    tokens: normalizePageInfo<Token>(data.tokens, (item) =>
      normalizeToken(item, status),
    ).items,
  };
}

export async function loadPlaygroundData() {
  const data = await graphqlQuery<{
    status: unknown;
    self: unknown;
    groups: unknown;
    models: unknown;
  }>([
    { operation: "status" },
    { operation: "self" },
    { operation: "selfGroups", alias: "groups" },
    { operation: "userModels", alias: "models" },
  ]);
  const status = normalizeStatus(unwrapApiData(data.status, {}));
  return {
    status,
    user: normalizeUser(unwrapApiData(data.self, {}), status),
    groups: normalizeGroups(unwrapApiData(data.groups, {})),
    models: asArray(unwrapApiData(data.models, [])).map((item) => toText(item)),
  };
}

export async function loadChatPickerData() {
  const { status, tokens } = await loadTokenList({ p: 1, page_size: 10 });
  return {
    status,
    clients: chatClientsForStatus(status),
    tokens,
  };
}

export async function loadChatLaunchData(id: string) {
  const { status, tokens } = await loadTokenList({ p: 1, page_size: 10 });
  const clients = chatClientsForStatus(status);
  const client = clients.find((item) => item.id === id);
  const activeToken = tokens.items.find((token) => token.status === 1);
  if (!client || !activeToken) {
    return { status, clients, client, activeToken, url: "" };
  }
  const key = await requestTokenKey(activeToken.id);
  return {
    status,
    clients,
    client,
    activeToken,
    url: buildChatClientUrl(client.template, status.serverAddress, key),
  };
}

export function buildChatClientUrl(
  template: string,
  serverAddress: string,
  key: string,
): string {
  const address = serverAddress || "https://api.flint.dev";
  const apiKey = key.startsWith("sk-") ? key : `sk-${key}`;
  const encodedAddress = encodeURIComponent(address);
  const encodedConfig = (value: Record<string, string>) =>
    encodeURIComponent(Buffer.from(JSON.stringify(value)).toString("base64"));
  if (template.includes("{cherryConfig}")) {
    return template.replaceAll(
      "{cherryConfig}",
      encodedConfig({ id: "new-api", baseUrl: address, apiKey }),
    );
  }
  if (template.includes("{aionuiConfig}")) {
    return template.replaceAll(
      "{aionuiConfig}",
      encodedConfig({ platform: "new-api", baseUrl: address, apiKey }),
    );
  }
  if (template.includes("{deepchatConfig}")) {
    return template.replaceAll(
      "{deepchatConfig}",
      encodedConfig({ id: "new-api", baseUrl: address, apiKey }),
    );
  }
  return template
    .replaceAll("{address}", encodedAddress)
    .replaceAll("{key}", apiKey);
}

export function normalizeStatus(value: unknown): ConsoleStatus {
  const item = asRecord(value);
  const apiInfo = asArray(item.api_info).map((entry) => {
    const api = asRecord(entry);
    return {
      label: toText(api.route || api.label || api.description || "API"),
      url: toText(api.url),
    };
  });
  const faq = asArray(item.faq).map((entry) => {
    const row = asRecord(entry);
    return {
      q: toText(row.question || row.q),
      a: toText(row.answer || row.a),
    };
  });
  const chats = normalizeChatClients(item.chats);
  return {
    siteCreditsPerPriceUnit: toNumber(
      item.site_credits_per_price_unit,
      1_000_000,
    ),
    currencySymbol: toText(item.currency_symbol, "$"),
    quotaDisplayType: toText(item.quota_display_type, "USD"),
    systemName: toText(item.system_name, "Flint"),
    serverAddress: toText(item.server_address, ""),
    docsLink: toText(item.docs_link, "https://docs.flint.dev"),
    setup: toBool(item.setup),
    checkinEnabled: toBool(item.checkin_enabled),
    apiInfoEnabled: toBool(item.api_info_enabled, true),
    faqEnabled: toBool(item.faq_enabled, true),
    apiInfo,
    faq,
    chats,
  };
}

export function normalizeUser(
  value: unknown,
  context: DisplayContext = {},
): ConsoleUser {
  const item = asRecord(value);
  const setting = parseMaybeJson(asRecord(item.setting));
  const role = toNumber(item.role, 1);
  return {
    id: toText(item.id),
    username: toText(item.username),
    displayName: toText(
      item.display_name || item.username || item.email,
      "User",
    ),
    email: toText(item.email),
    workosId: toText(item.workos_id),
    workosOrganizationId: toText(item.workos_organization_id),
    authMethod: toText(item.workos_authentication_method, "WorkOS"),
    role,
    roleLabel: role >= 100 ? "root" : role >= 10 ? "admin" : "user",
    group: toText(item.group, "default"),
    balance: creditsToMoney(item.quota, context),
    used: creditsToMoney(item.used_quota, context),
    requestCount: toNumber(item.request_count),
    language: toText(setting.language, "en"),
    quotaWarningThreshold: creditsToMoney(
      setting.quota_warning_threshold,
      context,
    ),
    upstreamModelUpdateNotifyEnabled: toBool(
      setting.upstream_model_update_notify_enabled,
      true,
    ),
    acceptUnsetModelPriceModel: toBool(setting.accept_unset_price_model),
    recordIpLog: toBool(setting.record_ip_log, true),
    accessToken: toText(item.access_token || item.app_access_token),
    affCode: toText(item.aff_code),
    affCount: toNumber(item.aff_count),
    affQuota: creditsToMoney(item.aff_quota, context),
    affHistoryQuota: creditsToMoney(item.aff_history_quota, context),
  };
}

export function normalizeToken(
  value: unknown,
  context: DisplayContext = {},
): Token {
  const item = asRecord(unwrapApiData(value, value));
  const allowIps = item.allow_ips;
  const modelLimits = parseModelLimits(item.model_limits);
  return {
    id: toText(item.id),
    name: toText(item.name, "untitled"),
    status: toNumber(item.status, 1),
    group: toText(item.group, "default"),
    crossGroupRetry: toBool(item.cross_group_retry),
    expiredAt: toNumber(item.expired_time, -1),
    createdAt: toNumber(item.created_time),
    remainAmount: creditsToMoney(item.remain_quota, context),
    remainCredits: toNumber(item.remain_quota),
    unlimitedQuota: toBool(item.unlimited_quota),
    used: creditsToMoney(item.used_quota, context),
    usedCredits: toNumber(item.used_quota),
    lastUsedAt: toNumber(item.accessed_time),
    modelLimits,
    allowIps:
      typeof allowIps === "string"
        ? allowIps
            .split(/\n|,/)
            .map((ip) => ip.trim())
            .filter(Boolean)
        : [],
    keyPreview: toText(item.key, "****"),
  };
}

function normalizeGroups(value: unknown): UserGroup[] {
  const groups = asRecord(value);
  return Object.entries(groups).map(([name, raw]) => {
    const group = asRecord(raw);
    return {
      name,
      ratio: toText(group.ratio, "1"),
      label: toText(group.desc, name),
    };
  });
}

function normalizeChatClients(value: unknown): ChatClient[] {
  return asArray(value)
    .flatMap((entry, index) =>
      Object.entries(asRecord(entry)).map(([name, template]) => {
        const id = slugify(`${index}-${name}`);
        return {
          id,
          name,
          description: `Open ${name} with your configured Flint endpoint.`,
          template: toText(template),
        };
      }),
    )
    .filter((client) => client.name && client.template);
}

function chatClientsForStatus(status: ConsoleStatus): ChatClient[] {
  const clients = status.chats.length ? status.chats : CHAT_CLIENTS;
  return clients.filter((client) => {
    const template = client.template.toLowerCase();
    return !(
      template.startsWith("fluent") ||
      template.startsWith("ccswitch") ||
      template.startsWith("deepchat")
    );
  });
}

function normalizeLog(value: unknown, context: DisplayContext = {}): LogEntry {
  const item = asRecord(value);
  const category = toText(item.category || "usage") as LogEntry["category"];
  const result = toText(item.result);
  const severity = toText(item.severity);
  const status =
    result === "failed" || severity === "error"
      ? "fail"
      : severity === "warning"
        ? "warn"
        : "ok";
  return {
    id: toText(item.id),
    category,
    ts: toNumber(item.created_at),
    tokenName: toText(item.token_name, "unknown"),
    model: toText(item.model_name || item.resource_id || "unknown"),
    group: toText(item.group, "default"),
    endpoint: toText(item.event || item.resource_type || "request"),
    requestId: toText(item.request_id),
    promptTokens: toNumber(item.prompt_tokens),
    completionTokens: toNumber(item.completion_tokens),
    cachedTokens: toNumber(item.cached_tokens),
    cost: creditsToMoney(item.quota, context),
    latencyMs: toNumber(item.use_time),
    channel: toText(item.channel_name || item.channel, "default"),
    status,
    message: toText(item.content || item.other),
    ip: toText(item.ip),
  };
}

function normalizeInboxItem(value: unknown): InboxItem {
  const item = asRecord(value);
  const type = toText(item.item_type || item.type, "message");
  const content = toText(item.content || item.body || item.preview);
  return {
    id: toText(item.id),
    itemType: type === "broadcast" ? "broadcast" : "message",
    title: toText(item.title, "Untitled"),
    preview: toText(item.preview || content).slice(0, 160),
    content,
    createdAt: toNumber(item.created_at || item.sent_at),
    readAt: item.read_at ? toNumber(item.read_at) : null,
  };
}

function normalizePricingModels(value: unknown): PricingModel[] {
  const root = asRecord(value);
  const vendors = new Map(
    asArray(root.vendors).map((vendor) => {
      const item = asRecord(vendor);
      return [toText(item.id), toText(item.name || item.id)];
    }),
  );
  const groupRatio = asRecord(root.group_ratio);
  return asArray(root.data || value).map((entry) => {
    const item = asRecord(entry);
    const groups = asArray(item.enable_groups).map((group) => toText(group));
    const vendorId = toText(item.vendor_id || item.owner_by);
    return {
      id: toText(item.model_name),
      vendor:
        vendors.get(vendorId) || toText(item.owner_by || vendorId, "Other"),
      endpoints: asArray(item.supported_endpoint_types).map((endpoint) =>
        toText(endpoint),
      ),
      context: toNumber(item.context, 0),
      input: toNumber(item.model_price),
      output: toNumber(item.completion_price),
      groups,
      tags: toText(item.tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      desc: toText(item.description),
      ratio: toNumber(groupRatio[groups[0] ?? "default"], 1),
    };
  });
}

function normalizeTopupInfo(value: unknown): TopupInfo {
  const item = asRecord(value);
  const discount = asRecord(item.discount);
  return {
    enableStripeTopup: toBool(item.enable_stripe_topup),
    stripeMinTopup: toNumber(item.stripe_min_topup, 5),
    stripePublishableKey: toText(item.stripe_publishable_key),
    amountOptions: asArray(item.amount_options)
      .map((amount) => toNumber(amount))
      .filter((amount) => amount > 0),
    discount: Object.fromEntries(
      Object.entries(discount).map(([amount, percent]) => [
        amount,
        toNumber(percent),
      ]),
    ),
    topupLink: toText(item.topup_link),
  };
}

function normalizeInvoice(
  value: unknown,
  context: DisplayContext = {},
): InvoiceRecord {
  const item = asRecord(value);
  const status = toText(item.status, "pending");
  const kind = toText(item.kind, "topup");
  return {
    id: toText(item.id || item.invoice_id),
    reference: toText(item.trade_no || item.invoice_number || item.invoice_id),
    type: kind.includes("subscription")
      ? "subscription"
      : kind.includes("redemption")
        ? "redemption"
        : "topup",
    method: toText(item.payment_method || item.payment_provider, "stripe"),
    status:
      status === "succeeded" || status === "success" || status === "paid"
        ? "completed"
        : status === "failed"
          ? "failed"
          : status === "expired"
            ? "expired"
            : "pending",
    ts: toNumber(item.create_time || item.created),
    amount: creditsToMoney(item.amount, context),
    money: toNumber(item.money || item.amount),
    hostedInvoiceUrl: toText(item.hosted_invoice_url),
    invoicePdf: toText(item.invoice_pdf),
    receiptUrl: toText(item.receipt_url),
    invoiceNumber: toText(item.invoice_number),
  };
}

function normalizeSubscriptionPlans(
  value: unknown,
  context: DisplayContext,
): SubscriptionPlan[] {
  return asArray(value).map((entry) => {
    const plan = asRecord(asRecord(entry).plan || entry);
    return {
      id: toText(plan.id),
      title: toText(plan.title),
      subtitle: toText(plan.subtitle),
      price: toNumber(plan.price_amount),
      total: creditsToMoney(plan.total_amount, context),
      reset: toText(plan.quota_reset_period, "never"),
      duration: toText(plan.duration_unit, "month"),
      maxPurchasePerUser: toNumber(plan.max_purchase_per_user),
      upgradeGroup: toText(plan.upgrade_group),
      enabled: toBool(plan.enabled, true),
    };
  });
}

function normalizeSubscriptionState(
  value: unknown,
  context: DisplayContext,
): SubscriptionState {
  const item = asRecord(value);
  return {
    billingPreference: toText(item.billing_preference, "wallet_first"),
    subscriptions: asArray(item.subscriptions).map((entry) =>
      normalizeActiveSubscription(entry, context),
    ),
    allSubscriptions: asArray(item.all_subscriptions).map((entry) =>
      normalizeActiveSubscription(entry, context),
    ),
  };
}

function normalizeActiveSubscription(
  value: unknown,
  context: DisplayContext,
): ActiveSubscription {
  const item = asRecord(value);
  const subscription = asRecord(item.subscription || item);
  return {
    id: toText(subscription.id),
    planId: toText(subscription.plan_id),
    planTitle: toText(item.plan_title || subscription.plan_title),
    total: creditsToMoney(subscription.amount_total, context),
    remaining: creditsToMoney(
      toNumber(subscription.amount_total) - toNumber(subscription.amount_used),
      context,
    ),
    nextRenewalAt: toNumber(
      subscription.next_reset_time || subscription.end_time,
    ),
  };
}

function normalizeUsageSeries(
  entries: unknown[],
  context: DisplayContext,
): { day: string; cost: number; requests: number }[] {
  const byDay = new Map<
    string,
    { day: string; cost: number; requests: number }
  >();
  for (const entry of entries) {
    const item = asRecord(entry);
    const date = toDate(item.created_at);
    const day = date
      ? date.toLocaleDateString("en-US", { weekday: "short" })
      : "n/a";
    const current = byDay.get(day) ?? { day, cost: 0, requests: 0 };
    current.cost += creditsToMoney(item.quota, context);
    current.requests += toNumber(item.count);
    byDay.set(day, current);
  }
  return [...byDay.values()];
}

function normalizeModelUsage(
  entries: unknown[],
  context: DisplayContext,
): { model: string; cost: number; share: number }[] {
  const byModel = new Map<string, number>();
  for (const entry of entries) {
    const item = asRecord(entry);
    const model = toText(item.model_name, "unknown");
    byModel.set(
      model,
      (byModel.get(model) ?? 0) + creditsToMoney(item.quota, context),
    );
  }
  const total = [...byModel.values()].reduce((sum, value) => sum + value, 0);
  return [...byModel.entries()]
    .map(([model, cost]) => ({
      model,
      cost,
      share: total > 0 ? cost / total : 0,
    }))
    .sort((a, b) => b.cost - a.cost);
}

function normalizeUptime(
  value: unknown,
): { name: string; status: string; uptime: number }[] {
  return asArray(value).map((entry) => {
    const item = asRecord(entry);
    return {
      name: toText(item.name || item.monitor_name || "Service"),
      status: toText(item.status, "operational"),
      uptime: toNumber(item.uptime || item.uptime_percentage, 100),
    };
  });
}

function normalizeBroadcast(value: unknown) {
  const item = asRecord(value);
  return {
    id: toText(item.id),
    title: toText(item.title),
    content: toText(item.content),
    sent_at: toNumber(item.sent_at || item.created_at),
  };
}

function normalizePageInfo<T>(
  value: unknown,
  mapper: (item: unknown) => T,
): PageInfo<T> {
  const data = unwrapApiData(value, {});
  const page = asRecord(data);
  return {
    page: toNumber(page.page, 1),
    page_size: toNumber(page.page_size, DEFAULT_PAGE_SIZE),
    total: toNumber(page.total),
    items: asArray(page.items).map(mapper),
  };
}

function parseModelLimits(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => toText(item));
  const text = toText(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => toText(item));
    if (parsed && typeof parsed === "object") return Object.keys(parsed);
  } catch {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (typeof value === "string" && value.trim()) {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return asRecord(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "chat";
}

export async function requestTokenKey(id: string) {
  const payload = await graphqlMutation<{ tokenKey: unknown }>([
    { operation: "tokenKey", input: { id } },
  ]);
  return toText(asRecord(unwrapApiData(payload.tokenKey, {})).key);
}
