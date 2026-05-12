"use client";

import {
  ArrowLeft,
  ExternalLink,
  Maximize2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ChatClient, Token } from "@/lib/console/types";
import { cn } from "@/lib/utils";

export function ChatRunner({
  baseURL,
  client,
  token,
  url,
}: {
  baseURL: string;
  client: ChatClient;
  token: Token;
  url: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [frameKey, setFrameKey] = useState(0);

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col" ref={shellRef}>
      <div className="flex h-12 items-center gap-2 border-b border-border bg-background px-4">
        <Link
          href="/console/chat"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 gap-1.5",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Clients
        </Link>
        <span className="font-medium text-foreground">{client.name}</span>
        <Badge variant="brand" className="px-1.5">
          {token.name}
        </Badge>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          base {baseURL}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reload"
            onClick={() => {
              try {
                frameRef.current?.contentWindow?.location.reload();
              } catch {
                setFrameKey((value) => value + 1);
              }
            }}
          >
            <RefreshCw aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open externally"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Fullscreen"
            onClick={() => void shellRef.current?.requestFullscreen?.()}
          >
            <Maximize2 aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            onClick={() => window.location.assign("/console/token")}
          >
            <Settings2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <iframe
        key={frameKey}
        ref={frameRef}
        title={client.name}
        src={url}
        className="min-h-0 flex-1 border-0 bg-muted/40"
      />
    </div>
  );
}
