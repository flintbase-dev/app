import {
  BookOpen,
  ChevronsUpDown,
  CircleUser,
  CreditCard,
  ExternalLink,
  Flame,
  Inbox,
  Key,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/console/auth-actions";
import { GlobalSearch } from "@/components/console/global-search";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadConsoleLayoutData } from "@/lib/console/data";
import { fmtMoney, initials } from "@/lib/console/format";
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

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsoleLayoutShell>{children}</ConsoleLayoutShell>;
}

async function ConsoleLayoutShell({ children }: { children: React.ReactNode }) {
  let layoutData: Awaited<ReturnType<typeof loadConsoleLayoutData>>;
  try {
    layoutData = await loadConsoleLayoutData();
  } catch (error) {
    if (isUnauthorizedConsoleError(error)) {
      redirect(`/login?return_to=${encodeURIComponent("/console")}`);
    }
    throw error;
  }

  const { user, status, unread } = layoutData;
  return (
    <div className="isolate flex min-h-dvh w-full flex-1 antialiased">
      {/* Sidebar */}
      <aside className="hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:sticky lg:top-0 lg:flex">
        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                {section.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          "group flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

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

        {/* User block */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-2 p-2 hover:bg-sidebar-accent"
          >
            <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle font-mono text-xs font-medium text-brand-emphasis">
              {initials(user.displayName)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">
                {user.displayName}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
                {fmtMoney(user.balance, status)}
              </p>
            </div>
            <ChevronsUpDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
              Balance
            </span>
            <span className="font-mono text-sm font-medium tabular-nums text-foreground">
              {fmtMoney(user.balance, status)}
            </span>
            <Link
              href="/console/topup"
              className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
            >
              <CreditCard aria-hidden="true" />
              Top up
            </Link>
            {unread > 0 ? (
              <Link href="/console/messages">
                <Badge variant="brand" className="px-1.5">
                  {unread}
                </Badge>
              </Link>
            ) : null}
            <Separator orientation="vertical" className="mx-1 h-5" />
            <LogoutButton />
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col bg-muted/40">
          {children}
        </main>
      </div>
    </div>
  );
}

function isUnauthorizedConsoleError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("unauthorized") ||
    message.includes("not logged in") ||
    message.includes("no access token provided")
  );
}
