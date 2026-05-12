import {
  ArrowRight,
  Compass,
  Flame,
  LifeBuoy,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ForbiddenPage() {
  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-center px-8 py-24">
          <div className="grid w-full max-w-3xl grid-cols-1 items-center gap-10 sm:grid-cols-[auto_1fr]">
            <div className="font-heading text-[10rem] leading-none font-medium tracking-tight text-brand sm:text-[14rem]">
              403
            </div>
            <div>
              <Badge variant="warning" className="gap-1">
                <ShieldAlert aria-hidden="true" />
                forbidden
              </Badge>
              <h1 className="mt-4 max-w-[18ch] font-heading text-3xl font-medium tracking-tight text-balance text-foreground">
                You don&apos;t have access to this page.
              </h1>
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
                The administrator of your workspace controls which routes are
                visible to you. Try heading back to a page you have access to.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  href="/console"
                  className={cn(buttonVariants({ variant: "brand" }))}
                >
                  Back to console
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
                <Link
                  href="/"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Go home
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto grid w-full max-w-[1200px] gap-px overflow-hidden bg-border px-0 sm:grid-cols-3">
            <Suggest
              href="/console"
              icon={Compass}
              label="Console"
              detail="Dashboard, keys, logs, wallet."
            />
            <Suggest
              href="/pricing"
              icon={Flame}
              label="Pricing"
              detail="Model catalog and per-token prices."
            />
            <Suggest
              href="/broadcasts"
              icon={LifeBuoy}
              label="Broadcasts"
              detail="Maintenance and release notes."
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Suggest({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 bg-background px-5 py-5 transition-colors hover:bg-muted/40"
    >
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-emphasis">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <ArrowRight
        aria-hidden="true"
        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
