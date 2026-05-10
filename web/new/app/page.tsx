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
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SYSTEM_NAME = "Flint";
const BASE_URL = "https://api.flint.dev";
const DOCS_URL = "https://docs.flint.dev";

const ENDPOINTS: { method: "POST" | "GET"; path: string; label: string }[] = [
  { method: "POST", path: "/v1/chat/completions", label: "Chat completions" },
  { method: "POST", path: "/v1/responses", label: "Responses" },
  { method: "POST", path: "/v1/responses/compact", label: "Compact responses" },
  { method: "POST", path: "/v1/messages", label: "Messages" },
  { method: "GET", path: "/v1beta/models", label: "Models" },
  { method: "POST", path: "/v1/images", label: "Images" },
];

const NAV_ITEMS = [
  { label: "Models", href: "/pricing" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: DOCS_URL },
  { label: "Changelog", href: "#" },
];

export default function Home() {
  return (
    <div className="dark scheme-only-dark isolate flex min-h-dvh flex-1 flex-col bg-background text-foreground antialiased">
      <DarkNav />

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
                {SYSTEM_NAME} is a developer-first inference platform. One base
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
                  href={DOCS_URL}
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
                    {BASE_URL}
                  </code>
                  <CopyButton
                    value={BASE_URL}
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
                    {BASE_URL}
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

      <DarkFooter />
    </div>
  );
}

function DarkNav() {
  return (
    <header className="border-b border-border bg-background text-foreground">
      <div className="mx-auto flex h-12 w-full max-w-[1200px] items-center justify-between px-8">
        <Link
          href="/"
          aria-label="Homepage"
          className="flex items-center gap-2"
        >
          <Flame className="size-4 text-brand" aria-hidden="true" />
          <span className="font-heading text-sm font-medium tracking-tight text-foreground">
            {SYSTEM_NAME}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "max-sm:hidden",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/console"
            className={cn(buttonVariants({ variant: "brand", size: "sm" }))}
          >
            Get a key
          </Link>
        </div>
      </div>
    </header>
  );
}

function DarkFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-6 px-8 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-brand" aria-hidden="true" />
          <span className="font-heading text-sm font-medium text-foreground">
            {SYSTEM_NAME}
          </span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href={DOCS_URL}
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Docs
          </a>
          <Link
            href="/pricing"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/privacy-policy"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/user-agreement"
            className="text-sm font-normal text-muted-foreground hover:text-foreground"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
