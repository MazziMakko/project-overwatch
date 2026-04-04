# Security, privacy, and compliance posture

**Not legal advice.** Regulations depend on **jurisdiction**, **data you process**, and **how you sell** (e.g. Gumroad). Engage qualified counsel and, where applicable, PCI, SOC 2, or GDPR specialists before claiming “full compliance.”

## What this repo already does

- **Secrets:** `.env` / `.env*.local` gitignored; API keys belong in **server** env only (`GROQ_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `ETHERSCAN_API_KEY`, `PROPOSAL_IP_SALT`).
- **Production IP hashing:** `PROPOSAL_IP_SALT` is **required** in production for proposal analytics (`proposalAnalytics.ts`); rotate salt if compromised.
- **Auth:** Clerk for identity; keep **publishable** vs **secret** keys separated.
- **Database:** Prisma + Postgres; enforce least-privilege DB user in production; enable TLS to DB.
- **PWA:** Service worker from `next-pwa`; review cache rules so user-sensitive data is not cached inappropriately.
- **Aegis oracle:** Etherscan key server-side only; `revalidate: 300` reduces API abuse.
- **Automated integrity:** `npm run test` — vortex stage gates + gas resonance math.

## Threats to address before “production” claims

| Area | Risk | Mitigation |
|------|------|------------|
| Dependency CVEs | Supply chain | `npm audit`, lockfile, Dependabot, pin majors |
| XSS / CSP | Injected scripts | Add strict **Content-Security-Policy** headers |
| CSRF | State-changing actions | Same-site cookies, CSRF tokens for sensitive forms |
| Rate limits | Abuse of server actions | Per-IP / per-user limits (e.g. Upstash, middleware) |
| PII | GDPR/CCPA | Privacy policy, DPA, data retention, export/delete flows |
| Payments | Fraud / chargebacks | If you move money, use licensed rails; **do not** imply blockchain settlement without real custody logic |
| Terms | Gumroad / liability | Terms of service, disclaimers, no guaranteed returns |

## Operational checklist

1. Run `scripts/harden.sh` or `scripts/harden.ps1` with production env loaded.
2. Rotate any key that ever appeared in a commit, chat, or screenshot.
3. Enable **Vercel** (or host) **deployment protection** and **audit logs**.
4. Complete **OFFLINE_PWA_CHECKLIST.md** for your PWA path.

## Fraud / marketing

Avoid promising outcomes (“guaranteed settlement,” “regulator-proof”) that you cannot substantiate. Describe **software behavior** accurately; separate **metaphor** (369, “vortex”) from **financial** and **legal** facts in customer-facing copy.
