# AuraMesh / PWA offline QA (manual)

**Goal:** With Chrome DevTools **Network → Offline**, complete **50** field-style actions (e.g. auditor captures queued locally) **without** new `console.error` lines.

## Steps

1. Build production: `npm run build` and `npm run start` (or use preview URL).
2. Open **Application → Service Workers** — confirm `sw.js` registered and **activated**.
3. Open **Network** — enable **Offline**.
4. Use the auditor / proposal flows that are designed for offline queueing (per your implementation).
5. Perform **50** discrete actions; after each batch, check **Console** for `error` / failed `fetch` that are unhandled.
6. Go **Online** — confirm sync/replay completes or fails gracefully with user-visible copy (no silent data loss).

## Automation (optional)

- Add Playwright with `context.setOffline(true)` and a bounded loop; assert `page.on('console', ...)` has no `error` from app code.

## Notes

- Third-party scripts (analytics, Clerk) may still log offline; scope failures to **first-party** bundles.
