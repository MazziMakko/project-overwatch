import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const metadataBase =
  process.env.NEXT_PUBLIC_SITE_URL != null &&
  process.env.NEXT_PUBLIC_SITE_URL.length > 0
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : process.env.VERCEL_URL != null
      ? new URL(`https://${process.env.VERCEL_URL}`)
      : undefined;

export const metadata: Metadata = {
  metadataBase: metadataBase ?? undefined,
  title: {
    default: "Overwatch — Wolf Hunter B2B intelligence",
    template: "%s · Overwatch",
  },
  description:
    "Wolf Hunter B2B intelligence: map-based lead harvest, AI vulnerability analysis, strategist chat, and secure vault.",
  keywords: [
    "B2B sales intelligence",
    "lead generation",
    "OpenStreetMap",
    "Overwatch",
    "Wolf Hunter",
  ],
  authors: [{ name: "Overwatch" }],
  creator: "Overwatch",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Overwatch",
    title: "Overwatch — Wolf Hunter B2B intelligence",
    description:
      "Map-native lead harvest, analysis, and vault sync for revenue teams.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Overwatch",
    description: "B2B intelligence surface with map harvest and vault.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col bg-[#030303] font-sans text-slate-200`}
      >
        <ClerkProvider {...(publishableKey ? { publishableKey } : {})}>
          <header className="flex shrink-0 items-center justify-end gap-2 border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="rounded-md border border-lime-500/35 bg-lime-500/15 px-3 py-1.5 text-xs font-medium text-lime-100 hover:bg-lime-500/25"
                >
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          <SiteFooter />
        </ClerkProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Overwatch",
              applicationCategory: "BusinessApplication",
              description:
                "B2B intelligence map with OSM harvest, AI analysis, and vault.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            }),
          }}
        />
      </body>
    </html>
  );
}
