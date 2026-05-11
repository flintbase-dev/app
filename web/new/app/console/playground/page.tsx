import {
  ArrowUp,
  Bot,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  User,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
        <Select defaultValue="claude-sonnet-4-6">
          <SelectTrigger size="sm">
            <Sparkles aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USER_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select defaultValue="default">
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((g) => (
              <SelectItem key={g.name} value={g.name}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm">
          <Settings2 aria-hidden="true" />
          Parameters
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          ~$0.0048 est
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Reset">
          <RefreshCw aria-hidden="true" />
        </Button>
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
            <Textarea
              rows={2}
              placeholder="Ask anything…"
              className="min-h-0 resize-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0"
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Attach">
                <ImageIcon aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="System prompt">
                <Wand2 aria-hidden="true" />
              </Button>
              <Button variant="brand" size="sm" className="ml-auto">
                <ArrowUp aria-hidden="true" />
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({
  role,
  content,
}: {
  role: "system" | "user" | "assistant";
  content: string;
}) {
  const Avatar = role === "assistant" ? Bot : role === "user" ? User : Wand2;
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
            <Button variant="ghost" size="icon-xs" aria-label="Copy">
              <Copy aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Re-run">
              <RefreshCw aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Delete">
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {content}
        </p>
      </div>
    </div>
  );
}
