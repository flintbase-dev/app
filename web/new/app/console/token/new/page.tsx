import {
  ArrowLeft,
  ChevronDown,
  Globe,
  HelpCircle,
  Infinity as InfinityIcon,
  KeyRound,
  Layers,
  Lock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { GROUPS, USER_MODELS } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function CreateTokenPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Breadcrumb / back */}
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

        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          New API key
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Create an API key
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          The secret will be shown once after creation. Store it somewhere safe
          — you can copy it from this page or download it as a text file.
        </p>

        <form className="mt-8 flex flex-col gap-6">
          {/* Basics */}
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={KeyRound} title="Basics" />

              <Field label="Name" required>
                <Input
                  name="name"
                  defaultValue="production-api"
                  placeholder="e.g. production-api"
                />
                <Hint>
                  Shown in logs and the keys list. Not visible to the API.
                </Hint>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Group">
                  <SelectStub
                    placeholder="default"
                    options={GROUPS.map((g) => g.label)}
                  />
                </Field>
                <Field label="Number of keys">
                  <Input
                    type="number"
                    name="tokenCount"
                    defaultValue={1}
                    min={1}
                    max={50}
                  />
                  <Hint>
                    Create multiple at once. Names get a random suffix.
                  </Hint>
                </Field>
              </div>

              <CheckRow
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
                label="Unlimited quota"
                description="Use the wallet balance directly. No per-key cap."
              />

              <Field label="Quota (USD)">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={50}
                  placeholder="50.00"
                />
                <Hint>
                  Maximum spend allowed on this key. Ignored when unlimited.
                </Hint>
              </Field>

              <Field label="Expires">
                <div className="flex items-center gap-2">
                  <Input type="datetime-local" />
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
            </CardContent>
          </Card>

          {/* Restrictions */}
          <Card>
            <CardContent className="flex flex-col gap-5 py-5">
              <SectionTitle icon={ShieldCheck} title="Restrictions" />

              <Field label="Model limits">
                <SelectStub placeholder="Any model" options={USER_MODELS} />
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="px-1.5">
                    claude-haiku-4-5
                    <button
                      type="button"
                      aria-label="Remove"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                  <Badge variant="outline" className="px-1.5">
                    gpt-5-mini
                    <button
                      type="button"
                      aria-label="Remove"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                </div>
                <Hint>
                  Only the models in this list will be reachable from this key.
                  Empty list means all available models.
                </Hint>
              </Field>

              <Field label="Allowed IPs / CIDRs">
                <Input placeholder="10.0.0.0/8, 203.0.113.4" />
                <Hint>
                  Comma-separated. Requests from outside the allowlist are
                  blocked at the edge.
                </Hint>
              </Field>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href="/console/token"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Cancel
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Create &amp; create another
              </button>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "brand" }))}
              >
                <Plus aria-hidden="true" />
                Create key
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* helpers (sub-page only) */
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
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
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
      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
    >
      <span>{placeholder}</span>
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
    <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3 hover:border-border-emphasis">
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
