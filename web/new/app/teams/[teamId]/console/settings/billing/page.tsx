import { TeamBillingClient } from "@/components/console/team-billing-client";
import { Card, CardContent } from "@/components/ui/card";
import { loadTeamSettingsData } from "@/lib/console/data";
import {
  BillingBalanceBlock,
  CardShell,
  SettingsPageHeader,
  TopupHistoryTableBody,
} from "../_sections";

export default async function TeamBillingSettingsPage({
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
          title="Billing"
          description="Top up the shared team wallet and review purchase history."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <TeamBillingClient teamId={teamId} status={data.status} />
            <CardShell title="Top-up history" count={data.topups.length}>
              <TopupHistoryTableBody
                topups={data.topups}
                status={data.status}
              />
            </CardShell>
          </div>

          <aside className="lg:sticky lg:top-[calc(theme(spacing.12)+1.5rem)]">
            <Card>
              <CardContent className="py-5">
                <BillingBalanceBlock
                  billingSummary={data.billingSummary}
                  status={data.status}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
