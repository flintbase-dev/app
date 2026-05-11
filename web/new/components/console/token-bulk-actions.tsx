"use client";

import { Copy, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { revealTokenKeysBatchAction } from "@/lib/console/actions";

export function TokenBulkCopyButton({ ids }: { ids: string[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending || ids.length === 0}
      variant="outline"
      size="sm"
      type="button"
      onClick={() => {
        startTransition(async () => {
          const keys = await revealTokenKeysBatchAction(ids);
          await navigator.clipboard.writeText(
            keys.map((item) => `${item.id}: ${item.key}`).join("\n"),
          );
        });
      }}
    >
      <Copy aria-hidden="true" />
      {pending ? "Copying" : "Bulk copy"}
    </Button>
  );
}

export function TokenBulkDeleteButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button
      disabled={disabled}
      variant="outline"
      size="sm"
      className="text-destructive"
    >
      <Trash2 aria-hidden="true" />
      Delete selected
    </Button>
  );
}
