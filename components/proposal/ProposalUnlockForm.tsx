"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { verifyProposalUnlock } from "@/app/actions/proposalPublic";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

type ProposalUnlockFormProps = {
  token: string;
};

export function ProposalUnlockForm({ token }: ProposalUnlockFormProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="mb-6 flex size-11 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
          <Lock className="size-5 text-emerald-400" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          Secure mission briefing
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          This proposal is PIN-protected. Enter the access code you received
          from your operator.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setPending(true);
            void (async () => {
              try {
                const res = await verifyProposalUnlock({ token, pin });
                if (res.ok) {
                  router.refresh();
                  return;
                }
                setError(res.message ?? "Access denied.");
              } catch (e) {
                setError(messageFromUnknown(e));
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Access code"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/40 focus:outline-none"
          />
          {error ? (
            <p className="text-xs text-red-400/90">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || pin.length < 4}
            className="w-full rounded-lg border border-emerald-500/35 bg-emerald-500/15 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {pending ? "Verifying…" : "Unlock briefing"}
          </button>
        </form>
      </div>
    </div>
  );
}
