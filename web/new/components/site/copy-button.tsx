"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  showLabel?: boolean;
};

export function CopyButton({
  value,
  label = "Copy",
  className,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? (size === "icon-sm" ? "sm" : size) : size}
      onClick={onCopy}
      aria-label={copied ? "Copied" : label}
      className={cn(className)}
    >
      <Icon aria-hidden="true" />
      {showLabel ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
