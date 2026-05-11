import { LegalDoc } from "@/components/site/legal-doc";
import { loadPublicContent } from "@/lib/console/data";

export default async function PrivacyPolicyPage() {
  const { privacyPolicy } = await loadPublicContent();
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy Policy"
      content={privacyPolicy}
      updated="2026-03-12"
      version="v1.8"
    />
  );
}
