import { z } from "zod";

/** Persisted shape for `SovereignLead.sovereignBriefing` and landing page SEO. */
export type DigitalFragilityReport = {
  root3Problem: string;
  root6Logic: string;
  root9Source: string;
  seoTitle: string;
  seoDescription: string;
  outreachCopy: string;
};

const BriefingSnapshotSchema = z.object({
  root3Problem: z.string(),
  root6Logic: z.string(),
  root9Source: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  outreachCopy: z.string(),
});

export function parseStoredBriefing(raw: unknown): DigitalFragilityReport | null {
  const parsed = BriefingSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
