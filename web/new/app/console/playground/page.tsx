import {
  ArrowUp,
  Bot,
  ChevronDown,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  User,
  Wand2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUPS, USER_MODELS } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const SAMPLE_MESSAGES = [
  {
    role: "system" as const,
    content:
      "You are a precise, terminal-grade assistant. Answer with verifiable facts only.",
  },
  {
    role: "user" as const,
    content:
      "Compare claude-sonnet-4-6 vs gpt-5 for code generation. 3 bullets.",
  },
  {
    role: "assistant" as const,
    content:
      "• **Sonnet 4.6** — Better adherence to long instruction blocks; tends to refactor before answering.\n• **GPT-5** — Faster on short prompts; stronger TypeScript inference at the type level.\n• **Verdict** — Sonnet for codebase edits, GPT-5 for ad-hoc snippets.",
  },
];

export default function PlaygroundPage() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col">
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <SelectStub
          value="claude-sonnet-4-6"
          options={USER_MODELS}
          icon={<Sparkles aria-hidden="true" className="size-3.5" />}
        />
        <SelectStub value="default" options={GROUPS.map((g) => g.name)} />
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <Settings2 aria-hidden="true" />
          Parameters
        </button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          ~$0.0048 est
        </span>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
          aria-label="Reset"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 lg:px-0 lg:py-10">
          {SAMPLE_MESSAGES.map((m, i) => (
            <MessageBlock key={i} {...m} />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="mx-auto w-full max-w-3xl p-3">
          <div className="rounded-xl border border-border bg-card p-2">
            <textarea
              className="w-full resize-none border-0 bg-transparent p-2 text-sm leading-relaxed outline-none"
              rows={2}
              placeholder="Ask anything…"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                )}
                aria-label="Attach"
              >
                <ImageIcon aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                )}
                aria-label="System prompt"
              >
                <Wand2 aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "brand", size: "sm" }),
                  "ml-auto",
                )}
              >
                <ArrowUp aria-hidden="true" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectStub({
  value,
  options: _options,
  icon,
}: {
  value: string;
  options: string[];
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-sm text-foreground transition-colors hover:bg-muted"
    >
      {icon}
      <span className="truncate font-mono text-xs">{value}</span>
      <ChevronDown
        aria-hidden="true"
        className="ml-auto size-3 text-muted-foreground"
      />
    </button>
  );
}

function MessageBlock({
  role,
  content,
}: {
  role: "system" | "user" | "assistant";
  content: string;
}) {
  const Avatar =
    role === "assistant" ? Bot : role === "user" ? User : Wand2;
  const avatarBg =
    role === "assistant"
      ? "bg-brand-subtle text-brand-emphasis"
      : role === "user"
        ? "bg-muted text-foreground"
        : "bg-warning-bg text-warning-dark";

  return (
    <div className="flex gap-3">
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
          avatarBg,
        )}
        aria-hidden="true"
      >
        <Avatar className="size-4" />
      </span>
      <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            {role}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-xs" }),
              )}
              aria-label="Copy"
            >
              <Copy aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-xs" }),
              )}
              aria-label="Re-run"
            >
              <RefreshCw aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-xs" }),
              )}
              aria-label="Delete"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {content}
        </p>
      </div>
    </div>
  );
}
