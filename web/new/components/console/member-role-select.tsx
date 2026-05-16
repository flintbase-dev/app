"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";
import { updateTeamMemberRoleAction } from "@/lib/console/actions";

function PendingIndicator() {
  const { pending } = useFormStatus();
  return pending ? <Spinner className="size-3.5" /> : null;
}

export function MemberRoleSelect({
  teamId,
  userId,
  defaultRole,
}: {
  teamId: string;
  userId: string;
  defaultRole: "admin" | "member";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={updateTeamMemberRoleAction}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="team_id" value={teamId} />
      <input type="hidden" name="user_id" value={userId} />
      <select
        name="role"
        defaultValue={defaultRole}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 focus-visible:outline-none"
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </select>
      <PendingIndicator />
    </form>
  );
}
