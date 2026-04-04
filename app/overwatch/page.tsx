import { OverwatchCommand } from "@/components/overwatch/OverwatchCommand";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ vaultId?: string }>;
};

export default async function OverwatchPage({ searchParams }: PageProps) {
  const { vaultId } = await searchParams;
  return <OverwatchCommand initialVaultLeadId={vaultId ?? null} />;
}
