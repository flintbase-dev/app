import { PlaygroundClient } from "@/components/console/playground-client";
import { loadPlaygroundData } from "@/lib/console/data";

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const { model = "" } = await searchParams;
  const { groups, models } = await loadPlaygroundData();
  return (
    <PlaygroundClient groups={groups} initialModel={model} models={models} />
  );
}
