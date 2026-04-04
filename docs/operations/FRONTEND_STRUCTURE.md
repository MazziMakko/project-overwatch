# Frontend layout (Overwatch / Aegis)

| Area | Path | Role |
|------|------|------|
| App Router | `app/` | Pages, layouts, metadata, SEO (`sitemap.ts`, `robots.ts`) |
| Overwatch map & HUD | `components/overwatch/` | Map, sidebar, search, command shell |
| Aegis Pay terminal | `components/aegis/` | Gas oracle UI, brutalist terminal |
| Shared shell | `components/SiteFooter.tsx` | Global footer |
| Server actions | `app/actions/` | Overwatch, pilot, proposals, Aegis oracle |
| Domain logic | `lib/` | `aegis/`, `overwatch/`, `vortex/`, `db`, `sanitize` |
| Workers | `lib/vortex/*.ts` + `hooks/useVortex.ts` | 369 pulse off main thread |
| Tests | `tests/sovereign/` | Vitest — vortex integrity, gas resonance |
| Deploy | `scripts/harden.sh` / `harden.ps1` | Prisma + tests + build + env gate |

Keep **secrets** only in hosting env (Vercel) or local `.env.local` (gitignored). Never import secrets into client bundles.
