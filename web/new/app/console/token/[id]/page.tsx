import {
  ArrowLeft,
  Copy,
  Eye,
  Infinity as InfinityIcon,
  KeyRound,
  Power,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtMoney, fmtRelative, GROUPS, TOKENS } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default async function EditTokenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = TOKENS.find((t) => String(t.id) === id);
  if (!token) notFound();

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/console/token"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            API keys
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Edit · key {token.id}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
              {token.name}
            </h1>
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
              created {new Date(token.created_at).toLocaleDateString()} ·{" "}
              {token.last_used_at
                ? `last used ${fmtRelative(token.last_used_at)}`
                : "never used"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm">
              <Power aria-hidden="true" />
              {token.status === 1 ? "Disable" : "Enable"}
            </Button>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>

        {/* Secret reveal */}
        <Card className="mt-6">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-subtle text-brand-emphasis">
                <KeyRound aria-hidden="true" className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Secret</p>
                <p className="text-xs text-muted-foreground">
                  Use this value in the{" "}
                  <code className="font-mono text-foreground">
                    Authorization
                  </code>{" "}
                  header.
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted p-1.5 pl-2.5">
                <code className="font-mono text-sm text-foreground">
                  {token.key_preview}
                </code>
                <Button variant="ghost" size="icon-xs" aria-label="Reveal">
                  <Eye aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon-xs" aria-label="Copy">
                  <Copy aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <form className="mt-4 flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={KeyRound} title="Basics" />
              <FieldRow label="Name" required>
                <Input defaultValue={token.name} />
              </FieldRow>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow label="Group">
                  <Select defaultValue={token.group}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={token.group} />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUPS.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Status">
                  <Select
                    defaultValue={token.status === 1 ? "enabled" : "disabled"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <CheckRow
                name="cross-group-retry"
                label="Allow cross-group retries"
                defaultChecked={token.cross_group_retry}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={InfinityIcon} title="Quota" />
              <CheckRow
                name="unlimited"
                label="Unlimited quota"
                description="Use wallet balance directly."
                defaultChecked={token.unlimited_quota}
              />
              <FieldRow label="Quota (USD)">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={token.remain_amount}
                />
              </FieldRow>
              <FieldRow label="Expires">
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    defaultValue={
                      token.expired_at ? token.expired_at.slice(0, 16) : ""
                    }
                  />
                  <Button variant="outline" size="sm">
                    Never
                  </Button>
                </div>
              </FieldRow>
              <div className="flex items-center justify-between rounded-md bg-muted p-3 text-xs">
                <span className="text-muted-foreground">Used to date</span>
                <span className="font-mono tabular-nums text-foreground">
                  {fmtMoney(token.used)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={ShieldCheck} title="Restrictions" />
              <FieldRow label="Model limits">
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add a model" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
                <div className="mt-2 flex flex-wrap gap-1">
                  {token.model_limits.length ? (
                    token.model_limits.map((m) => (
                      <Badge key={m} variant="outline" className="px-1.5">
                        {m}
                        <button
                          type="button"
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No restrictions — all models allowed.
                    </span>
                  )}
                </div>
              </FieldRow>
              <FieldRow label="Allowed IPs / CIDRs">
                <Input
                  defaultValue={token.allow_ips.join(", ")}
                  placeholder="any"
                />
              </FieldRow>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href="/console/token"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Cancel
            </Link>
            <Button type="submit" variant="brand">
              <Save aria-hidden="true" />
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <h2 className="font-heading text-base font-medium tracking-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-brand">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function CheckRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <FieldLabel htmlFor={name}>
      <Field orientation="horizontal">
        <Checkbox id={name} defaultChecked={defaultChecked} />
        <FieldContent>
          <FieldTitle>{label}</FieldTitle>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}
