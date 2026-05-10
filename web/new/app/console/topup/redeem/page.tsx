import { ArrowLeft, Gift, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CURRENT_USER, fmtMoney } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function RedeemPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-xl">
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
          Redeem code
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Add credit with a code
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Enter the redemption code you received. Credit is applied to your
          wallet immediately.
        </p>

        <Card className="mt-8">
          <CardContent className="flex flex-col gap-5 py-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Current balance
              </p>
              <p className="mt-1 font-mono text-2xl font-medium tabular-nums">
                {fmtMoney(CURRENT_USER.balance)}
              </p>
            </div>

            <Separator />

            <form className="flex flex-col gap-3">
              <label className="text-sm font-medium text-foreground">
                Redemption code
              </label>
              <Input
                placeholder="FLINT-XXXX-XXXX"
                className="font-mono tracking-tight uppercase"
              />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "brand" }))}
              >
                <Gift aria-hidden="true" />
                Redeem
              </button>
            </form>

            <div className="flex items-start gap-2 rounded-md border-l-2 border-info bg-info-bg p-3 text-info-dark">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4" />
              <div className="text-xs leading-relaxed">
                Codes are case-insensitive. Each code can only be used once.
                Expired or already-used codes will be rejected.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
