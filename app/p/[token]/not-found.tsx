import Link from "next/link";

export default function ProposalNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600">
        404 · briefing not found
      </p>
      <h1 className="mt-3 text-xl font-semibold text-white">
        This proposal link is invalid or expired.
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Ask your operator for a fresh link. Tokens are never guessable and can
        be rotated from the vault.
      </p>
      <Link
        href="/"
        className="mt-8 text-sm text-emerald-500/90 underline decoration-emerald-500/30 underline-offset-4 hover:text-emerald-400"
      >
        Return home
      </Link>
    </div>
  );
}
