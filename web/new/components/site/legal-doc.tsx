import { ArrowUpRight, FileText } from "lucide-react";

import { extractHeadings, Markdown } from "@/components/site/markdown";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type LegalDocProps = {
  eyebrow: string;
  title: string;
  content: string;
  updated: string;
  version?: string;
};

export function LegalDoc({
  eyebrow,
  title,
  content,
  updated,
  version = "v1.0",
}: LegalDocProps) {
  const headings = extractHeadings(content);

  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 px-8 py-16 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-heading text-lg font-medium tracking-tight">
              {title}
            </h2>
            <Badge variant="outline" className="mt-3 gap-1">
              <FileText aria-hidden="true" />
              {version} · {updated}
            </Badge>
            <Separator className="my-5" />
            <nav>
              <p className="mb-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Sections
              </p>
              <ol className="flex flex-col gap-1 text-sm">
                {headings.map((h, i) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="flex items-baseline gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-pretty">{h.text}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <a
              href="mailto:support@flint.dev"
              className="mt-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Questions?
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </a>
          </aside>
          <article className="min-w-0">
            <Markdown content={content} />
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
