import { Card, CardContent } from "@/components/ui/card";
import { loadTeamSettingsData } from "@/lib/console/data";
import { GeneralForm, SettingsPageHeader, TeamIdentityList } from "./_sections";

export default async function TeamGeneralPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const data = await loadTeamSettingsData(teamId);

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <SettingsPageHeader
          title="General"
          description="Your team profile and identity across the Flint console."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardContent className="py-5">
              <GeneralForm teamId={teamId} team={data.team} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-5">
              <p className="mb-4 text-sm font-medium text-foreground">
                Identity
              </p>
              <TeamIdentityList team={data.team} status={data.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
