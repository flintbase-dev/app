import Link from "next/link";
import { cn } from "@/lib/utils";

type MarkdownProps = {
  content: string;
  className?: string;
};

export function Markdown({ content, className }: MarkdownProps) {
  const blocks = parseBlocks(content);
  return (
    <div
      className={cn(
        "flex flex-col gap-4 text-[15px] leading-relaxed text-foreground [&_a]:text-brand [&_a]:underline-offset-4 hover:[&_a]:underline [&_code]:rounded-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-medium",
        className,
      )}
    >
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    blocks.push({ kind: "para", text: buffer.join(" ") });
    buffer = [];
  };
  const flushList = () => {
    if (!listBuffer) return;
    blocks.push({ kind: "list", ...listBuffer });
    listBuffer = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === "") {
      flushBuffer();
      flushList();
      continue;
    }
    const h3 = /^###\s+(.*)$/.exec(line);
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      flushBuffer();
      flushList();
      blocks.push({ kind: "heading", level: 2, text: h2[1] });
      continue;
    }
    if (h3) {
      flushBuffer();
      flushList();
      blocks.push({ kind: "heading", level: 3, text: h3[1] });
      continue;
    }
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ol || ul) {
      flushBuffer();
      const isOrdered = !!ol;
      const item = (ol?.[1] ?? ul?.[1]) as string;
      if (listBuffer && listBuffer.ordered !== isOrdered) flushList();
      if (!listBuffer) listBuffer = { ordered: isOrdered, items: [] };
      listBuffer.items.push(item);
      continue;
    }
    flushList();
    buffer.push(line);
  }
  flushBuffer();
  flushList();
  return blocks;
}

function renderBlock(b: Block, i: number) {
  if (b.kind === "heading") {
    const Tag = b.level === 2 ? "h2" : "h3";
    return (
      <Tag
        key={i}
        id={slug(b.text)}
        className={cn(
          "mt-3 scroll-mt-24 font-heading font-medium tracking-tight text-foreground",
          b.level === 2 ? "text-xl" : "text-base",
        )}
      >
        {renderInline(b.text)}
      </Tag>
    );
  }
  if (b.kind === "list") {
    const items = b.items.map((it, j) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static markdown — items don't reorder
      <li key={j}>{renderInline(it)}</li>
    ));
    return b.ordered ? (
      <ol
        key={i}
        className="ml-5 flex list-decimal flex-col gap-1.5 text-pretty marker:text-muted-foreground"
      >
        {items}
      </ol>
    ) : (
      <ul
        key={i}
        className="ml-5 flex list-disc flex-col gap-1.5 text-pretty marker:text-muted-foreground"
      >
        {items}
      </ul>
    );
  }
  const emText = /^_(.+)_$/.exec(b.text.trim());
  if (emText) {
    return (
      <p key={i} className="text-pretty text-muted-foreground italic">
        {renderInline(emText[1])}
      </p>
    );
  }
  return (
    <p key={i} className="text-pretty">
      {renderInline(b.text)}
    </p>
  );
}

function renderInline(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: legible regex loop
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const tok = match[0];
    if (tok.startsWith("**")) {
      parts.push(<strong key={i}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("`")) {
      parts.push(<code key={i}>{tok.slice(1, -1)}</code>);
    } else {
      const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (m) {
        const isExternal = /^https?:/.test(m[2]);
        parts.push(
          isExternal ? (
            <a
              key={i}
              href={m[2]}
              target="_blank"
              rel="noreferrer"
              className="text-brand"
            >
              {m[1]}
            </a>
          ) : (
            <Link key={i} href={m[2]} className="text-brand">
              {m[1]}
            </Link>
          ),
        );
      }
    }
    lastIndex = match.index + tok.length;
    i++;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

export function extractHeadings(
  content: string,
): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  for (const line of content.split("\n")) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) out.push({ id: slug(m[1]), text: m[1] });
  }
  return out;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
