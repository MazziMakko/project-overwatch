"use client";

import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchNominatim,
  type NominatimSearchHit,
} from "@/app/actions/nominatimSearch";
import { messageFromUnknown } from "@/lib/messageFromUnknown";

type OverwatchSearchBarProps = {
  onNavigate: (hit: NominatimSearchHit) => void;
};

export function OverwatchSearchBar({ onNavigate }: OverwatchSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hits = await searchNominatim(t);
      setResults(hits);
      setOpen(true);
    } catch (e) {
      setResults([]);
      setError(messageFromUnknown(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = query.trim();
    if (t.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSearch(query);
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el || !(e.target instanceof Node)) return;
      if (!el.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (hit: NominatimSearchHit) => {
    onNavigate(hit);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <label className="sr-only" htmlFor="overwatch-geo-search">
        Search city or business
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/75 px-3 py-2 shadow-lg backdrop-blur-md">
        <Search
          className="size-4 shrink-0 text-lime-400/80"
          aria-hidden
        />
        <input
          id="overwatch-geo-search"
          type="search"
          autoComplete="off"
          placeholder="City, address, business…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none"
        />
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-slate-500" aria-hidden />
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 rounded border border-red-500/25 bg-red-950/50 px-2 py-1 font-mono text-[10px] text-red-200">
          {error}
        </p>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[min(50vh,280px)] overflow-y-auto rounded-lg border border-white/15 bg-[#080808]/95 py-1 shadow-xl backdrop-blur-md">
          {results.map((hit, i) => (
            <li key={`${hit.lat},${hit.lng},${i}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-white/[0.06]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(hit)}
              >
                <p className="text-xs font-medium leading-snug text-slate-100">
                  {hit.displayName}
                </p>
                {hit.className || hit.typeName ? (
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                    {[hit.className, hit.typeName].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
