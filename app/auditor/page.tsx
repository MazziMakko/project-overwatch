import Link from "next/link";

export default function AuditorIndexPage() {
  return (
    <div className="min-h-screen bg-[#050505] px-6 py-16 font-mono text-neutral-300">
      <p className="text-[10px] uppercase tracking-[0.35em] text-[#84cc16]">
        AuraMesh
      </p>
      <h1 className="mt-4 text-2xl font-bold text-white">Auditor</h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        Open a business route to run the field scanner. Example:
      </p>
      <Link
        href="/auditor/demo-site"
        className="mt-8 inline-block border-2 border-[#84cc16] px-6 py-3 text-sm font-bold uppercase tracking-wider text-[#84cc16]"
      >
        /auditor/demo-site
      </Link>
    </div>
  );
}
