import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="shrink-0 border-t border-white/10 bg-black/60 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur-md"
      role="contentinfo"
    >
      <nav
        className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2"
        aria-label="Footer"
      >
        <Link href="/overwatch" className="hover:text-slate-300">
          Command
        </Link>
        <Link href="/vault" className="hover:text-slate-300">
          Vault
        </Link>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span className="font-mono text-[10px] text-slate-600">
          © {year} Overwatch
        </span>
      </nav>
    </footer>
  );
}
