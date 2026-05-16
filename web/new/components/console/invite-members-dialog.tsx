"use client";

import { AtSign, Send, UserPlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteTeamMembersAction } from "@/lib/console/actions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => EMAIL_PATTERN.test(entry));
}

export function InviteMembersDialog({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const count = emails.length;

  const commit = (input: string) => {
    setEmails((prev) => Array.from(new Set([...prev, ...parseEmails(input)])));
    setDraft("");
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="brand" size="sm">
            <UserPlus aria-hidden="true" />
            Invite members
          </Button>
        }
      />
      <DialogContent className="w-full max-w-xl gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Invite to {teamName}</DialogTitle>
          <DialogDescription>
            Add teammates by email — they'll receive a sign-in link.
          </DialogDescription>
        </DialogHeader>
        <form
          action={inviteTeamMembersAction}
          className="flex flex-col gap-5 px-6 pt-4 pb-6"
        >
          <input type="hidden" name="team_id" value={teamId} />
          <input type="hidden" name="emails" value={emails.join(",")} />

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Email addresses
            </span>
            <label
              htmlFor="invite-chip-input"
              className="flex min-h-[5.5rem] cursor-text flex-wrap items-start gap-1.5 rounded-lg border border-input bg-background p-2 transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20"
            >
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted pr-1 pl-2 text-xs"
                >
                  <AtSign
                    aria-hidden="true"
                    className="size-3 text-muted-foreground"
                  />
                  <span className="font-mono text-foreground">{email}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${email}`}
                    onClick={() => setEmails(emails.filter((e) => e !== email))}
                    className="inline-flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="invite-chip-input"
                type="text"
                value={draft}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/[\s,;]/.test(value)) {
                    commit(value);
                  } else {
                    setDraft(value);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    (event.key === "Enter" ||
                      event.key === "Tab" ||
                      event.key === ",") &&
                    draft.trim()
                  ) {
                    event.preventDefault();
                    commit(draft);
                  } else if (
                    event.key === "Backspace" &&
                    draft === "" &&
                    emails.length > 0
                  ) {
                    setEmails(emails.slice(0, -1));
                  }
                }}
                onBlur={() => {
                  if (draft.trim()) commit(draft);
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  commit(event.clipboardData.getData("text"));
                }}
                placeholder={
                  emails.length === 0 ? "Type or paste email addresses…" : ""
                }
                className="h-7 min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Press Enter, comma, or space to add. Backspace removes the last
              chip.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="invite-role"
              className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase"
            >
              Role
            </label>
            <select
              id="invite-role"
              name="role"
              defaultValue="member"
              className="h-9 max-w-40 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {count === 0
                ? "No valid emails yet."
                : `${count} address${count === 1 ? "" : "es"} ready to invite.`}
            </p>
            <Button type="submit" variant="brand" disabled={count === 0}>
              <Send aria-hidden="true" />
              Send{" "}
              {count > 0
                ? `${count} invitation${count === 1 ? "" : "s"}`
                : "invitations"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
