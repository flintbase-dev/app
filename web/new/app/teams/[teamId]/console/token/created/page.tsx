import { CreatedAPIKeysContent } from "@/app/console/token/created/page";

export default async function TeamCreatedAPIKeysPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return (
    <CreatedAPIKeysContent
      basePath={`/teams/${encodeURIComponent(teamId)}/console/token`}
    />
  );
}
