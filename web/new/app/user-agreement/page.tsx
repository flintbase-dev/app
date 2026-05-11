import { LegalDoc } from "@/components/site/legal-doc";
import { USER_AGREEMENT } from "@/lib/public-content";

export default function UserAgreementPage() {
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of Service"
      content={USER_AGREEMENT}
      updated="2026-03-12"
      version="v2.4"
    />
  );
}
