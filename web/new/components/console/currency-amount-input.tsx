"use client";

import { HelpCircle } from "lucide-react";
import type * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CurrencyAmountContext = {
  siteCreditsPerPriceUnit?: number;
  currencySymbol?: string;
  quotaDisplayType?: string;
};

type CurrencyAmountInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type"
> & {
  status: CurrencyAmountContext;
  inputClassName?: string;
};

export function CurrencyAmountInput({
  status,
  className,
  inputClassName,
  step = "0.000001",
  min = "0",
  inputMode = "decimal",
  "aria-label": ariaLabel = "Amount",
  ...props
}: CurrencyAmountInputProps) {
  const symbol = status.currencySymbol || "$";
  const unit = status.quotaDisplayType || "USD";
  const creditUnit = Number(status.siteCreditsPerPriceUnit || 1_000_000);
  const hint = `${unit} 1 = ${creditUnit.toLocaleString("en-US")} system credit units`;

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <span className="font-mono tabular-nums">{symbol}</span>
      </InputGroupAddon>
      <InputGroupInput
        type="number"
        step={step}
        min={min}
        inputMode={inputMode}
        aria-label={ariaLabel}
        className={cn("tabular-nums", inputClassName)}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="flex size-6 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label="Credit conversion"
                >
                  <HelpCircle aria-hidden="true" className="size-4" />
                </button>
              }
            />
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </InputGroupAddon>
    </InputGroup>
  );
}
