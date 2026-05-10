import {
  ArrowDownRight,
  ArrowLeft,
  Copy,
  Mail,
  Share2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AFF, fmtMoney, fmtNum } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function InvitePage() {
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
          When a friend signs up with your link and makes their first paid
          request, you earn $5 credit and they get $5 too. Pending earnings
          unlock 30 days after the first paid request.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Stat label="Signups" value={fmtNum(AFF.signups)} icon={Users} />
          <Stat label="Paying" value={fmtNum(AFF.paying)} icon={Users} />
          <Stat
            label="Pending"
            value={fmtMoney(AFF.pending)}
            icon={ArrowDownRight}
          />
          <Stat
            label="Earned"
            value={fmtMoney(AFF.earnings)}
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
                  {AFF.link}
                </code>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  <Copy aria-hidden="true" />
                  Copy
                </button>
              </div>
              <p className="mt-2 font-mono text-xs tabular-nums text-muted-foreground">
                Code: <span className="text-foreground">{AFF.code}</span>
              </p>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Mail aria-hidden="true" />
                Share via email
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Share2 aria-hidden="true" />
                Share on X
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Share2 aria-hidden="true" />
                Copy share text
              </button>
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
                  {fmtMoney(AFF.earnings)}
                </span>{" "}
                of vested credit into your wallet balance.
              </p>
            </div>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "brand" }))}
            >
              <ArrowDownRight aria-hidden="true" />
              Transfer
            </button>
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
