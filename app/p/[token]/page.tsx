import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { trackProposalEvent } from "@/app/actions/proposalAnalytics";
import { loadProposalPage } from "@/app/actions/proposalPublic";
import { ProposalBriefing } from "@/components/proposal/ProposalBriefing";
import { ProposalUnlockForm } from "@/components/proposal/ProposalUnlockForm";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const result = await loadProposalPage(decodeURIComponent(token));
  if (result.kind === "ok") {
    return {
      title: `Digital Fragility Audit — ${result.data.businessName}`,
      description: "Confidential operator briefing — AuraMesh Sovereign Sync.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Secure briefing",
    robots: { index: false, follow: false },
  };
}

export default async function PublicProposalPage({ params }: PageProps) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const result = await loadProposalPage(decoded);

  if (result.kind === "not_found") {
    notFound();
  }

  await trackProposalEvent(decoded, "OPEN");

  if (result.kind === "locked") {
    return <ProposalUnlockForm token={decoded} />;
  }

  return <ProposalBriefing token={decoded} data={result.data} />;
}
