import { Boxes, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadTeamSettingsData } from "@/lib/console/data";
import {
  PolicySwitchList,
  policyGroupItems,
  policyModelItems,
  SettingsPageHeader,
  updateTeamPolicyAction,
} from "../_sections";

export default async function TeamPolicyPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const data = await loadTeamSettingsData(teamId);
  const disabledModels = new Set(data.policy.disabledModels);
  const disabledGroups = new Set(data.policy.disabledGroups);

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1000px]">
        <SettingsPageHeader
          title="Access policy"
          description="Unchecked entries are blocked for every member of this team. Changes apply the next time a member makes a request."
        />
        <form
          action={updateTeamPolicyAction}
          className="mt-8 flex flex-col gap-4"
        >
          <input type="hidden" name="team_id" value={teamId} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="py-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Models
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Individual models this team may call.
                    </p>
                  </div>
                </div>
                <PolicySwitchList
                  title="Models"
                  items={policyModelItems(data.models)}
                  allName="all_models"
                  enabledName="enabled_models"
                  disabled={disabledModels}
                  mono
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                    <Boxes aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Groups
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Model groups this team may call.
                    </p>
                  </div>
                </div>
                <PolicySwitchList
                  title="Groups"
                  items={policyGroupItems(data.groups)}
                  allName="all_groups"
                  enabledName="enabled_groups"
                  disabled={disabledGroups}
                />
              </CardContent>
            </Card>
          </div>
          <Button type="submit" className="self-start" variant="brand">
            Save policy
          </Button>
        </form>
      </div>
    </div>
  );
}
