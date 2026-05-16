"use client";

import {
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  ChevronsUpDown,
  CircleUser,
  CreditCard,
  ExternalLink,
  FileText,
  Flame,
  Inbox,
  Key,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Plus,
  RadioTower,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { workosLogoutAction } from "@/lib/console/actions";
import { fmtMoney, initials } from "@/lib/console/format";
import type {
  AccountContext,
  ConsoleStatus,
  ConsoleUser,
  Team,
} from "@/lib/console/types";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/console", icon: LayoutDashboard },
      { label: "Playground", href: "/console/playground", icon: Sparkles },
      { label: "Chat", href: "/console/chat", icon: MessageSquare },
      { label: "Logs", href: "/console/log", icon: ScrollText },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "API keys", href: "/console/token", icon: Key },
      { label: "Wallet", href: "/console/topup", icon: Wallet },
      { label: "Messages", href: "/console/messages", icon: Inbox },
      { label: "Personal", href: "/console/personal", icon: CircleUser },
    ],
  },
];

const ADMIN_ITEMS = [
  {
    label: "Channels",
    href: "/console/channel",
    icon: RadioTower,
    minRole: 10,
  },
  {
    label: "Models",
    href: "/console/models",
    icon: SlidersHorizontal,
    minRole: 10,
  },
  {
    label: "Redemptions",
    href: "/console/redemption",
    icon: TicketPercent,
    minRole: 10,
  },
  { label: "Users", href: "/console/user", icon: Users, minRole: 10 },
  {
    label: "Subscriptions",
    href: "/console/subscription",
    icon: CreditCard,
    minRole: 10,
  },
  {
    label: "Broadcasts",
    href: "/console/message-management",
    icon: Megaphone,
    minRole: 10,
  },
  { label: "Settings", href: "/console/setting", icon: Settings, minRole: 100 },
];

export function ConsoleSidebar({
  user,
  status,
  accountContext,
  currentTeam,
  teamId,
}: {
  user: ConsoleUser;
  status: ConsoleStatus;
  accountContext: AccountContext;
  currentTeam: Team | null;
  teamId?: string;
}) {
  const pathname = usePathname();
  const consoleRoot = teamId ? `/teams/${teamId}/console` : "/console";
  const isTeamAdmin = currentTeam?.role === "admin";
  const isTeamSettingsRoute =
    Boolean(teamId) && pathname.startsWith(`${consoleRoot}/settings`);
  const navSections = isTeamSettingsRoute
    ? [
        {
          label: "Org Settings",
          items: [
            { label: "General", href: "/console/settings", icon: Building2 },
            {
              label: "Members",
              href: "/console/settings/members",
              icon: Users,
            },
            {
              label: "Billing",
              href: "/console/settings/billing",
              icon: CreditCard,
            },
            {
              label: "Access policy",
              href: "/console/settings/policy",
              icon: Shield,
            },
          ],
        },
      ]
    : teamId
      ? [
          {
            label: "Team",
            items: [
              { label: "Dashboard", href: "/console", icon: LayoutDashboard },
              { label: "Logs", href: "/console/log", icon: ScrollText },
            ],
          },
          {
            label: "Account",
            items: [
              { label: "API keys", href: "/console/token", icon: Key },
              { label: "Billing", href: "/console/topup", icon: Wallet },
              ...(isTeamAdmin
                ? [
                    {
                      label: "Settings",
                      href: "/console/settings",
                      icon: Settings,
                    },
                  ]
                : []),
            ],
          },
        ]
      : NAV_SECTIONS.map((section) => ({
          ...section,
          items: section.items.map((item) =>
            item.href === "/console/topup"
              ? { ...item, label: "Billing" }
              : item,
          ),
        }));
  const adminItems = teamId
    ? []
    : ADMIN_ITEMS.filter((item) => user.role >= item.minRole);
  const scopedHref = (href: string) =>
    teamId && href.startsWith("/console")
      ? href.replace("/console", consoleRoot)
      : href;

  const activeLabel = currentTeam ? currentTeam.name : user.displayName;
  const activeMeta = currentTeam
    ? "team context"
    : fmtMoney(user.balance, status);
  const activeInitials = initials(activeLabel);

  return (
    <aside className="hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex">
      <div className="flex h-12 items-center border-b border-sidebar-border px-4">
        <Link
          href="/"
          aria-label="Homepage"
          className="flex items-center gap-2"
        >
          <Flame className="size-4 text-brand" aria-hidden="true" />
          <span className="font-heading text-sm font-medium tracking-tight text-foreground">
            Flint
          </span>
          <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
            console
          </Badge>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
        {isTeamSettingsRoute ? (
          <Link
            href={consoleRoot}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "justify-start",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Link>
        ) : null}

        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((it) => {
                const Icon = it.icon;
                const href = scopedHref(it.href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      className={cn(
                        "group flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {adminItems.length > 0 ? (
          <div>
            <p className="mb-1.5 px-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Admin
            </p>
            <ul className="flex flex-col gap-0.5">
              {adminItems.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <a
                      href={it.href}
                      className={cn(
                        "group flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{it.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto">
          <Separator className="my-3" />
          <ul className="flex flex-col gap-0.5">
            <li>
              <a
                href="https://docs.flint.dev"
                target="_blank"
                rel="noreferrer"
                className="group flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">Docs</span>
                <ExternalLink
                  aria-hidden="true"
                  className="ml-auto size-3 text-muted-foreground/60"
                />
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Popover>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex h-auto w-full items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent data-popup-open:bg-sidebar-accent"
              />
            }
          >
            <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-xs font-medium text-brand-emphasis">
              {activeInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {activeLabel}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                {activeMeta}
              </p>
            </div>
            <ChevronsUpDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-72 gap-0 p-0"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-sm font-medium text-brand-emphasis">
                {initials(user.displayName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Balance
              </span>
              <span className="font-mono text-xs tabular-nums text-foreground">
                {fmtMoney(user.balance, status)}
              </span>
            </div>
            <div className="p-2">
              <p className="mb-1 px-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Workspaces
              </p>
              <div className="flex flex-col gap-0.5">
                <Link
                  href="/console"
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    !teamId && "bg-accent/60 text-foreground",
                  )}
                >
                  <div className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-[10px] font-medium text-brand-emphasis">
                    {initials(user.displayName)}
                  </div>
                  <span className="flex-1 truncate">Personal</span>
                  {!teamId ? <Check className="size-3.5 text-brand" /> : null}
                </Link>
                {accountContext.teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/teams/${team.id}/console`}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                      team.id === teamId && "bg-accent/60 text-foreground",
                    )}
                  >
                    <div className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-medium text-muted-foreground">
                      {initials(team.name)}
                    </div>
                    <span className="flex-1 truncate">{team.name}</span>
                    {team.id === teamId ? (
                      <Check className="size-3.5 text-brand" />
                    ) : null}
                  </Link>
                ))}
                <Link
                  href="/console/teams/new"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <div className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
                    <Plus className="size-3" />
                  </div>
                  Create team
                </Link>
              </div>
            </div>
            <div className="border-t border-border p-2">
              <div className="flex flex-col gap-0.5">
                <Link
                  href="/user-agreement"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <FileText className="size-3.5 shrink-0" />
                  Terms of Service
                </Link>
                <Link
                  href="/privacy-policy"
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Shield className="size-3.5 shrink-0" />
                  Privacy Policy
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void workosLogoutAction();
                  }}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-danger-bg"
                >
                  <LogOut className="size-3.5 shrink-0" />
                  Log out
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
