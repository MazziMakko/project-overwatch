"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
  provisionSovereignCheckout,
  type SovereignCheckoutProduct,
} from "@/app/actions/lemonsqueezyCheckout";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

type SovereignCheckoutProps = {
  /** When set, passes `lead_id` into checkout custom data for webhook correlation. */
  leadId?: string | null;
  product?: SovereignCheckoutProduct;
  className?: string;
};

export function SovereignCheckout({
  leadId,
  product = "aegis",
  className = "",
}: SovereignCheckoutProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onProvision = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await provisionSovereignCheckout({ leadId, product });
      if (res.ok) {
        window.location.href = res.checkoutUrl;
      } else {
        setErr(res.error);
      }
    } catch (e) {
      setErr(messageFromUnknown(e));
    } finally {
      setBusy(false);
    }
  }, [leadId, product]);

  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/50 p-4 font-mono ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            Lemon Squeezy
          </p>
          <p className="mt-1 text-sm font-medium text-slate-100">
            Provision access
          </p>
          <p className="mt-1 max-w-xl text-[11px] leading-snug text-slate-500">
            Opens secure checkout. Webhooks unlock Aegis-Pay / Overwatch Pro on your Clerk
            identity.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onProvision()}
          className="inline-flex items-center gap-2 rounded border border-lime-500/30 bg-lime-500/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-lime-100 shadow-[0_0_0_1px_rgba(163,230,53,0.15)] hover:bg-lime-500/20 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="size-4 text-lime-400/90" aria-hidden />
          )}
          {busy ? "Redirecting…" : "Provision access"}
        </button>
      </div>
      {err ? (
        <p className="mt-3 text-[11px] text-red-400/90">{err}</p>
      ) : null}
    </div>
  );
}
