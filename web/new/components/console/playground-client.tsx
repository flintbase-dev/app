"use client";

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
import { useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UserGroup } from "@/lib/console/types";
import { cn } from "@/lib/utils";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: "system",
    content:
      "You are a precise, terminal-grade assistant. Answer with verifiable facts only.",
  },
  {
    role: "user",
    content:
      "Compare claude-sonnet-4-6 vs gpt-5 for code generation. 3 bullets.",
  },
  {
    role: "assistant",
    content:
      "Use this playground to send the prompt to the selected backend model.",
  },
];

const PLAYGROUND_CHAT_COMPLETIONS_ENDPOINT = "/api/playground/chat/completions";

export function PlaygroundClient({
  groups,
  initialModel,
  models,
}: {
  groups: UserGroup[];
  initialModel?: string;
  models: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState(
    initialModel && models.includes(initialModel)
      ? initialModel
      : models[0] || "",
  );
  const [group, setGroup] = useState(groups[0]?.name || "default");
  const [parametersOpen, setParametersOpen] = useState(false);
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("1024");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestMessages = useMemo(
    () => messages.filter((message) => message.content.trim()),
    [messages],
  );

  function send(nextMessages = requestMessages) {
    if (!model) {
      setError("No model is available for this user.");
      return;
    }
    setError("");
    startTransition(async () => {
      const payload = {
        model,
        group,
        messages: nextMessages,
        stream: false,
        temperature: Number(temperature),
        max_tokens: Number(maxTokens),
      };
      const response = await fetch(PLAYGROUND_CHAT_COMPLETIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      } | null;
      if (!response.ok || data?.error) {
        setError(
          data?.error?.message || `Request failed with ${response.status}`,
        );
        return;
      }
      const content =
        data?.choices?.[0]?.message?.content ||
        "The model returned no content.";
      setMessages([...nextMessages, { role: "assistant", content }]);
    });
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <Select
          onValueChange={(value) => {
            if (value) setModel(value);
          }}
          value={model}
        >
          <SelectTrigger size="sm">
            <Sparkles aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => {
            if (value) setGroup(value);
          }}
          value={group}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groups.map((item) => (
              <SelectItem key={item.name} value={item.name}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          aria-pressed={parametersOpen}
          variant="ghost"
          size="sm"
          onClick={() => setParametersOpen((value) => !value)}
        >
          <Settings2 aria-hidden="true" />
          Parameters
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {pending ? "running" : `${requestMessages.length} messages`}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Reset"
          onClick={() => {
            setDraft("");
            setError("");
            setMessages(INITIAL_MESSAGES);
          }}
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>

      {parametersOpen ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-background px-4 py-2 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            Temperature
            <input
              className="h-8 w-20 rounded-md border border-border bg-background px-2 font-mono text-foreground"
              max="2"
              min="0"
              onChange={(event) => setTemperature(event.target.value)}
              step="0.1"
              type="number"
              value={temperature}
            />
          </label>
          <label className="flex items-center gap-2">
            Max tokens
            <input
              className="h-8 w-24 rounded-md border border-border bg-background px-2 font-mono text-foreground"
              min="1"
              onChange={(event) => setMaxTokens(event.target.value)}
              step="1"
              type="number"
              value={maxTokens}
            />
          </label>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 lg:px-0 lg:py-10">
          {messages.map((message, index) => (
            <MessageBlock
              key={`${message.role}-${index}`}
              message={message}
              onCopy={() => void navigator.clipboard.writeText(message.content)}
              onDelete={() =>
                setMessages((items) =>
                  items.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              onRerun={() => {
                const history = messages.slice(0, index + 1);
                send(history.filter((item) => item.role !== "assistant"));
              }}
            />
          ))}
          {error ? (
            <div className="rounded-md border-l-2 border-danger bg-danger-bg p-3 text-sm text-danger-dark">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-background">
        <div className="mx-auto w-full max-w-3xl p-3">
          <div className="rounded-xl border border-border bg-card p-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask anything..."
              className="min-h-0 resize-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file)
                  setDraft((value) => `${value}\n[image: ${file.name}]`.trim());
              }}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Attach"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="System prompt"
                onClick={() =>
                  setMessages((items) =>
                    items.some((item) => item.role === "system")
                      ? items
                      : [
                          {
                            role: "system",
                            content:
                              "You are a precise assistant. Follow the user request exactly.",
                          },
                          ...items,
                        ],
                  )
                }
              >
                <Wand2 aria-hidden="true" />
              </Button>
              <Button
                variant="brand"
                size="sm"
                className="ml-auto"
                disabled={pending || !draft.trim()}
                onClick={() => {
                  const nextMessages = [
                    ...requestMessages,
                    { role: "user" as const, content: draft.trim() },
                  ];
                  setMessages(nextMessages);
                  setDraft("");
                  send(nextMessages);
                }}
              >
                <ArrowUp aria-hidden="true" />
                {pending ? "Sending" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({
  message,
  onCopy,
  onDelete,
  onRerun,
}: {
  message: Message;
  onCopy: () => void;
  onDelete: () => void;
  onRerun: () => void;
}) {
  const Avatar =
    message.role === "assistant" ? Bot : message.role === "user" ? User : Wand2;
  const avatarBg =
    message.role === "assistant"
      ? "bg-brand-subtle text-brand-emphasis"
      : message.role === "user"
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
            {message.role}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copy"
              onClick={onCopy}
            >
              <Copy aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Re-run"
              onClick={onRerun}
            >
              <RefreshCw aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {message.content}
        </p>
      </div>
    </div>
  );
}
