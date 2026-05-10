import {
  AlertTriangle,
  Bell,
  Check,
  Copy,
  Eye,
  Globe,
  KeyRound,
  Languages,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CURRENT_USER, fmtMoney, fmtNum } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "zh-CN", label: "简体中文" },
  { id: "zh-TW", label: "繁體中文" },
  { id: "fr", label: "Français" },
  { id: "ru", label: "Русский" },
  { id: "ja", label: "日本語" },
  { id: "vi", label: "Tiếng Việt" },
];

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "danger", label: "Danger zone" },
];

export default function PersonalPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Account · Personal
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Settings
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Identity is managed by WorkOS. The settings here control your local
            Flint preferences, application access token, and account.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr] lg:items-start">
          {/* Sticky in-page rail (anchored under the 48px top bar) */}
          <aside className="hidden lg:sticky lg:top-[calc(theme(spacing.12)+1.5rem)] lg:block lg:self-start">
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "flex h-8 items-center rounded-md px-2 text-sm transition-colors",
                      i === 0
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="flex flex-col gap-12">
            <section id="profile" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Profile
              </h2>
              <ProfileSection />
            </section>
            <section id="security" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Security
              </h2>
              <SecuritySection />
            </section>
            <section id="preferences" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Preferences
              </h2>
              <PreferencesSection />
            </section>
            <section id="notifications" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Notifications
              </h2>
              <NotificationsSection />
            </section>
            <section id="privacy" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Privacy
              </h2>
              <PrivacySection />
            </section>
            <section id="danger" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Danger zone
              </h2>
              <DangerSection />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <div className="inline-flex size-14 items-center justify-center rounded-full bg-brand-subtle font-mono text-base font-medium text-brand-emphasis">
            KN
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {CURRENT_USER.display_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {CURRENT_USER.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline" className="px-1.5">
                {CURRENT_USER.auth_method}
              </Badge>
              <Badge variant="brand" className="px-1.5">
                {CURRENT_USER.group}
              </Badge>
              <Badge variant="secondary" className="px-1.5">
                user
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
          <DT>Username</DT>
          <DD>
            <code className="font-mono text-foreground">
              {CURRENT_USER.username}
            </code>
          </DD>
          <DT>User ID</DT>
          <DD>
            <code className="font-mono tabular-nums text-foreground">
              {CURRENT_USER.id}
            </code>
          </DD>
          <DT>WorkOS user</DT>
          <DD>
            <code className="font-mono text-xs text-muted-foreground">
              {CURRENT_USER.workos_id}
            </code>
          </DD>
          <DT>Organization</DT>
          <DD>
            <code className="font-mono text-xs text-muted-foreground">
              {CURRENT_USER.workos_org_id}
            </code>
          </DD>
          <DT>Balance</DT>
          <DD className="font-mono tabular-nums">
            {fmtMoney(CURRENT_USER.balance)}
          </DD>
          <DT>Lifetime spend</DT>
          <DD className="font-mono tabular-nums">
            {fmtMoney(CURRENT_USER.used)}
          </DD>
          <DT>Requests</DT>
          <DD className="font-mono tabular-nums">
            {fmtNum(CURRENT_USER.request_count)}
          </DD>
        </dl>
      </CardContent>
    </Card>
  );
}

function SecuritySection() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
            <KeyRound aria-hidden="true" className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Application access token
            </p>
            <p className="text-xs text-muted-foreground">
              Used by the system to access this account programmatically.
              Resetting invalidates the existing token immediately.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted p-1.5 pl-2.5">
          <code className="flex-1 truncate font-mono text-sm text-foreground">
            {CURRENT_USER.app_access_token}
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
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <RefreshCw aria-hidden="true" />
            Reset token
          </button>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium text-foreground">Sign-in method</p>
          <div className="mt-2 flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              <Globe
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
              <div>
                <p className="text-sm text-foreground">
                  {CURRENT_USER.auth_method}
                </p>
                <p className="text-xs text-muted-foreground">
                  Identity managed by WorkOS · {CURRENT_USER.email}
                </p>
              </div>
            </div>
            <Badge variant="success">verified</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesSection() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div>
          <div className="flex items-center gap-2">
            <Languages
              aria-hidden="true"
              className="size-4 text-muted-foreground"
            />
            <p className="text-sm font-medium text-foreground">Language</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Affects the console UI and email content.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => {
              const active = l.id === CURRENT_USER.language;
              return (
                <button
                  key={l.id}
                  type="button"
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md border text-sm transition-colors",
                    active
                      ? "border-2 border-brand bg-brand-subtle text-brand-emphasis"
                      : "border-border text-foreground hover:border-border-emphasis",
                  )}
                >
                  {active ? (
                    <Check aria-hidden="true" className="mr-1 size-3" />
                  ) : null}
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <CheckRow
          label="Allow models with no posted price"
          description="Calls to models that don't have a configured price will succeed at the upstream's rate."
          defaultChecked={CURRENT_USER.accept_unset_model_price_model}
        />
      </CardContent>
    </Card>
  );
}

function NotificationsSection() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <div>
          <div className="flex items-center gap-2">
            <Bell aria-hidden="true" className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Quota warnings
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Email and dashboard alert when wallet balance drops below this
            threshold.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              defaultValue={CURRENT_USER.quota_warning_threshold}
              step="0.01"
              className="max-w-32"
            />
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              USD
            </span>
          </div>
        </div>

        <Separator />

        <CheckRow
          label="Notify me about upstream model updates"
          description="Receive a digest when underlying providers ship new models or change pricing."
          defaultChecked={CURRENT_USER.upstream_model_update_notify_enabled}
        />
      </CardContent>
    </Card>
  );
}

function PrivacySection() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <CheckRow
          label="Record client IP in usage and error logs"
          description="Disable to keep IPs out of your own audit trail. Doesn't affect security blocks at the edge."
          defaultChecked={CURRENT_USER.record_ip_log}
        />
        <Separator />
        <div className="flex items-start gap-2 rounded-md border-l-2 border-info bg-info-bg p-3 text-info-dark">
          <Shield aria-hidden="true" className="mt-0.5 size-4" />
          <div className="text-xs leading-relaxed">
            Flint never trains on your prompts or completions. See the{" "}
            <Link
              href="/privacy-policy"
              className="font-medium underline-offset-4 hover:underline"
            >
              privacy policy
            </Link>
            .
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DangerSection() {
  return (
    <Card className="border-destructive/30">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-destructive/15 text-destructive">
            <AlertTriangle aria-hidden="true" className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Delete account
            </p>
            <p className="mt-1 max-w-[60ch] text-xs text-muted-foreground">
              Permanently delete your Flint account, all keys, and usage
              history. This cannot be undone. Active subscriptions are
              cancelled. WorkOS identity is not affected.
            </p>
          </div>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "destructive", size: "sm" }),
            )}
          >
            <Trash2 aria-hidden="true" />
            Delete account
          </button>
        </div>
      </CardContent>
    </Card>
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
