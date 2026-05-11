import { ChevronLeft, ChevronRight, Rss } from "lucide-react";
import Link from "next/link";

import { Markdown } from "@/components/site/markdown";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BROADCASTS } from "@/lib/public-content";
import { cn } from "@/lib/utils";

function fmtMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function BroadcastsPage() {
  const items = BROADCASTS;

  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1100px] px-8 py-16">
          <div className="grid gap-12 lg:grid-cols-[18rem_1fr]">
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <p className="text-[11px] font-medium tracking-[0.07em] text-brand uppercase">
                Public announcements
              </p>
              <h1 className="mt-3 font-heading text-4xl font-medium tracking-tight">
                Broadcasts
              </h1>
              <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
                A chronological log of every operational notice, model release,
                and API change.
              </p>
              <a
                href="/broadcasts.rss"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-6",
                )}
              >
                <Rss aria-hidden="true" />
                RSS feed
              </a>
            </aside>

            <div className="min-w-0">
              <ol className="relative border-border lg:border-l lg:pl-10">
                {items.map((b, i) => (
                  <li key={b.id} className="relative pb-12 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="absolute top-2 -left-[2.65rem] hidden size-2 rounded-full border-2 border-background bg-brand lg:block"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
                        {fmtMonthYear(b.sent_at)}
                      </span>
                      {i === 0 ? <Badge variant="brand">latest</Badge> : null}
                    </div>
                    <h2 className="mt-2 max-w-[36ch] font-heading text-xl font-medium tracking-tight text-balance text-foreground">
                      {b.title}
                    </h2>
                    <div className="mt-3 text-sm">
                      <Markdown content={b.content} />
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  Page{" "}
                  <Link href="#" className="text-foreground">
                    1
                  </Link>{" "}
                  of 1
                </span>
                <Button variant="ghost" size="icon-sm" aria-label="Next page">
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
