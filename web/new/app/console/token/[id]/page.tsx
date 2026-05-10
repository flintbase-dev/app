import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Eye,
  HelpCircle,
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
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Power aria-hidden="true" />
              {token.status === 1 ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "text-destructive",
              )}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </button>
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
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-xs" }),
                  )}
                  aria-label="Reveal"
                >
                  <Eye aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-xs" }),
                  )}
                  aria-label="Copy"
                >
                  <Copy aria-hidden="true" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <form className="mt-4 flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={KeyRound} title="Basics" />
              <Field label="Name" required>
                <Input defaultValue={token.name} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Group">
                  <SelectStub
                    placeholder={token.group}
                    options={GROUPS.map((g) => g.label)}
                  />
                </Field>
                <Field label="Status">
                  <SelectStub
                    placeholder={token.status === 1 ? "Enabled" : "Disabled"}
                    options={["Enabled", "Disabled"]}
                  />
                </Field>
              </div>
              <CheckRow
                label="Allow cross-group retries"
                defaultChecked={token.cross_group_retry}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={InfinityIcon} title="Quota" />
              <CheckRow
                label="Unlimited quota"
                description="Use wallet balance directly."
                defaultChecked={token.unlimited_quota}
              />
              <Field label="Quota (USD)">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={token.remain_amount}
                />
              </Field>
              <Field label="Expires">
                <div className="flex items-center gap-2">
                  <Input
                    type="datetime-local"
                    defaultValue={
                      token.expired_at
                        ? token.expired_at.slice(0, 16)
                        : ""
                    }
                  />
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    Never
                  </button>
                </div>
              </Field>
              <div className="flex items-center justify-between rounded-md bg-muted p-3 text-xs">
                <span className="text-muted-foreground">
                  Used to date
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {fmtMoney(token.used)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={ShieldCheck} title="Restrictions" />
              <Field label="Model limits">
                <SelectStub placeholder="Add a model" options={[]} />
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
              </Field>
              <Field label="Allowed IPs / CIDRs">
                <Input
                  defaultValue={token.allow_ips.join(", ")}
                  placeholder="any"
                />
              </Field>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href="/console/token"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "brand" }))}
            >
              <Save aria-hidden="true" />
              Save changes
            </button>
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

function Field({
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

function SelectStub({
  placeholder,
  options,
}: {
  placeholder: string;
  options: string[];
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm text-foreground transition-colors hover:bg-muted"
    >
      <span className="capitalize">{placeholder}</span>
      <ChevronDown aria-hidden="true" className="size-3" />
    </button>
  );
}

function CheckRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border p-3 hover:border-border-emphasis">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 accent-brand"
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </label>
  );
}
