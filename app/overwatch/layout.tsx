import type { Metadata } from "next";

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
    : undefined);

export const metadata: Metadata = {
  title: "Overwatch Command — B2B intelligence map",
  description:
    "Wolf Hunter intelligence surface: OSM lead harvest, vulnerability analysis, strategist uplink, and vault sync for field teams.",
  keywords: [
    "B2B intelligence",
    "lead map",
    "OpenStreetMap",
    "business discovery",
    "Overwatch",
  ],
  alternates: site ? { canonical: `${site}/overwatch` } : undefined,
  openGraph: {
    title: "Overwatch Command",
    description:
      "Map-native B2B intelligence: harvest, analyze, and sync leads to your vault.",
    url: site ? `${site}/overwatch` : "/overwatch",
    siteName: "Overwatch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Overwatch Command",
    description: "Map-native B2B intelligence and lead vault.",
  },
  robots: { index: true, follow: true },
};

export default function OverwatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
