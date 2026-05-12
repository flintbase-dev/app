import { Flame } from "lucide-react";
import Link from "next/link";

import { DOCS_URL, SYSTEM_NAME } from "@/lib/site";

export function SiteFooter() {
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
