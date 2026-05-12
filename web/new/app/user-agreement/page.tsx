import { LegalDoc } from "@/components/site/legal-doc";
import { loadPublicContent } from "@/lib/console/data";

export default async function UserAgreementPage() {
  const { userAgreement } = await loadPublicContent();
  return (
    <LegalDoc
      eyebrow="Legal"
      title="Terms of Service"
      content={userAgreement}
      updated="2026-03-12"
      version="v2.4"
    />
  );
}
