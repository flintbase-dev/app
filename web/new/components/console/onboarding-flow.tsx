"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Flame,
  KeyRound,
  Loader2,
  Terminal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOnboardingTokenAction,
  updateDisplayNameAction,
} from "@/lib/console/actions";
import { cn } from "@/lib/utils";

type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; label: string; hint: string; skippable: boolean }[] =
  [
    {
      id: 1,
      label: "Your name",
      hint: "Tell us who you are",
      skippable: false,
    },
    {
      id: 2,
      label: "Create an API key",
      hint: "Make your first request",
      skippable: true,
    },
    {
      id: 3,
      label: "Add credits",
      hint: "Your first top up",
      skippable: true,
    },
  ];

const TOPUP_PRESETS = [5, 10, 25, 50];

function advanceTo(id: number) {
  document
    .getElementById(`onboarding-step-${id}`)
    ?.scrollIntoView({ behavior: "smooth" });
}

function useOnboardingState({
  initialFirst,
  initialLast,
  hasDisplayName,
}: {
  initialFirst: string;
  initialLast: string;
  hasDisplayName: boolean;
}) {
  const [step, setStep] = useState<StepId>(hasDisplayName ? 2 : 1);
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);
  const [nameSaved, setNameSaved] = useState(hasDisplayName);
  const [keyName, setKeyName] = useState("My first key");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | "">(10);

  return {
    step,
    setStep,
    first,
    setFirst,
    last,
    setLast,
    nameSaved,
    setNameSaved,
    keyName,
    setKeyName,
    createdKey,
    setCreatedKey,
    amount,
    setAmount,
  };
}

type OnboardingState = ReturnType<typeof useOnboardingState>;

export function OnboardingStackedSections({
  initialFirst,
  initialLast,
  hasDisplayName,
}: {
  initialFirst: string;
  initialLast: string;
  hasDisplayName: boolean;
}) {
  const state = useOnboardingState({
    initialFirst,
    initialLast,
    hasDisplayName,
  });
  const router = useRouter();

  const goToDashboard = () => {
    router.push("/console");
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-gradient-to-b from-brand/10 via-background to-background p-8 lg:flex">
        <div className="flex items-center gap-2">
          <Flame aria-hidden="true" className="size-4 text-brand" />
          <span className="font-heading text-sm font-medium tracking-tight text-foreground">
            Flint
          </span>
          <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px]">
            setup
          </Badge>
        </div>

        <ol className="flex flex-col">
          {STEPS.map((step, i) => {
            const isDone = isStepDone(step.id, state);
            const isActive = step.id === state.step;
            const isLocked = step.id > 1 && !state.nameSaved;
            return (
              <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                {i < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-7 bottom-0 left-[11px] w-px",
                      isDone ? "bg-brand" : "bg-border",
                    )}
                  />
                ) : null}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    state.setStep(step.id);
                    advanceTo(step.id);
                  }}
                  className={cn(
                    "flex items-start gap-3 text-left",
                    isLocked && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 inline-flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums transition-colors",
                      isDone && "border-brand bg-brand text-brand-foreground",
                      isActive &&
                        !isDone &&
                        "border-foreground bg-background text-foreground",
                      !isDone &&
                        !isActive &&
                        "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check aria-hidden="true" className="size-3" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {step.hint}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={!state.nameSaved}
          onClick={goToDashboard}
        >
          {state.nameSaved ? "Enter dashboard" : "Finish step 1 to continue"}
          <X aria-hidden="true" />
        </Button>
      </aside>

      <main className="flex-1 snap-y snap-mandatory overflow-y-auto">
        {STEPS.map((step) => (
          <Section
            key={step.id}
            step={step}
            state={state}
            onFinish={goToDashboard}
          />
        ))}
      </main>
    </div>
  );
}

function isStepDone(id: StepId, state: OnboardingState): boolean {
  if (id === 1) return state.nameSaved;
  if (id === 2) return state.createdKey !== null;
  return false;
}

function Section({
  step,
  state,
  onFinish,
}: {
  step: (typeof STEPS)[number];
  state: OnboardingState;
  onFinish: () => void;
}) {
  const isDone = isStepDone(step.id, state);
  const isLast = step.id === 3;
  const isLocked = step.id > 1 && !state.nameSaved;

  const continueAfter = () => {
    if (!isLast) {
      state.setStep((step.id + 1) as StepId);
      advanceTo(step.id + 1);
    } else {
      onFinish();
    }
  };

  return (
    <section
      id={`onboarding-step-${step.id}`}
      className="flex min-h-dvh snap-start flex-col justify-center px-8 py-16 lg:px-20"
    >
      <div className="mx-auto w-full max-w-[640px]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {String(step.id).padStart(2, "0")} / 03
          </span>
          {step.skippable ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              optional
            </Badge>
          ) : (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              required
            </Badge>
          )}
          {isDone ? (
            <Badge variant="brand" className="gap-1 px-1.5 py-0 text-[10px]">
              <Check aria-hidden="true" className="size-2.5" />
              done
            </Badge>
          ) : null}
        </div>
        <h2 className="mt-3 font-heading text-[56px] leading-[1.05] font-medium tracking-tight text-foreground">
          {step.id === 1 && "What's your name?"}
          {step.id === 2 && "Create an API key."}
          {step.id === 3 && "Add your first credits."}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          {step.id === 1 && "Two fields. We use this on invoices and emails."}
          {step.id === 2 &&
            "Generate a key, then make your first request — takes ~30s."}
          {step.id === 3 &&
            "Top up now, or skip and add credits when you're ready."}
        </p>

        {isLocked ? (
          <LockedNotice />
        ) : (
          <>
            <div className="mt-10 max-w-[460px]">
              {step.id === 1 && <NameForm state={state} />}
              {step.id === 2 && <ApiKeyForm state={state} />}
              {step.id === 3 && <TopupForm state={state} />}
            </div>

            <SectionFooter
              step={step}
              state={state}
              onContinue={continueAfter}
              onFinish={onFinish}
            />
          </>
        )}
      </div>
    </section>
  );
}

function LockedNotice() {
  return (
    <div className="mt-10 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <AlertCircle aria-hidden="true" className="size-3.5" />
      Finish step 01 first to unlock this step.
    </div>
  );
}

function SectionFooter({
  step,
  state,
  onContinue,
  onFinish,
}: {
  step: (typeof STEPS)[number];
  state: OnboardingState;
  onContinue: () => void;
  onFinish: () => void;
}) {
  if (step.id === 1) {
    const canContinue = state.nameSaved;
    return (
      <div className="mt-10 flex items-center gap-3">
        {canContinue ? (
          <Button variant="brand" size="sm" onClick={onContinue}>
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  }

  if (step.id === 2) {
    return (
      <div className="mt-10 flex items-center gap-3">
        {state.createdKey ? (
          <Button variant="brand" size="sm" onClick={onContinue}>
            Continue
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onContinue}>
          Skip this step
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onFinish}>
        Skip and enter dashboard
      </Button>
    </div>
  );
}

function NameForm({ state }: { state: OnboardingState }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    state.first.trim().length > 0 &&
    state.last.trim().length > 0 &&
    !state.nameSaved;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateDisplayNameAction({
          firstName: state.first,
          lastName: state.last,
        });
        state.setNameSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save name");
      }
    });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first" className="text-xs">
            First name
          </Label>
          <Input
            id="first"
            autoComplete="given-name"
            placeholder="Ada"
            required
            disabled={state.nameSaved}
            value={state.first}
            onChange={(e) => state.setFirst(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last" className="text-xs">
            Last name
          </Label>
          <Input
            id="last"
            autoComplete="family-name"
            placeholder="Lovelace"
            required
            disabled={state.nameSaved}
            value={state.last}
            onChange={(e) => state.setLast(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle aria-hidden="true" className="size-3.5" />
          {error}
        </p>
      ) : null}

      {state.nameSaved ? (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 aria-hidden="true" className="size-3.5" />
          Saved.
        </p>
      ) : (
        <Button
          variant="brand"
          size="sm"
          type="submit"
          className="self-start"
          disabled={!canSubmit || pending}
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          Save name
        </Button>
      )}
    </form>
  );
}

function ApiKeyForm({ state }: { state: OnboardingState }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (state.createdKey) {
    const exampleCurl = `curl https://api.flint.dev/v1/chat/completions \\
  -H "Authorization: Bearer ${state.createdKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
          <CheckCircle2 aria-hidden="true" className="size-3.5" />
          Key created — copy it now, it won't be shown again.
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 pl-3">
          <code className="flex-1 truncate font-mono text-xs text-foreground">
            {state.createdKey}
          </code>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy key"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.createdKey ?? "");
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* ignore */
              }
            }}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </Button>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            <Terminal aria-hidden="true" className="size-3" />
            Try it now
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-foreground/[0.03] p-3 font-mono text-[11px] leading-relaxed text-foreground">
            {exampleCurl}
          </pre>
        </div>
      </div>
    );
  }

  const onGenerate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createOnboardingTokenAction({
          name: state.keyName,
        });
        state.setCreatedKey(result.key);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate key");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="key-name" className="text-xs">
          Key name
        </Label>
        <Input
          id="key-name"
          value={state.keyName}
          onChange={(e) => state.setKeyName(e.target.value)}
          placeholder="My first key"
          maxLength={50}
        />
      </div>
      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle aria-hidden="true" className="size-3.5" />
          {error}
        </p>
      ) : null}
      <Button
        variant="brand"
        size="sm"
        className="self-start"
        onClick={onGenerate}
        disabled={pending || state.keyName.trim().length === 0}
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <KeyRound aria-hidden="true" />
        )}
        Generate key
      </Button>
    </div>
  );
}

function TopupForm({ state }: { state: OnboardingState }) {
  const amount = typeof state.amount === "number" ? state.amount : 0;
  const checkoutHref = `/console/topup/checkout?amount=${encodeURIComponent(
    Math.max(1, Math.trunc(amount || 0)),
  )}`;
  const disabled = amount <= 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {TOPUP_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => state.setAmount(p)}
            className={cn(
              "rounded-md border px-3 py-2 text-center font-mono text-sm tabular-nums transition-colors",
              state.amount === p
                ? "border-brand bg-brand-subtle text-brand-emphasis"
                : "border-border bg-background text-foreground hover:border-foreground/30",
            )}
          >
            ${p}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount" className="text-xs">
          Custom amount
        </Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            type="number"
            min={1}
            value={state.amount}
            onChange={(e) =>
              state.setAmount(e.target.value ? Number(e.target.value) : "")
            }
            className="pl-7 font-mono tabular-nums"
            placeholder="10"
          />
        </div>
      </div>
      <a
        href={disabled ? undefined : checkoutHref}
        aria-disabled={disabled}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 self-start rounded-md bg-brand px-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand/90",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <CreditCard aria-hidden="true" className="size-4" />
        Continue to checkout · ${amount || 0}
      </a>
    </div>
  );
}
