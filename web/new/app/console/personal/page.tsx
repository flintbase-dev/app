import {
  AlertTriangle,
  Bell,
  Globe,
  KeyRound,
  Languages,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { AccessTokenActions } from "@/components/console/access-token-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  deleteSelfAction,
  updatePersonalPreferencesAction,
} from "@/lib/console/actions";
import { loadPersonalData } from "@/lib/console/data";
import { fmtMoney, fmtNum, initials } from "@/lib/console/format";
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

export default async function PersonalPage() {
  const { user, status } = await loadPersonalData();
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
              <ProfileSection user={user} status={status} />
            </section>
            <section id="security" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Security
              </h2>
              <SecuritySection user={user} />
            </section>
            <form action={updatePersonalPreferencesAction} className="contents">
              <section id="preferences" className="scroll-mt-20">
                <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                  Preferences
                </h2>
                <PreferencesSection user={user} />
              </section>
              <section id="notifications" className="scroll-mt-20">
                <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                  Notifications
                </h2>
                <NotificationsSection user={user} />
              </section>
              <section id="privacy" className="scroll-mt-20">
                <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                  Privacy
                </h2>
                <PrivacySection user={user} />
                <div className="mt-4 flex justify-end">
                  <Button type="submit" variant="brand">
                    <Save aria-hidden="true" />
                    Save preferences
                  </Button>
                </div>
              </section>
            </form>
            <section id="danger" className="scroll-mt-20">
              <h2 className="mb-3 font-heading text-xl font-medium tracking-tight">
                Danger zone
              </h2>
              <DangerSection user={user} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({
  user,
  status,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
  status: Awaited<ReturnType<typeof loadPersonalData>>["status"];
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center gap-4">
          <div className="inline-flex size-14 items-center justify-center rounded-full bg-brand-subtle font-mono text-base font-medium text-brand-emphasis">
            {initials(user.displayName)}
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {user.displayName}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="outline" className="px-1.5">
                {user.authMethod}
              </Badge>
              <Badge variant="brand" className="px-1.5">
                {user.group}
              </Badge>
              <Badge variant="secondary" className="px-1.5">
                {user.roleLabel}
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-sm">
          <DT>Username</DT>
          <DD>
            <code className="font-mono text-foreground">{user.username}</code>
          </DD>
          <DT>User ID</DT>
          <DD>
            <code className="font-mono tabular-nums text-foreground">
              {user.id}
            </code>
          </DD>
          <DT>WorkOS user</DT>
          <DD>
            <code className="font-mono text-xs text-muted-foreground">
              {user.workosId}
            </code>
          </DD>
          <DT>Organization</DT>
          <DD>
            <code className="font-mono text-xs text-muted-foreground">
              {user.workosOrganizationId}
            </code>
          </DD>
          <DT>Balance</DT>
          <DD className="font-mono tabular-nums">
            {fmtMoney(user.balance, status)}
          </DD>
          <DT>Lifetime spend</DT>
          <DD className="font-mono tabular-nums">
            {fmtMoney(user.used, status)}
          </DD>
          <DT>Requests</DT>
          <DD className="font-mono tabular-nums">
            {fmtNum(user.requestCount)}
          </DD>
        </dl>
      </CardContent>
    </Card>
  );
}

function SecuritySection({
  user,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
}) {
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
          <AccessTokenActions token={user.accessToken} />
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
                <p className="text-sm text-foreground">{user.authMethod}</p>
                <p className="text-xs text-muted-foreground">
                  Identity managed by WorkOS · {user.email}
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

function PreferencesSection({
  user,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
}) {
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
          <ToggleGroup
            defaultValue={[user.language]}
            variant="outline"
            spacing={2}
            className="mt-2 flex-wrap"
          >
            {LANGUAGES.map((l) => (
              <ToggleGroupItem key={l.id} value={l.id}>
                {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Separator />

        <CheckRow
          name="accept_unset_model_price_model"
          label="Allow models with no posted price"
          description="Calls to models that don't have a configured price will succeed at the upstream's rate."
          defaultChecked={user.acceptUnsetModelPriceModel}
        />
      </CardContent>
    </Card>
  );
}

function NotificationsSection({
  user,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
}) {
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
              name="quota_warning_threshold"
              defaultValue={user.quotaWarningThreshold}
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
          name="upstream_model_update_notify_enabled"
          label="Notify me about upstream model updates"
          description="Receive a digest when underlying providers ship new models or change pricing."
          defaultChecked={user.upstreamModelUpdateNotifyEnabled}
        />
      </CardContent>
    </Card>
  );
}

function PrivacySection({
  user,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 py-5">
        <CheckRow
          name="record_ip_log"
          label="Record client IP in usage and error logs"
          description="Disable to keep IPs out of your own audit trail. Doesn't affect security blocks at the edge."
          defaultChecked={user.recordIpLog}
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

function DangerSection({
  user,
}: {
  user: Awaited<ReturnType<typeof loadPersonalData>>["user"];
}) {
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
          <form action={deleteSelfAction} className="flex items-center gap-2">
            <input type="hidden" name="username" value={user.username} />
            <Input
              name="confirm"
              placeholder={user.username}
              className="h-8 w-36"
            />
            <Button variant="destructive" size="sm">
              <Trash2 aria-hidden="true" />
              Delete account
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
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
