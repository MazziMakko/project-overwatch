# Production readiness & Gumroad launch

## Estimated production-readiness: **~48%**

This is a **software maturity** estimate, not a legal or financial endorsement. Raise the score by closing gaps below.

### Strengths (what you have)

- Next.js 15 App Router, Prisma, Clerk, PWA pipeline, server actions, Vitest integrity tests for Aegis math.
- Env validation patterns, gitignored secrets, IP salt for analytics in production.
- Modular UI: Overwatch, Aegis terminal, vault, auditor.

### Gaps before a confident “sell on Gumroad” launch

| Priority | Item |
|----------|------|
| P0 | **Legal:** Terms, privacy policy, refund policy, limitation of liability; jurisdiction-specific review if EU/UK users. |
| P0 | **Secrets:** Rotate any key ever exposed; CI/CD secrets only in host; no keys in screenshots or repos. |
| P0 | **Payments story:** Gumroad handles checkout; clarify what the **product** is (software license, not investment advice). |
| P1 | **E2E tests:** Playwright for critical paths + offline PWA scenario. |
| P1 | **CSP + security headers** (`middleware` or `next.config` headers). |
| P1 | **Rate limiting** on server actions and webhooks. |
| P1 | **npm audit** remediation (review high findings; avoid blind `--force`). |
| P2 | **Observability:** Structured logging, error tracking (Sentry), uptime. |
| P2 | **Backups / DR:** DB backups, restore drill. |
| P2 | **Aegis ledger:** If you claim settlement, wire Prisma models to real payment rails and audits—not demo UI only. |

### Gumroad packaging checklist

- [ ] Clear **README** + install steps + env template (no real secrets).
- [ ] **License** file (e.g. proprietary or source-available).
- [ ] **Support** channel and response SLA you can keep.
- [ ] **Versioned** zip or private repo access; changelog.
- [ ] **Demo video** / screenshots that match actual behavior (no misleading claims).

### Raising the score

Each P0 closed → large jump. P1 items → medium. P2 → polish and ops. Revisit the **~48%** figure after each release milestone.
