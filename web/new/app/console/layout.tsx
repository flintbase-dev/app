import { CreditCard } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/console/auth-actions";
import { ConsoleSidebar } from "@/components/console/console-sidebar";
import { GlobalSearch } from "@/components/console/global-search";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { loadConsoleLayoutData } from "@/lib/console/data";
import { fmtMoney } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsoleLayoutShell>{children}</ConsoleLayoutShell>;
}

export async function ConsoleLayoutShell({
  children,
  teamId,
}: {
  children: React.ReactNode;
  teamId?: string;
}) {
  let layoutData: Awaited<ReturnType<typeof loadConsoleLayoutData>>;
  try {
    layoutData = await loadConsoleLayoutData(teamId);
  } catch (error) {
    if (isUnauthorizedConsoleError(error)) {
      redirect(
        `/login?return_to=${encodeURIComponent(
          teamId ? `/teams/${teamId}/console` : "/console",
        )}`,
      );
    }
    throw error;
  }

  const { user, status, unread, accountContext, currentTeam } = layoutData;
  const consoleRoot = teamId ? `/teams/${teamId}/console` : "/console";
  const balance = currentTeam ? currentTeam.balance : user.balance;
  return (
    <div className="isolate flex min-h-dvh w-full flex-1 antialiased">
      <ConsoleSidebar
        user={user}
        status={status}
        accountContext={accountContext}
        currentTeam={currentTeam}
        teamId={teamId}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:inline">
              {currentTeam ? "Team balance" : "Balance"}
            </span>
            <span className="font-mono text-sm font-medium tabular-nums text-foreground">
              {fmtMoney(balance, status)}
            </span>
            {teamId && currentTeam?.role === "admin" ? (
              <Link
                href={`${consoleRoot}/topup`}
                className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
              >
                <CreditCard aria-hidden="true" />
                Billing
              </Link>
            ) : null}
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
    message.includes("no access token provided") ||
    message.includes("未登录") ||
    message.includes("未登入") ||
    message.includes("未提供 access token")
  );
}
