import { TokenListPage } from "@/app/console/token/page";

export default async function TeamTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ p?: string; q?: string }>;
}) {
  const { teamId } = await params;
  return <TokenListPage searchParams={searchParams} teamId={teamId} />;
}
