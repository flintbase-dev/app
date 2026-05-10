import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Search,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const SYSTEM_NAME = "Flint";
const DOCS_URL = "https://docs.flint.dev";

type Endpoint = "chat" | "messages" | "responses" | "images";
type Group = "default" | "premium" | "fast" | "open";
type Tag =
  | "reasoning"
  | "vision"
  | "fast"
  | "open"
  | "balanced"
  | "cheap"
  | "long-context";

type Model = {
  id: string;
  vendor: string;
  endpoints: Endpoint[];
  context: number; // tokens
  input: number; // USD per million tokens
  output: number; // USD per million tokens
  groups: Group[];
  tags: Tag[];
  desc: string;
  ratio: number; // group ratio multiplier
};

const MODELS: Model[] = [
  {
    id: "claude-opus-4-7",
    vendor: "Anthropic",
    endpoints: ["chat", "messages"],
    context: 200_000,
    input: 15.0,
    output: 75.0,
    groups: ["default", "premium"],
    tags: ["reasoning", "vision"],
    desc: "Most capable Claude model. State-of-the-art reasoning and code.",
    ratio: 1.0,
  },
  {
    id: "claude-sonnet-4-6",
    vendor: "Anthropic",
    endpoints: ["chat", "messages"],
    context: 200_000,
    input: 3.0,
    output: 15.0,
    groups: ["default"],
    tags: ["balanced", "vision"],
    desc: "Balanced cost and capability. Default for production workloads.",
    ratio: 1.0,
  },
  {
    id: "claude-haiku-4-5",
    vendor: "Anthropic",
    endpoints: ["chat", "messages"],
    context: 200_000,
    input: 0.8,
    output: 4.0,
    groups: ["default", "fast"],
    tags: ["fast"],
    desc: "Fastest Claude. Sub-second first token for short prompts.",
    ratio: 1.0,
  },
  {
    id: "gpt-5",
    vendor: "OpenAI",
    endpoints: ["chat", "responses"],
    context: 256_000,
    input: 5.0,
    output: 15.0,
    groups: ["default"],
    tags: ["reasoning"],
    desc: "Frontier reasoning model from OpenAI.",
    ratio: 1.0,
  },
  {
    id: "gpt-5-mini",
    vendor: "OpenAI",
    endpoints: ["chat", "responses"],
    context: 128_000,
    input: 0.5,
    output: 1.5,
    groups: ["default", "fast"],
    tags: ["fast"],
    desc: "Compact GPT-5 for high-throughput workloads.",
    ratio: 1.0,
  },
  {
    id: "gpt-5-nano",
    vendor: "OpenAI",
    endpoints: ["chat", "responses"],
    context: 64_000,
    input: 0.1,
    output: 0.4,
    groups: ["fast"],
    tags: ["cheap"],
    desc: "Cheapest OpenAI model. For high-volume routing.",
    ratio: 1.0,
  },
  {
    id: "gemini-2-pro",
    vendor: "Google",
    endpoints: ["chat"],
    context: 1_000_000,
    input: 2.5,
    output: 10.0,
    groups: ["default"],
    tags: ["long-context", "vision"],
    desc: "1M-token context. Excellent at long-document analysis.",
    ratio: 1.0,
  },
  {
    id: "gemini-2-flash",
    vendor: "Google",
    endpoints: ["chat"],
    context: 1_000_000,
    input: 0.3,
    output: 1.2,
    groups: ["fast"],
    tags: ["fast", "vision"],
    desc: "Long context with low latency. Multimodal.",
    ratio: 1.0,
  },
  {
    id: "llama-4-405b",
    vendor: "Meta",
    endpoints: ["chat"],
    context: 128_000,
    input: 2.8,
    output: 8.4,
    groups: ["default", "open"],
    tags: ["open"],
    desc: "Largest open-weight Llama. Hosted on dedicated capacity.",
    ratio: 1.0,
  },
  {
    id: "llama-4-70b",
    vendor: "Meta",
    endpoints: ["chat"],
    context: 128_000,
    input: 0.6,
    output: 1.8,
    groups: ["open"],
    tags: ["open", "fast"],
    desc: "Mid-size open-weight Llama. Good cost/capability tradeoff.",
    ratio: 1.0,
  },
  {
    id: "mistral-large-2",
    vendor: "Mistral",
    endpoints: ["chat"],
    context: 128_000,
    input: 2.0,
    output: 6.0,
    groups: ["default", "open"],
    tags: ["balanced"],
    desc: "European-trained frontier model. Strong on multilingual.",
    ratio: 1.0,
  },
  {
    id: "deepseek-v3",
    vendor: "DeepSeek",
    endpoints: ["chat"],
    context: 128_000,
    input: 0.27,
    output: 1.1,
    groups: ["default", "open"],
    tags: ["cheap", "open"],
    desc: "Strong reasoning at very low cost. MoE architecture.",
    ratio: 1.0,
  },
];

const VENDORS = [
  "Anthropic",
  "OpenAI",
  "Google",
  "Meta",
  "Mistral",
  "DeepSeek",
];
const ALL_GROUPS: Group[] = ["default", "premium", "fast", "open"];
const ALL_ENDPOINTS: Endpoint[] = ["chat", "messages", "responses", "images"];
const ALL_TAGS: Tag[] = [
  "reasoning",
  "vision",
  "fast",
  "open",
  "balanced",
  "cheap",
  "long-context",
];

const NAV_ITEMS = [
  { label: "Models", href: "/pricing" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: DOCS_URL },
  { label: "Changelog", href: "#" },
];

function fmtPrice(n: number): string {
  return n < 1 ? n.toFixed(2) : n.toFixed(2);
}

function fmtContext(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return `${n}`;
}

const ENDPOINT_PATH: Record<Endpoint, string> = {
  chat: "/v1/chat/completions",
  messages: "/v1/messages",
  responses: "/v1/responses",
  images: "/v1/images",
};

export default function PricingPage() {
  return <CatalogTable />;
}

/* ═════════════════════════════════════════════════════════════════════════════
 *  Variant 1 — Catalog Table (Ledger)
 *  Dense one-row-per-model table. Left filter rail, top toolbar.
 * ═════════════════════════════════════════════════════════════════════════════ */
function CatalogTable() {
  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader theme="light" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-8 py-12">
          <PageHeader
            eyebrow="Model marketplace"
            title="Pricing"
            description={`${MODELS.length} models from ${VENDORS.length} vendors. All prices are USD per million tokens.`}
          />

          {/* Toolbar */}
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <div className="relative min-w-64 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search models, vendors, tags…"
                className="pl-8"
              />
            </div>
            <ToggleStub options={["USD", "CNY"]} active="USD" />
            <ToggleStub
              options={["per 1M tok", "per 1K tok"]}
              active="per 1M tok"
            />
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5",
              )}
            >
              <Filter aria-hidden="true" />
              Filters
              <ChevronDown
                aria-hidden="true"
                className="size-3 text-muted-foreground"
              />
            </button>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
            {/* Filter rail */}
            <aside className="hidden lg:block">
              <FilterGroup label="Groups">
                {ALL_GROUPS.map((g) => (
                  <FilterRow key={g} label={g} count={modelsInGroup(g)} />
                ))}
              </FilterGroup>
              <FilterGroup label="Endpoint">
                {ALL_ENDPOINTS.map((e) => (
                  <FilterRow key={e} label={e} count={modelsWithEndpoint(e)} />
                ))}
              </FilterGroup>
              <FilterGroup label="Vendor">
                {VENDORS.map((v) => (
                  <FilterRow key={v} label={v} count={modelsByVendor(v)} />
                ))}
              </FilterGroup>
              <FilterGroup label="Tags">
                {ALL_TAGS.map((t) => (
                  <FilterRow key={t} label={t} count={modelsWithTag(t)} />
                ))}
              </FilterGroup>
            </aside>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">
                      <span className="inline-flex items-center gap-1">
                        Model
                        <ArrowUpDown
                          aria-hidden="true"
                          className="size-3 text-muted-foreground/60"
                        />
                      </span>
                    </TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Endpoints</TableHead>
                    <TableHead className="text-right">Context</TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        Input $/M
                        <ArrowUpDown
                          aria-hidden="true"
                          className="size-3 text-muted-foreground/60"
                        />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1">
                        Output $/M
                        <ArrowUpDown
                          aria-hidden="true"
                          className="size-3 text-muted-foreground/60"
                        />
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Ratio</TableHead>
                    <TableHead className="pr-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODELS.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-medium tracking-tight text-foreground">
                            {m.id}
                          </code>
                        </div>
                        <div className="mt-0.5 max-w-[40ch] truncate text-xs text-muted-foreground">
                          {m.desc}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <VendorMark vendor={m.vendor} />
                          <span className="text-sm text-foreground">
                            {m.vendor}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.endpoints.map((e) => (
                            <span
                              key={e}
                              className="inline-flex h-5 items-center rounded-xs bg-muted px-1.5 font-mono text-[11px] tracking-tight text-foreground"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        {fmtContext(m.context)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        ${fmtPrice(m.input)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                        ${fmtPrice(m.output)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                        {m.ratio.toFixed(2)}×
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Copy ${m.id}`}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "icon-sm",
                              }),
                            )}
                          >
                            <Copy aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label={`View ${m.id}`}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "icon-sm",
                              }),
                            )}
                          >
                            <Eye aria-hidden="true" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
 *  Shared chrome
 * ═════════════════════════════════════════════════════════════════════════════ */
function PageHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn(centered && "flex flex-col items-center text-center")}>
      <p className="text-[11px] font-medium tracking-[0.07em] text-brand uppercase">
        {eyebrow}
      </p>
      <h1
        className={cn(
          "mt-3 max-w-[24ch] font-heading text-4xl font-medium tracking-tight text-balance text-foreground sm:text-5xl",
          centered && "mx-auto",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "mt-4 max-w-[56ch] text-base leading-relaxed text-pretty text-muted-foreground",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

function FilterRow({ label, count }: { label: string; count: number }) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className="capitalize">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
          {count}
        </span>
      </button>
    </li>
  );
}

function ChipFilter({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-border-emphasis hover:text-foreground",
      )}
    >
      <span className="capitalize">{label}</span>
    </button>
  );
}

function ToggleStub({
  options,
  active,
}: {
  options: string[];
  active: string;
}) {
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-input bg-background p-[3px]">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={cn(
            "inline-flex h-full items-center rounded-sm px-2.5 text-xs font-medium transition-colors",
            o === active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function VendorMark({
  vendor,
  size = "sm",
}: {
  vendor: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "size-7 text-sm" : "size-5 text-[10px]";
  const initials = vendor
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm bg-muted font-mono font-medium tracking-tight text-foreground",
        dim,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
      {children}
    </dt>
  );
}

function DD({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dd className={cn("text-foreground", className)}>{children}</dd>;
}

/* ─────── helpers ─────── */
function modelsByVendor(v: string): number {
  return MODELS.filter((m) => m.vendor === v).length;
}
function modelsInGroup(g: Group): number {
  return MODELS.filter((m) => m.groups.includes(g)).length;
}
function modelsWithEndpoint(e: Endpoint): number {
  return MODELS.filter((m) => m.endpoints.includes(e)).length;
}
function modelsWithTag(t: Tag): number {
  return MODELS.filter((m) => m.tags.includes(t)).length;
}

/* ─────── header & footer (light theme) ─────── */
function SiteHeader({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <header
      className={cn(
        "border-b border-border",
        theme === "dark" && "dark scheme-only-dark bg-background",
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between px-8">
        <Link
          href="/"
          aria-label="Homepage"
          className="flex items-center gap-2"
        >
          <Flame className="size-4 text-brand" aria-hidden="true" />
          <span className="font-heading text-sm font-medium tracking-tight text-foreground">
            {SYSTEM_NAME}
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                item.label === "Pricing" && "text-foreground",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "max-sm:hidden",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/console"
            className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
          >
            Get a key
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-6 px-8 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-brand" aria-hidden="true" />
          <span className="font-heading text-sm font-medium text-foreground">
            {SYSTEM_NAME}
          </span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href={DOCS_URL}
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Docs
          </a>
          <Link
            href="/pricing"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/privacy-policy"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/user-agreement"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
