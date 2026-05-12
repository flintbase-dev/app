import {
  FileText,
  KeyRound,
  ReceiptText,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { GlobalSearch } from "@/components/console/global-search";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { loadGlobalSearchResults } from "@/lib/console/data";
import { fmtAbsDate, fmtMoney } from "@/lib/console/format";

export default async function ConsoleSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = await loadGlobalSearchResults(q);
  const totalMatches =
    results.models.length +
    results.requests.length +
    results.invoices.length +
    results.tokens.length;
  const hasQuery = q.trim().length > 0;

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1000px]">
        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Console · Search
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Global search
        </h1>
        <div className="mt-6">
          <GlobalSearch defaultValue={q} />
        </div>

        {!hasQuery ? (
          <div className="mt-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Search across the console</EmptyTitle>
                <EmptyDescription>
                  Find models, requests, invoices, and API keys by name, ID, or
                  reference.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : totalMatches === 0 ? (
          <div className="mt-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No results for “{q}”</EmptyTitle>
                <EmptyDescription>
                  Check the spelling, or try searching for a model name, request
                  ID, invoice reference, or key name.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ResultSection title="Models" icon={Sparkles}>
              {results.models.map((model) => (
                <ResultLink key={model.id} href="/pricing">
                  <code className="font-mono text-sm text-foreground">
                    {model.id}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {model.vendor} · {fmtMoney(model.input, results.status)} /{" "}
                    {fmtMoney(model.output, results.status)}
                  </span>
                </ResultLink>
              ))}
            </ResultSection>

            <ResultSection title="Requests" icon={FileText}>
              {results.requests.map((request) => (
                <ResultLink
                  key={request.id}
                  href={`/console/log?request_id=${request.requestId}`}
                >
                  <code className="font-mono text-sm text-foreground">
                    {request.requestId || request.id}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {request.model} · {fmtMoney(request.cost, results.status)}
                  </span>
                </ResultLink>
              ))}
            </ResultSection>

            <ResultSection title="Invoices" icon={ReceiptText}>
              {results.invoices.map((invoice) => (
                <ResultLink
                  key={invoice.id}
                  href={`/console/topup/history#${invoice.id}`}
                >
                  <code className="font-mono text-sm text-foreground">
                    {invoice.reference || invoice.invoiceNumber || invoice.id}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {fmtAbsDate(invoice.ts)} ·{" "}
                    {fmtMoney(
                      invoice.type === "subscription"
                        ? invoice.money
                        : invoice.amount,
                      results.status,
                    )}
                  </span>
                </ResultLink>
              ))}
            </ResultSection>

            <ResultSection title="API keys" icon={KeyRound}>
              {results.tokens.map((token) => (
                <ResultLink key={token.id} href={`/console/token/${token.id}`}>
                  <code className="font-mono text-sm text-foreground">
                    {token.name}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {token.keyPreview} ·{" "}
                    {token.status === 1 ? "enabled" : "disabled"}
                  </span>
                </ResultLink>
              ))}
            </ResultSection>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const empty = Array.isArray(children) && children.length === 0;
  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <Badge variant="secondary" className="ml-auto px-1.5">
            <Search aria-hidden="true" />
          </Badge>
        </div>
        <div className="flex flex-col gap-1">
          {empty ? (
            <p className="text-sm text-muted-foreground">No matches.</p>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
    >
      {children}
    </Link>
  );
}
