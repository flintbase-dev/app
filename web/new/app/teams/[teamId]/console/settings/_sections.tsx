import { Mail, Receipt, Trash2, Users } from "lucide-react";
import { MemberRoleSelect } from "@/components/console/member-role-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  removeTeamMemberAction,
  revokeTeamInvitationAction,
  updateTeamAction,
  updateTeamPolicyAction,
} from "@/lib/console/actions";
import type { loadTeamSettingsData } from "@/lib/console/data";
import { fmtMoney, fmtRelative, initials } from "@/lib/console/format";
import type { ConsoleStatus } from "@/lib/console/types";
import { cn } from "@/lib/utils";

export type TeamSettingsData = Awaited<ReturnType<typeof loadTeamSettingsData>>;

/* ------------------------------------------------------------------ */
/* Page chrome                                                         */
/* ------------------------------------------------------------------ */

export function SettingsPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Team settings
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function CardShell({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  count?: number;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-5 py-3.5">
        {Icon ? (
          <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
        ) : null}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {count !== undefined ? (
          <span className="font-mono text-xs text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>
      <Separator />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* General                                                            */
/* ------------------------------------------------------------------ */

export function GeneralForm({
  teamId,
  team,
}: {
  teamId: string;
  team: TeamSettingsData["team"];
}) {
  return (
    <form action={updateTeamAction} className="flex flex-col gap-4">
      <input type="hidden" name="team_id" value={teamId} />
      <div className="flex items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-subtle font-mono text-base font-medium text-brand-emphasis">
          {team.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{team.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {team.slug || team.id}
          </p>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="team-name"
          className="text-sm font-medium text-foreground"
        >
          Team name
        </label>
        <Input
          id="team-name"
          name="name"
          defaultValue={team.name}
          required
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          Shown across the console and on member invitations.
        </p>
      </div>
      <Button type="submit" className="self-start" variant="brand">
        Save changes
      </Button>
    </form>
  );
}

export function TeamIdentityList({
  team,
  status,
}: {
  team: TeamSettingsData["team"];
  status: ConsoleStatus;
}) {
  return (
    <dl className="grid grid-cols-[9rem_1fr] gap-y-3 text-sm">
      <Dt>Team ID</Dt>
      <Dd>
        <code className="font-mono text-xs text-foreground">{team.id}</code>
      </Dd>
      <Dt>Slug</Dt>
      <Dd>
        <code className="font-mono text-xs text-foreground">
          {team.slug || "—"}
        </code>
      </Dd>
      <Dt>Status</Dt>
      <Dd>
        <Badge
          variant={team.status === "active" ? "success" : "outline"}
          className="capitalize"
        >
          {team.status}
        </Badge>
      </Dd>
      <Dt>Your role</Dt>
      <Dd className="capitalize">{team.role || "member"}</Dd>
      <Dt>Balance</Dt>
      <Dd className="font-mono tabular-nums">
        {fmtMoney(team.balance, status)}
      </Dd>
      <Dt>Lifetime spend</Dt>
      <Dd className="font-mono tabular-nums">{fmtMoney(team.used, status)}</Dd>
    </dl>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
      {children}
    </dt>
  );
}

function Dd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dd className={cn("text-foreground", className)}>{children}</dd>;
}

/* ------------------------------------------------------------------ */
/* Members & invitations                                               */
/* ------------------------------------------------------------------ */

export function MembersTableBody({
  teamId,
  members,
}: {
  teamId: string;
  members: TeamSettingsData["members"];
}) {
  if (members.length === 0) {
    return (
      <Empty className="border-0 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No members yet</EmptyTitle>
          <EmptyDescription>
            Invite teammates to give them access to this workspace.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="pr-5 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="pl-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-[11px] font-medium text-brand-emphasis">
                  {initials(
                    member.displayName || member.username || member.userId,
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.displayName ||
                      member.username ||
                      member.email ||
                      member.userId}
                  </p>
                  {member.email &&
                  member.email !== (member.displayName || member.username) ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <MemberRoleSelect
                teamId={teamId}
                userId={member.userId}
                defaultRole={member.role}
              />
            </TableCell>
            <TableCell>
              <Badge
                variant={member.status === "active" ? "success" : "outline"}
                className="capitalize"
              >
                {member.status}
              </Badge>
            </TableCell>
            <TableCell className="pr-5 text-right">
              <form action={removeTeamMemberAction}>
                <input type="hidden" name="team_id" value={teamId} />
                <input type="hidden" name="user_id" value={member.userId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </form>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InvitationsTableBody({
  teamId,
  invitations,
}: {
  teamId: string;
  invitations: TeamSettingsData["invitations"];
}) {
  if (invitations.length === 0) {
    return (
      <Empty className="border-0 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Mail aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No pending invitations</EmptyTitle>
          <EmptyDescription>
            Invitations you send appear here until they are accepted.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="pr-5 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell className="pl-5">{invitation.email}</TableCell>
            <TableCell className="capitalize">{invitation.role}</TableCell>
            <TableCell>
              <Badge
                variant={
                  invitation.status === "pending" ? "secondary" : "outline"
                }
                className="capitalize"
              >
                {invitation.status}
              </Badge>
            </TableCell>
            <TableCell className="pr-5 text-right">
              {invitation.status === "pending" ? (
                <form action={revokeTeamInvitationAction}>
                  <input type="hidden" name="team_id" value={teamId} />
                  <input
                    type="hidden"
                    name="invitation_id"
                    value={invitation.id}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Revoke
                  </Button>
                </form>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

export function BillingBalanceBlock({
  billingSummary,
  status,
}: {
  billingSummary: TeamSettingsData["billingSummary"];
  status: ConsoleStatus;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">Team balance</p>
      <p className="mt-3 font-mono text-3xl font-medium tabular-nums">
        {fmtMoney(billingSummary.quota, status)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">available to spend</p>
      <Separator className="my-4" />
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Used credit</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {fmtMoney(billingSummary.used, status)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Total credit</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {fmtMoney(billingSummary.total, status)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function TopupHistoryTableBody({
  topups,
  status,
}: {
  topups: TeamSettingsData["topups"];
  status: ConsoleStatus;
}) {
  if (topups.length === 0) {
    return (
      <Empty className="border-0 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No top-ups yet</EmptyTitle>
          <EmptyDescription>
            Credit purchases for this team will be listed here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Order</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="pr-5">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topups.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="pl-5">
              <code className="font-mono text-xs">
                {invoice.reference || invoice.id}
              </code>
            </TableCell>
            <TableCell>
              <Badge
                variant={invoice.status === "completed" ? "success" : "outline"}
                className="capitalize"
              >
                {invoice.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {fmtMoney(invoice.creditUnits, status)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {fmtMoney(invoice.money, status)}
            </TableCell>
            <TableCell className="pr-5 text-xs text-muted-foreground">
              {invoice.ts ? fmtRelative(invoice.ts) : "new"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Access policy                                                       */
/* ------------------------------------------------------------------ */

export function PolicySwitchList({
  title,
  items,
  allName,
  enabledName,
  disabled,
  mono = false,
}: {
  title: string;
  items: { value: string; label: string; detail?: string }[];
  allName: string;
  enabledName: string;
  disabled: Set<string>;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {title}
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {items.length - items.filter((i) => disabled.has(i.value)).length}/
          {items.length}
        </p>
      </div>
      <div className="mt-2 max-h-80 overflow-auto rounded-md border border-border bg-background">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing to configure.
          </p>
        ) : (
          items.map((item) => (
            <label
              key={item.value}
              className="flex min-h-10 items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <input type="hidden" name={allName} value={item.value} />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-sm",
                    mono ? "font-mono text-xs" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <input
                type="checkbox"
                name={enabledName}
                value={item.value}
                defaultChecked={!disabled.has(item.value)}
                className="size-4 shrink-0 accent-foreground"
              />
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function policyModelItems(models: TeamSettingsData["models"]) {
  return models.map((model) => ({ value: model, label: model }));
}

export function policyGroupItems(groups: TeamSettingsData["groups"]) {
  return groups.map((group) => ({
    value: group.name,
    label: group.name,
    detail: group.label === group.name ? "" : group.label,
  }));
}

export { updateTeamPolicyAction };
