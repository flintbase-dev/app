"use client";

import { Check, Copy, Eye, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { generateAccessTokenAction } from "@/lib/console/actions";

export function AccessTokenActions({ token }: { token: string }) {
  const [value, setValue] = useState(token);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function reset() {
    startTransition(async () => {
      const next = await generateAccessTokenAction();
      setValue(next);
      setVisible(true);
      await navigator.clipboard.writeText(next);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <>
      <code className="flex-1 truncate font-mono text-sm text-foreground">
        {visible ? value : mask(value)}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Reveal"
        onClick={() => setVisible((current) => !current)}
      >
        <Eye aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={copy}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={reset}
      >
        <RefreshCw aria-hidden="true" />
        Reset token
      </Button>
    </>
  );
}

function mask(value: string): string {
  if (!value) return "not generated";
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}
