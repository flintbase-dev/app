import { ArrowLeft, KeyRound } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { CopyAPIKeyButton } from "@/components/console/api-key-secret-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CreatedAPIKey = {
  id: string;
  name: string;
  api_key: string;
};

export default async function CreatedAPIKeysPage() {
  return <CreatedAPIKeysContent basePath="/console/token" />;
}

export async function CreatedAPIKeysContent({
  basePath,
}: {
  basePath: string;
}) {
  const created = decodeCreatedAPIKeys(
    (await cookies()).get("flint_created_api_keys")?.value,
  );

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-2">
          <Link
            href={basePath}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            API keys
          </Link>
        </div>

        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Created API key
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Save this secret now
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          This is the only time the full API key secret is shown. Store it in
          your password manager or deployment secret store before leaving this
          page.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {created.length ? (
            created.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-4 py-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-subtle text-brand-emphasis">
                      <KeyRound aria-hidden="true" className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.name || item.id}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 rounded-md bg-muted p-3 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                      {item.api_key}
                    </code>
                    <CopyAPIKeyButton value={item.api_key} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-5">
                <p className="text-sm text-muted-foreground">
                  No newly created API key is available. Create a new key to get
                  a one-time secret.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href={basePath}
            className={cn(buttonVariants({ variant: "brand" }))}
          >
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}

function decodeCreatedAPIKeys(value: string | undefined): CreatedAPIKey[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) =>
        typeof item === "object" && item !== null
          ? (item as CreatedAPIKey)
          : null,
      )
      .filter((item): item is CreatedAPIKey => Boolean(item?.api_key));
  } catch {
    return [];
  }
}
