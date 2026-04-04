import { AuditorClient } from "./AuditorClient";

type PageProps = { params: Promise<{ businessId: string }> };

export default async function AuditorPage({ params }: PageProps) {
  const { businessId } = await params;
  return <AuditorClient businessId={decodeURIComponent(businessId)} />;
}
