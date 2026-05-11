import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { fmtMoney, fmtRelative, TOKENS } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function TokenPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader />

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-64 flex-1">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search by name or key…" />
          </InputGroup>
          <FilterButton label="Status" />
          <FilterButton label="Group" />
          <Button variant="outline" size="sm">
            <Copy aria-hidden="true" />
            Bulk copy
          </Button>
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2 aria-hidden="true" />
            Delete selected
          </Button>
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
              {TOKENS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4">
                    <Checkbox aria-label={`Select ${t.name}`} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-medium text-foreground">
                        {t.name}
                      </code>
                      {t.cross_group_retry ? (
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
                        {t.key_preview}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Reveal key"
                      >
                        <Eye aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copy key"
                      >
                        <Copy aria-hidden="true" />
                      </Button>
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
                    {fmtMoney(t.used)}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.unlimited_quota ? (
                      <Badge variant="brand">unlimited</Badge>
                    ) : (
                      <span className="font-mono text-sm tabular-nums">
                        {fmtMoney(t.remain_amount)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.last_used_at ? fmtRelative(t.last_used_at) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.expired_at
                      ? new Date(t.expired_at).toLocaleDateString()
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
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Toggle status"
                      >
                        <Power aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Connection string"
                      >
                        <Link2 aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="More">
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing 1–{TOKENS.length} of {TOKENS.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
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
        {TOKENS.length} keys · {TOKENS.filter((t) => t.status === 1).length}{" "}
        enabled
      </span>
    </div>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm">
      {label}
      <ChevronDown
        aria-hidden="true"
        data-icon="inline-end"
        className="size-3 text-muted-foreground"
      />
    </Button>
  );
}
