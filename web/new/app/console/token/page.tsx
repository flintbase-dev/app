import {
  CheckCircle2,
  ChevronDown,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Search,
  SearchX,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { TokenSecretButton } from "@/components/console/token-actions";
import {
  TokenBulkCopyButton,
  TokenBulkDeleteButton,
} from "@/components/console/token-bulk-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import {
  deleteTokenAction,
  deleteTokensAction,
  toggleTokenStatusAction,
} from "@/lib/console/actions";
import { loadTokenList } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function TokenPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; q?: string }>;
}) {
  const { p = "1", q = "" } = await searchParams;
  const page = Math.max(Number(p) || 1, 1);
  const { tokens, status } = await loadTokenList({
    ...(q ? { keyword: q } : {}),
    p: page,
  });
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader />

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <form action="/console/token" className="min-w-64 flex-1">
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                name="q"
                defaultValue={q}
                placeholder="Search by name or key…"
              />
            </InputGroup>
          </form>
          <FilterButton href="/console/token?q=enabled" label="Status" />
          <FilterButton href="/console/token?q=default" label="Group" />
          <TokenBulkCopyButton ids={tokens.items.map((token) => token.id)} />
          <form action={deleteTokensAction}>
            {tokens.items.map((token) => (
              <input key={token.id} type="hidden" name="ids" value={token.id} />
            ))}
            <TokenBulkDeleteButton disabled={tokens.items.length === 0} />
          </form>
          <Link
            href="/console/token/new"
            className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
          >
            <Plus aria-hidden="true" />
            Create key
          </Link>
        </div>

        {/* Table */}
        <Card className="mt-4 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pl-4">
                  <Checkbox aria-label="Select all" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    {q ? (
                      <Empty className="border-0 py-12">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <SearchX aria-hidden="true" />
                          </EmptyMedia>
                          <EmptyTitle>No keys match “{q}”</EmptyTitle>
                          <EmptyDescription>
                            Try a different name or key prefix, or clear the
                            search to see every key.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Link
                            href="/console/token"
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "sm",
                              }),
                            )}
                          >
                            Clear search
                          </Link>
                        </EmptyContent>
                      </Empty>
                    ) : (
                      <Empty className="border-0 py-12">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <KeyRound aria-hidden="true" />
                          </EmptyMedia>
                          <EmptyTitle>No API keys yet</EmptyTitle>
                          <EmptyDescription>
                            Create a key to start calling the Flint API from
                            your application.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Link
                            href="/console/token/new"
                            className={cn(
                              buttonVariants({ variant: "brand", size: "sm" }),
                            )}
                          >
                            <Plus aria-hidden="true" />
                            Create your first key
                          </Link>
                        </EmptyContent>
                      </Empty>
                    )}
                  </TableCell>
                </TableRow>
              ) : null}
              {tokens.items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4">
                    <Checkbox aria-label={`Select ${t.name}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-medium text-foreground">
                        {t.name}
                      </code>
                      {t.crossGroupRetry ? (
                        <Badge variant="secondary" className="px-1.5">
                          retry
                        </Badge>
                      ) : null}
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      id {t.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <code className="font-mono text-xs text-muted-foreground">
                        {t.keyPreview}
                      </code>
                      <TokenSecretButton tokenId={t.id} mode="reveal" />
                      <TokenSecretButton tokenId={t.id} mode="copy" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {t.group}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.status === 1 ? (
                      <span className="inline-flex items-center gap-1 text-sm text-success-dark">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                        enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <XCircle aria-hidden="true" className="size-3.5" />
                        disabled
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {fmtMoney(t.used, status)}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.unlimitedQuota ? (
                      <Badge variant="brand">unlimited</Badge>
                    ) : (
                      <span className="font-mono text-sm tabular-nums">
                        {fmtMoney(t.remainAmount, status)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.lastUsedAt ? fmtRelative(t.lastUsedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.expiredAt > 0
                      ? new Date(t.expiredAt * 1000).toLocaleDateString()
                      : "never"}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/console/token/${t.id}`}
                        className={cn(
                          buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          }),
                        )}
                        aria-label="Edit"
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                      <form action={toggleTokenStatusAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="status" value={t.status} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Toggle status"
                        >
                          <Power aria-hidden="true" />
                        </Button>
                      </form>
                      <TokenSecretButton
                        tokenId={t.id}
                        mode="connection"
                        connectionBase={status.serverAddress}
                      />
                      <form action={deleteTokenAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing 1–{tokens.items.length} of {tokens.total}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/console/token?p=${Math.max(1, page - 1)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Previous
            </Link>
            <Link
              href={`/console/token?p=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Account · API
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          API keys
        </h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
          Manage the keys your applications use to call the Flint API.{" "}
          <Link
            href="https://docs.flint.dev/keys"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Read the docs
          </Link>
          .
        </p>
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        API key inventory
      </span>
    </div>
  );
}

function FilterButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {label}
      <ChevronDown
        aria-hidden="true"
        data-icon="inline-end"
        className="size-3 text-muted-foreground"
      />
    </Link>
  );
}
