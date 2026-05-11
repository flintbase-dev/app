import { ArrowUpDown, ChevronDown, Eye, Filter, Search } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/site/copy-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { loadPricingCatalog } from "@/lib/console/data";
import type { PricingModel } from "@/lib/console/types";
import { cn } from "@/lib/utils";

type Model = PricingModel;
function fmtPrice(n: number): string {
  return n < 1 ? n.toFixed(2) : n.toFixed(2);
}

function fmtContext(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return `${n}`;
}

function filterModels(
  models: Model[],
  filters: {
    endpoint?: string;
    group?: string;
    q?: string;
    tag?: string;
    vendor?: string;
  },
): Model[] {
  const query = (filters.q || "").trim().toLowerCase();
  return models.filter((model) => {
    if (filters.endpoint && !model.endpoints.includes(filters.endpoint)) {
      return false;
    }
    if (filters.group && !model.groups.includes(filters.group)) return false;
    if (filters.tag && !model.tags.includes(filters.tag)) return false;
    if (filters.vendor && model.vendor !== filters.vendor) return false;
    if (!query) return true;
    return [model.id, model.vendor, model.desc, ...model.tags, ...model.groups]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{
    endpoint?: string;
    group?: string;
    q?: string;
    tag?: string;
    vendor?: string;
  }>;
}) {
  const filters = await searchParams;
  const { models } = await loadPricingCatalog();
  return (
    <CatalogTable filters={filters} models={filterModels(models, filters)} />
  );
}

function CatalogTable({
  filters,
  models,
}: {
  filters: {
    endpoint?: string;
    group?: string;
    q?: string;
    tag?: string;
    vendor?: string;
  };
  models: Model[];
}) {
  const vendors = [...new Set(models.map((model) => model.vendor))].sort();
  const groups = [...new Set(models.flatMap((model) => model.groups))].sort();
  const endpoints = [
    ...new Set(models.flatMap((model) => model.endpoints)),
  ].sort();
  const tags = [...new Set(models.flatMap((model) => model.tags))].sort();
  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader active="Pricing" />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1200px] px-8 py-12">
          <PageHeader
            eyebrow="Model marketplace"
            title="Pricing"
            description={`${models.length} models from ${vendors.length} vendors. All prices are USD per million tokens.`}
          />

          {/* Toolbar */}
          <form className="mt-10 flex flex-wrap items-center gap-2">
            <InputGroup className="min-w-64 flex-1">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                defaultValue={filters.q}
                name="q"
                placeholder="Search models, vendors, tags..."
              />
            </InputGroup>
            <ToggleGroup defaultValue={["USD"]} variant="outline">
              <ToggleGroupItem value="USD">USD</ToggleGroupItem>
              <ToggleGroupItem value="CNY">CNY</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup defaultValue={["per1M"]} variant="outline">
              <ToggleGroupItem value="per1M">per 1M tok</ToggleGroupItem>
              <ToggleGroupItem value="per1K">per 1K tok</ToggleGroupItem>
            </ToggleGroup>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Filter aria-hidden="true" />
              Reset
              <ChevronDown
                aria-hidden="true"
                data-icon="inline-end"
                className="size-3 text-muted-foreground"
              />
            </Link>
          </form>

          <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
            {/* Filter rail */}
            <aside className="hidden lg:block">
              <FilterGroup label="Groups">
                {groups.map((g) => (
                  <FilterRow
                    key={g}
                    href={`/pricing?group=${encodeURIComponent(g)}`}
                    label={g}
                    count={modelsInGroup(models, g)}
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="Endpoint">
                {endpoints.map((e) => (
                  <FilterRow
                    key={e}
                    href={`/pricing?endpoint=${encodeURIComponent(e)}`}
                    label={e}
                    count={modelsWithEndpoint(models, e)}
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="Vendor">
                {vendors.map((v) => (
                  <FilterRow
                    key={v}
                    href={`/pricing?vendor=${encodeURIComponent(v)}`}
                    label={v}
                    count={modelsByVendor(models, v)}
                  />
                ))}
              </FilterGroup>
              <FilterGroup label="Tags">
                {tags.map((t) => (
                  <FilterRow
                    key={t}
                    href={`/pricing?tag=${encodeURIComponent(t)}`}
                    label={t}
                    count={modelsWithTag(models, t)}
                  />
                ))}
              </FilterGroup>
            </aside>

            {/* Table */}
            <Card className="overflow-hidden p-0">
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
                  {models.map((m) => (
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
                          <CopyButton value={m.id} label={`Copy ${m.id}`} />
                          <Link
                            href={`/console/playground?model=${encodeURIComponent(m.id)}`}
                            className={cn(
                              buttonVariants({
                                variant: "ghost",
                                size: "icon-sm",
                              }),
                            )}
                            aria-label={`View ${m.id}`}
                          >
                            <Eye aria-hidden="true" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

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

function FilterRow({
  count,
  href,
  label,
}: {
  count: number;
  href: string;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex w-full items-center justify-between rounded-sm px-1.5 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className="capitalize">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
          {count}
        </span>
      </Link>
    </li>
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

function modelsByVendor(models: Model[], v: string): number {
  return models.filter((m) => m.vendor === v).length;
}
function modelsInGroup(models: Model[], g: string): number {
  return models.filter((m) => m.groups.includes(g)).length;
}
function modelsWithEndpoint(models: Model[], e: string): number {
  return models.filter((m) => m.endpoints.includes(e)).length;
}
function modelsWithTag(models: Model[], t: string): number {
  return models.filter((m) => m.tags.includes(t)).length;
}
