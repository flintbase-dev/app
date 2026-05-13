import { ArrowLeft, Send, Trash2 } from "lucide-react";
import Link from "next/link";

import { TeamBillingClient } from "@/components/console/team-billing-client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  revokeTeamInvitationAction,
  updateTeamAction,
  updateTeamMemberRoleAction,
  updateTeamPolicyAction,
} from "@/lib/console/actions";
import { loadTeamSettingsData } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const {
    status,
    team,
    members,
    invitations,
    policy,
    models,
    groups,
    billingSummary,
    topups,
  } = await loadTeamSettingsData(teamId);
  const base = `/teams/${teamId}/console`;
  const disabledModels = new Set(policy.disabledModels);
  const disabledGroups = new Set(policy.disabledGroups);
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <Link
          href={base}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Link>
        <div className="mt-6">
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Team settings
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            {team.name}
          </h1>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="py-5">
              <form action={updateTeamAction} className="flex flex-col gap-3">
                <input type="hidden" name="team_id" value={teamId} />
                <p className="text-sm font-medium">Profile</p>
                <Input name="name" defaultValue={team.name} required />
                <Button className="self-start" variant="brand">
                  Save Team
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <form
                action={inviteTeamMemberAction}
                className="flex flex-col gap-3"
              >
                <input type="hidden" name="team_id" value={teamId} />
                <p className="text-sm font-medium">Invite member</p>
                <Input
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
                <select
                  name="role"
                  defaultValue="member"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button className="self-start" variant="brand">
                  <Send aria-hidden="true" />
                  Send invitation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Card>
            <CardContent className="py-5">
              <p className="text-sm font-medium">Billing management</p>
              <div className="mt-4 grid gap-3">
                <BillingMetric
                  label="Available balance"
                  value={fmtMoney(billingSummary.quota, status)}
                />
                <BillingMetric
                  label="Used credit"
                  value={fmtMoney(billingSummary.used, status)}
                />
                <BillingMetric
                  label="Total credit"
                  value={fmtMoney(billingSummary.total, status)}
                />
              </div>
            </CardContent>
          </Card>
          <TeamBillingClient teamId={teamId} status={status} />
        </div>

        <Card className="mt-4 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topups.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <code className="font-mono text-xs">
                      {invoice.reference || invoice.id}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "completed" ? "success" : "outline"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(invoice.creditUnits, status)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(invoice.money, status)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {invoice.ts ? fmtRelative(invoice.ts) : "new"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="mt-4">
          <CardContent className="py-5">
            <p className="text-sm font-medium">Members</p>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <code className="font-mono text-xs">{member.userId}</code>
                    </TableCell>
                    <TableCell>
                      <form
                        action={updateTeamMemberRoleAction}
                        className="flex gap-2"
                      >
                        <input type="hidden" name="team_id" value={teamId} />
                        <input
                          type="hidden"
                          name="user_id"
                          value={member.userId}
                        />
                        <select
                          name="role"
                          defaultValue={member.role}
                          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>{member.status}</TableCell>
                    <TableCell className="text-right">
                      <form action={removeTeamMemberAction}>
                        <input type="hidden" name="team_id" value={teamId} />
                        <input
                          type="hidden"
                          name="user_id"
                          value={member.userId}
                        />
                        <Button
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
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="py-5">
            <p className="text-sm font-medium">Invitations</p>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{invitation.role}</TableCell>
                    <TableCell>{invitation.status}</TableCell>
                    <TableCell className="text-right">
                      {invitation.status === "pending" ? (
                        <form action={revokeTeamInvitationAction}>
                          <input type="hidden" name="team_id" value={teamId} />
                          <input
                            type="hidden"
                            name="invitation_id"
                            value={invitation.id}
                          />
                          <Button variant="outline" size="sm">
                            Revoke
                          </Button>
                        </form>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="py-5">
            <form
              action={updateTeamPolicyAction}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="team_id" value={teamId} />
              <p className="text-sm font-medium">Policy</p>
              <div className="grid gap-4 lg:grid-cols-2">
                <PolicySwitchList
                  title="Models"
                  items={models.map((model) => ({
                    value: model,
                    label: model,
                  }))}
                  allName="all_models"
                  enabledName="enabled_models"
                  disabled={disabledModels}
                  mono
                />
                <PolicySwitchList
                  title="Groups"
                  items={groups.map((group) => ({
                    value: group.name,
                    label: group.name,
                    detail: group.label === group.name ? "" : group.label,
                  }))}
                  allName="all_groups"
                  enabledName="enabled_groups"
                  disabled={disabledGroups}
                />
              </div>
              <Button className="self-start" variant="brand">
                Save policy
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BillingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="truncate text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

function PolicySwitchList({
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
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {title}
      </p>
      <div className="mt-2 max-h-80 overflow-auto rounded-md border border-border bg-background">
        {items.map((item) => (
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
        ))}
      </div>
    </div>
  );
}
