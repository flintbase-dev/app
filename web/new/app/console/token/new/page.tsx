import {
  ArrowLeft,
  HelpCircle,
  Infinity as InfinityIcon,
  KeyRound,
  Plus,
} from "lucide-react";
import Link from "next/link";

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
import { cn } from "@/lib/utils";

export default async function CreateTokenPage() {
  return <CreateTokenFormPage />;
}

export async function CreateTokenFormPage({ teamId }: { teamId?: string }) {
  const { groups, status } = await loadTokenEditor(undefined, {
    teamId,
  });
  const basePath = teamId ? `/teams/${teamId}/console/token` : "/console/token";
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Breadcrumb / back */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={basePath}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            {teamId ? "Team API keys" : "API keys"}
          </Link>
        </div>

        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          New API key
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Create an API key
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          The secret will be shown once after creation. Store it somewhere safe
          before leaving the next page.
        </p>

        <form
          action="/console/token/actions/create"
          method="post"
          className="mt-8 flex flex-col gap-6"
        >
          {teamId ? (
            <input type="hidden" name="team_id" value={teamId} />
          ) : null}
          <input type="hidden" name="status" value={1} />
          {/* Basics */}
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={KeyRound} title="Basics" />

              <FieldRow label="Name" required>
                <Input
                  name="name"
                  defaultValue="production-api"
                  placeholder="e.g. production-api"
                />
                <Hint>
                  Shown in logs and the keys list. Not visible to the API.
                </Hint>
              </FieldRow>

              <div className="grid gap-4 md:grid-cols-2">
                <FieldRow label="Group">
                  <Select name="group" defaultValue={groups[0]?.name}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="default" />
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
                <FieldRow label="Number of keys">
                  <Input
                    type="number"
                    name="tokenCount"
                    defaultValue={1}
                    min={1}
                    max={10}
                  />
                  <Hint>
                    Create multiple at once. Names get a random suffix.
                  </Hint>
                </FieldRow>
              </div>

              <CheckRow
                name="cross_group_retry"
                label="Allow cross-group retries"
                description="Retry on a different group when a request fails on this group."
                defaultChecked
              />
            </CardContent>
          </Card>

          {/* Quota */}
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={InfinityIcon} title="Quota" />

              <CheckRow
                name="unlimited_quota"
                label="Unlimited quota"
                description="Use the wallet balance directly. No per-key cap."
              />

              <FieldRow label="Quota">
                <CurrencyAmountInput
                  status={status}
                  name="remain_amount"
                  defaultValue={50}
                  placeholder="50.00"
                />
                <Hint>
                  Maximum spend allowed on this key. Ignored when unlimited.
                </Hint>
              </FieldRow>

              <FieldRow label="Expires">
                <Input type="datetime-local" name="expired_at" />
              </FieldRow>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href={basePath}
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Cancel
            </Link>
            <Button type="submit" variant="brand">
              <Plus aria-hidden="true" />
              Create key
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
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
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

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1 text-xs text-muted-foreground">
      <HelpCircle
        aria-hidden="true"
        className="mt-0.5 size-3 shrink-0 text-muted-foreground/70"
      />
      <span>{children}</span>
    </span>
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
