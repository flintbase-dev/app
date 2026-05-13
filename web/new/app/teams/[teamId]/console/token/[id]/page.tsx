import { EditTokenFormPage } from "@/app/console/token/[id]/page";

export default async function TeamEditTokenPage({
  params,
}: {
  params: Promise<{ teamId: string; id: string }>;
}) {
  const { teamId, id } = await params;
  return <EditTokenFormPage id={id} teamId={teamId} />;
}
