import { InviteMembersDialog } from "@/components/console/invite-members-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadTeamSettingsData } from "@/lib/console/data";
import {
  CardShell,
  InvitationsTableBody,
  MembersTableBody,
  SettingsPageHeader,
  StatTile,
} from "../_sections";

export default async function TeamMembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const data = await loadTeamSettingsData(teamId);
  const pending = data.invitations.filter((i) => i.status === "pending").length;
  const admins = data.members.filter((m) => m.role === "admin").length;

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[960px]">
        <SettingsPageHeader
          title="Members"
          description="People with access to this team workspace and pending invites."
          action={
            <InviteMembersDialog teamId={teamId} teamName={data.team.name} />
          }
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatTile label="Members" value={String(data.members.length)} />
          <StatTile label="Pending invites" value={String(pending)} />
          <StatTile label="Admins" value={String(admins)} />
        </div>

        <Tabs defaultValue="members" className="mt-8">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="pt-4">
            <CardShell title="Members" count={data.members.length}>
              <MembersTableBody teamId={teamId} members={data.members} />
            </CardShell>
          </TabsContent>
          <TabsContent value="invitations" className="pt-4">
            <CardShell title="Invitations" count={data.invitations.length}>
              <InvitationsTableBody
                teamId={teamId}
                invitations={data.invitations}
              />
            </CardShell>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
