import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Flame,
  KeyRound,
  Terminal,
} from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/site/copy-button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { loadPublicContent } from "@/lib/console/data";
import { cn } from "@/lib/utils";

const ENDPOINTS: { method: "POST" | "GET"; path: string; label: string }[] = [
  { method: "POST", path: "/v1/chat/completions", label: "Chat completions" },
  { method: "POST", path: "/v1/responses", label: "Responses" },
  { method: "POST", path: "/v1/responses/compact", label: "Compact responses" },
  { method: "POST", path: "/v1/messages", label: "Messages" },
  { method: "GET", path: "/v1beta/models", label: "Models" },
  { method: "POST", path: "/v1/images", label: "Images" },
];

export default async function Home() {
  const { status } = await loadPublicContent();
  const baseUrl = status.serverAddress || globalDefaultBaseUrl();
  const docsUrl = status.docsLink;
  const systemName = status.systemName;
  return (
    <div className="dark scheme-only-dark isolate flex min-h-dvh flex-1 flex-col bg-background text-foreground antialiased">
      <SiteHeader theme="dark" />

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="border-b border-border">
          <div className="mx-auto w-full max-w-[1200px] px-8 py-32 sm:py-40">
            <div className="flex flex-col items-start">
              <Badge
                variant="outline"
                className="mb-8 gap-1.5 rounded-full border-border-emphasis bg-transparent px-3 py-1 text-[11px] font-medium tracking-[0.07em] text-brand uppercase"
              >
                <Flame className="size-3" aria-hidden="true" />
                OpenAI-compatible
              </Badge>

              <h1 className="max-w-[20ch] font-heading text-5xl font-medium tracking-tight text-balance text-foreground sm:text-6xl lg:text-7xl">
                Inference, on demand.
              </h1>

              <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-pretty text-muted-foreground">
                {systemName} is a developer-first inference platform. One base
                URL, one API key, every modern model — addressable through the
                exact endpoints you already use.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href="/console"
                  className={cn(
                    buttonVariants({ variant: "brand", size: "lg" }),
                  )}
                >
                  <KeyRound aria-hidden="true" />
                  Get an API key
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                  )}
                >
                  <BookOpen aria-hidden="true" />
                  Read the docs
                  <ExternalLink aria-hidden="true" data-icon="inline-end" />
                </a>
              </div>

              {/* Base URL panel */}
              <div className="mt-16 w-full max-w-3xl">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  <Terminal className="size-3.5" aria-hidden="true" />
                  Service base
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 pl-4">
                  <code className="flex-1 truncate font-mono text-sm tabular-nums text-foreground">
                    {baseUrl}
                  </code>
                  <CopyButton
                    value={baseUrl}
                    label="Copy base URL"
                    showLabel
                    variant="ghost"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <div className="mx-auto w-full max-w-[1200px] px-8 py-24">
            <div className="grid gap-12 lg:grid-cols-[24rem_1fr]">
              <div>
                <p className="text-[11px] font-medium tracking-[0.07em] text-brand uppercase">
                  Data plane
                </p>
                <h2 className="mt-4 max-w-[24ch] font-heading text-3xl font-medium tracking-tight text-balance text-foreground">
                  Drop-in endpoints.
                </h2>
                <p className="mt-4 max-w-[48ch] text-base text-pretty text-muted-foreground">
                  Replace your provider&apos;s base URL with{" "}
                  <code className="font-mono text-sm text-foreground">
                    {baseUrl}
                  </code>
                  . Everything else stays the same.
                </p>
              </div>

              <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
                {ENDPOINTS.map((ep) => (
                  <li
                    key={ep.path}
                    className="flex items-center gap-4 bg-card px-5 py-4"
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 items-center justify-center rounded-xs px-1.5 font-mono text-[11px] font-medium tracking-wide tabular-nums",
                        ep.method === "GET"
                          ? "bg-info-bg text-info-dark"
                          : "bg-brand-subtle text-brand-emphasis",
                      )}
                    >
                      {ep.method}
                    </span>
                    <code className="flex-1 truncate font-mono text-sm text-foreground">
                      {ep.path}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {ep.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function globalDefaultBaseUrl(): string {
  return "https://api.flint.dev";
}
