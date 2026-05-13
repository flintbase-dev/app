"use client";

import { Check, Copy, Eye, Link2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { revealTokenKeyAction } from "@/lib/console/actions";

export function TokenSecretButton({
  tokenId,
  mode,
  connectionBase,
  teamId,
}: {
  tokenId: string;
  mode: "reveal" | "copy" | "connection";
  connectionBase?: string;
  teamId?: string;
}) {
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const label =
    mode === "connection"
      ? "Connection string"
      : mode === "copy"
        ? "Copy key"
        : "Reveal key";
  const Icon = copied
    ? Check
    : mode === "connection"
      ? Link2
      : mode === "copy"
        ? Copy
        : Eye;

  function run() {
    startTransition(async () => {
      const key = secret || (await revealTokenKeyAction(tokenId, teamId));
      setSecret(key);
      if (mode === "copy" || mode === "connection") {
        const value =
          mode === "connection"
            ? JSON.stringify({
                _type: "openai",
                key,
                url: connectionBase || globalThis.location.origin,
              })
            : key;
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : label}
      disabled={pending}
      onClick={run}
      title={mode === "reveal" && secret ? secret : label}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
