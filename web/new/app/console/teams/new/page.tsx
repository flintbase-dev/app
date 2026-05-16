import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeamAction } from "@/lib/console/actions";
import { cn } from "@/lib/utils";

export default function CreateTeamPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/console"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Console
        </Link>
        <div className="mt-6">
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            New Team
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Create Team
          </h1>
        </div>
        <form action={createTeamAction} className="mt-6">
          <Card>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="team-name">Team name</Label>
                <Input
                  id="team-name"
                  name="name"
                  placeholder="Team name"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Link
                  href="/console"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Cancel
                </Link>
                <Button type="submit" variant="brand">
                  <Plus aria-hidden="true" />
                  Create Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
