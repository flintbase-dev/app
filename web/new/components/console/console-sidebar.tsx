"use client";

import {
  ArrowLeft,
  BookOpen,
  ChevronsUpDown,
  CircleUser,
  CreditCard,
  ExternalLink,
  Flame,
  Inbox,
  Key,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  RadioTower,
  ScrollText,
  Settings,
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
import { Separator } from "@/components/ui/separator";
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
    Boolean(teamId) && pathname === `${consoleRoot}/settings`;
  const navSections = isTeamSettingsRoute
    ? [
        {
          label: "Org Settings",
          items: [
            {
              label: "Team settings",
              href: "/console/settings",
              icon: Settings,
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
              ...(isTeamAdmin
                ? [
                    { label: "Billing", href: "/console/topup", icon: Wallet },
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
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-2 p-2 hover:bg-sidebar-accent"
        >
          <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-xs font-medium text-brand-emphasis">
            {initials(currentTeam ? currentTeam.name : user.displayName)}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-foreground">
              {currentTeam ? currentTeam.name : user.displayName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
              {currentTeam ? "team context" : fmtMoney(user.balance, status)}
            </p>
          </div>
          <ChevronsUpDown
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        </Button>
        <div className="mt-2 grid gap-1">
          <Link
            href="/console"
            className={cn(
              buttonVariants({
                variant: teamId ? "ghost" : "secondary",
                size: "sm",
              }),
              "justify-start",
            )}
          >
            Personal
          </Link>
          {accountContext.teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}/console`}
              className={cn(
                buttonVariants({
                  variant: team.id === teamId ? "secondary" : "ghost",
                  size: "sm",
                }),
                "justify-start truncate",
              )}
            >
              {team.name}
            </Link>
          ))}
          <Link
            href="/console/teams/new"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Create Team
          </Link>
        </div>
      </div>
    </aside>
  );
}
