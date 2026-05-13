import { CreateTokenFormPage } from "@/app/console/token/new/page";

export default async function TeamCreateTokenPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <CreateTokenFormPage teamId={teamId} />;
}
