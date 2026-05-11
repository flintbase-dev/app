import { ArrowDownRight, ArrowLeft, Mail, Share2, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/components/site/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { transferAffQuotaAction } from "@/lib/console/actions";
import { loadTopupData } from "@/lib/console/data";
import { fmtMoney, fmtNum } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function InvitePage() {
  const { status, user, affCode } = await loadTopupData();
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const code = affCode || user.affCode;
  const link = `${origin}/login?screen_hint=sign-up&aff=${encodeURIComponent(code)}`;
  const shareText = `Join Flint with my invite code ${code}: ${link}`;

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <Link
            href="/console/topup"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            Wallet
          </Link>
        </div>

        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Refer · Earn credit
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Invite friends to Flint.
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          When a friend signs up with your link, invite credit is tracked in
          your account and can be transferred into your wallet.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Stat label="Signups" value={fmtNum(user.affCount)} icon={Users} />
          <Stat label="Paying" value={fmtNum(user.affCount)} icon={Users} />
          <Stat
            label="Pending"
            value={fmtMoney(user.affQuota, status)}
            icon={ArrowDownRight}
          />
          <Stat
            label="Earned"
            value={fmtMoney(user.affHistoryQuota, status)}
            icon={ArrowDownRight}
          />
        </div>

        <Card className="mt-6">
          <CardContent className="flex flex-col gap-4 py-5">
            <div>
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Your link
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted p-2 pl-3">
                <code className="flex-1 truncate font-mono text-sm text-foreground">
                  {link}
                </code>
                <CopyButton
                  value={link}
                  variant="outline"
                  size="sm"
                  showLabel
                />
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
                Code: <span className="text-foreground">{code}</span>
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`mailto:?subject=Join Flint&body=${encodeURIComponent(shareText)}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Mail aria-hidden="true" />
                Share via email
              </Link>
              <Link
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Share2 aria-hidden="true" />
                Share on X
              </Link>
              <CopyButton
                value={shareText}
                variant="outline"
                size="default"
                showLabel
                label="Copy share text"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="flex items-center justify-between gap-4 py-5">
            <div>
              <p className="text-sm font-medium text-foreground">
                Transfer earnings to wallet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Move{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {fmtMoney(user.affQuota, status)}
                </span>{" "}
                of vested credit into your wallet balance.
              </p>
            </div>
            <form action={transferAffQuotaAction}>
              <input type="hidden" name="quota" value={user.affQuota} />
              <Button disabled={user.affQuota <= 0} variant="brand">
                <ArrowDownRight aria-hidden="true" />
                Transfer
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        <p className="text-[10px] font-medium tracking-[0.07em] uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1 font-mono text-xl font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
