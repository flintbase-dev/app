import { Flame } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { SYSTEM_NAME } from "@/lib/site";

export default function WorkosCallbackPage() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-brand" aria-hidden="true" />
          <span className="font-heading text-base font-medium tracking-tight">
            {SYSTEM_NAME}
          </span>
        </div>
        <Spinner className="mt-10 size-6 text-brand" />
        <p className="mt-5 text-sm text-foreground">Verifying your session</p>
        <p className="mt-1 max-w-[42ch] text-center text-xs text-muted-foreground">
          You&apos;ll be sent to the console once WorkOS confirms your identity.
        </p>
      </div>
    </main>
  );
}
