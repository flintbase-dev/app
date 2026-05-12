import { Flame } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { NAV_ITEMS, SYSTEM_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  theme?: "light" | "dark";
  active?: string;
};

export function SiteHeader({ theme = "light", active }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        theme === "dark" &&
          "dark scheme-only-dark bg-background/85 text-foreground supports-[backdrop-filter]:bg-background/60",
      )}
    >
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
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                item.label === active && "text-foreground",
              )}
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
