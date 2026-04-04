import type { Metadata } from "next";
import { AegisTerminal } from "@/components/aegis/AegisTerminal";

export const metadata: Metadata = {
  title: "Aegis Pay Terminal",
  description:
    "369 gas resonance · brutalist B2B settlement command center.",
};

export default function AegisPayPage() {
  return <AegisTerminal />;
}
