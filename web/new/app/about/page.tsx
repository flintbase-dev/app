import { Markdown } from "@/components/site/markdown";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ABOUT_CONTENT } from "@/lib/public-content";

export default function AboutPage() {
  return (
    <div className="isolate flex min-h-dvh flex-1 flex-col antialiased">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <p className="text-[11px] font-medium tracking-[0.07em] text-brand uppercase">
            About
          </p>
          <h1 className="mt-4 max-w-[20ch] font-heading text-5xl font-medium tracking-tight text-balance text-foreground sm:text-6xl">
            A grounded inference platform for developers.
          </h1>
          <div className="mt-10">
            <Markdown content={ABOUT_CONTENT} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
