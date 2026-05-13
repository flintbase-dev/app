import { ConsoleLayoutShell } from "@/app/console/layout";

export default async function TeamConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <ConsoleLayoutShell teamId={teamId}>{children}</ConsoleLayoutShell>;
}
