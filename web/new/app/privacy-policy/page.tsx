import { LegalDoc } from "@/components/site/legal-doc";
import { PRIVACY_POLICY } from "@/lib/public-content";

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Privacy Policy"
      content={PRIVACY_POLICY}
      updated="2026-03-12"
      version="v1.8"
    />
  );
}
