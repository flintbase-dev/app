import {
  ArrowLeft,
  Infinity as InfinityIcon,
  KeyRound,
  Power,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CurrencyAmountInput } from "@/components/console/currency-amount-input";
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
import { loadTokenEditor } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function EditTokenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditTokenFormPage id={id} />;
}

export async function EditTokenFormPage({
  id,
  teamId,
}: {
  id: string;
  teamId?: string;
}) {
  const { token, groups, status } = await loadTokenEditor(id, {
    teamId,
  });
  if (!token) notFound();
  const basePath = teamId ? `/teams/${teamId}/console/token` : "/console/token";

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={basePath}
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
              created {new Date(token.createdAt * 1000).toLocaleDateString()} ·{" "}
              {token.lastUsedAt
                ? `last used ${fmtRelative(token.lastUsedAt)}`
                : "never used"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <form action="/console/token/actions/toggle" method="post">
              {teamId ? (
                <input type="hidden" name="team_id" value={teamId} />
              ) : null}
              <input type="hidden" name="id" value={token.id} />
              <input type="hidden" name="status" value={token.status} />
              <Button type="submit" variant="outline" size="sm">
                <Power aria-hidden="true" />
                {token.status === 1 ? "Disable" : "Enable"}
              </Button>
            </form>
            <form action="/console/token/actions/delete" method="post">
              {teamId ? (
                <input type="hidden" name="team_id" value={teamId} />
              ) : null}
              <input type="hidden" name="id" value={token.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-destructive"
              >
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            </form>
          </div>
        </div>

        <Card className="mt-6">
          <CardContent className="py-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-subtle text-brand-emphasis">
                <KeyRound aria-hidden="true" className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  API key preview
                </p>
                <p className="text-xs text-muted-foreground">
                  The full secret was only shown when this key was created.
                  Create a replacement key if the secret was lost.
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted p-1.5 pl-2.5">
                <code className="font-mono text-sm text-foreground">
                  {token.keyPreview}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>

        <form
          action="/console/token/actions/update"
          method="post"
          className="mt-4 flex flex-col gap-6"
        >
          {teamId ? (
            <input type="hidden" name="team_id" value={teamId} />
          ) : null}
          <input type="hidden" name="id" value={token.id} />
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={KeyRound} title="Basics" />
              <FieldRow label="Name" required>
                <Input name="name" defaultValue={token.name} />
              </FieldRow>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow label="Group">
                  <Select name="group" defaultValue={token.group}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={token.group} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.name} value={g.name}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Status">
                  <Select name="status" defaultValue={String(token.status)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Enabled</SelectItem>
                      <SelectItem value="2">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>
              <CheckRow
                name="cross_group_retry"
                label="Allow cross-group retries"
                defaultChecked={token.crossGroupRetry}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={InfinityIcon} title="Quota" />
              <CheckRow
                name="unlimited_quota"
                label="Unlimited quota"
                description="Use wallet balance directly."
                defaultChecked={token.unlimitedQuota}
              />
              <FieldRow label="Quota">
                <CurrencyAmountInput
                  status={status}
                  name="remain_amount"
                  defaultValue={token.remainAmount}
                />
              </FieldRow>
              <FieldRow label="Expires">
                <Input
                  type="datetime-local"
                  name="expired_at"
                  defaultValue={
                    token.expiredAt > 0
                      ? new Date(token.expiredAt * 1000)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                />
              </FieldRow>
              <div className="flex items-center justify-between rounded-md bg-muted p-3 text-xs">
                <span className="text-muted-foreground">Used to date</span>
                <span className="font-mono tabular-nums text-foreground">
                  {fmtMoney(token.used, status)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href={basePath}
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
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-brand">*</span> : null}
      </span>
      {children}
    </div>
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
        <Checkbox id={name} name={name} defaultChecked={defaultChecked} />
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
