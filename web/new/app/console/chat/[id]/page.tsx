import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatRunner } from "@/components/console/chat-runner";
import { buttonVariants } from "@/components/ui/button";
import { loadChatLaunchData } from "@/lib/console/data";
import { cn } from "@/lib/utils";

export default async function ChatRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { activeToken, client, status, url } = await loadChatLaunchData(id);
  if (!client) notFound();

  if (!activeToken || !url) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="max-w-sm text-center">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            API key setup required
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Full API keys are shown only once when created. Create a new key and
            paste it into the target chat client.
          </p>
          <Link
            href="/console/token/new"
            className={cn(
              buttonVariants({ variant: "brand", size: "sm" }),
              "mt-5",
            )}
          >
            Create key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChatRunner
      baseURL={status.serverAddress || "https://api.flint.dev"}
      client={client}
      token={activeToken}
      url={url}
    />
  );
}
