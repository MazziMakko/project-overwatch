import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "AuraMesh Auditor",
  description: "Offline-first audit capture",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Auditor",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#84cc16",
};

export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
