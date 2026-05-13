import { OnboardingStackedSections } from "@/components/console/onboarding-flow";
import { loadConsoleLayoutData } from "@/lib/console/data";

export default async function OnboardingPage() {
  const { user } = await loadConsoleLayoutData();
  const [firstFromName = "", ...rest] = user.hasDisplayName
    ? user.displayName.trim().split(/\s+/)
    : [];
  const lastFromName = rest.join(" ");
  return (
    <OnboardingStackedSections
      initialFirst={firstFromName}
      initialLast={lastFromName}
      hasDisplayName={user.hasDisplayName}
    />
  );
}
