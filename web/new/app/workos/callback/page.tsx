import { redirect } from "next/navigation";

export default async function WorkosCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string }>;
}) {
  const { code = "", state = "" } = await searchParams;
  if (code && state) {
    const params = new URLSearchParams({ code, state });
    redirect(`/api/workos/callback?${params.toString()}`);
  }
  redirect("/console");
}
