# Deploy: Digital Ocean + `overwatch.isoflux.app`

## 1. DNS (IsoFlux)

Create a **CNAME** (or A record to the DO load balancer):

| Host | Target |
|------|--------|
| `overwatch` | Your DigitalOcean App default hostname (e.g. `overwatch-staging-xxxxx.ondigitalocean.app`) |

Use **full (sub)domain** `overwatch.isoflux.app` in TLS / custom domain settings on the app.

## 2. Environment (staging)

Set these on the App Platform **or** your Droplet process manager:

- `NEXT_PUBLIC_SITE_URL` = `https://overwatch.isoflux.app`
- `NEXT_PUBLIC_APP_URL` = `https://overwatch.isoflux.app`
- `DATABASE_URL` = Neon (or DO Managed Postgres) connection string
- Clerk keys (same application or a dedicated staging instance)
- `GROQ_API_KEY`, `PROPOSAL_IP_SALT`, etc. — see root `.env.example`
- **Lemon Squeezy:** `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, variant IDs, `LEMONSQUEEZY_WEBHOOK_SECRET`

**Webhook URL (production/staging):**

`https://overwatch.isoflux.app/api/webhooks/lemonsqueezy`

Use a **separate** Lemon Squeezy signing secret per environment if you run two webhooks.

**Lemon Squeezy webhooks to enable:** `order_created`, `subscription_created`, `subscription_updated` (trial uses `on_trial` + `active` on subscriptions).

## 2b. Droplet + Nginx + PM2 (502 → 200)

A **502** from Nginx usually means nothing is listening on the upstream (e.g. `127.0.0.1:3000`).

1. **Clone / pull** your app repo on the Droplet (never commit `.env` or paste keys into git).
2. Create **`.env.production`** or export env vars on the host with the same keys as `.env.example` (values only on the server).
3. Install deps, generate client, build, migrate:
   - `npm ci`
   - `npx prisma generate`
   - `npx prisma migrate deploy`
   - `npm run build`
4. **PM2** (keeps Node alive after SSH disconnect):
   - `pm2 start npm --name "overwatch" -- start`
   - `pm2 save`
   - `pm2 startup` (run the command it prints once)
5. Confirm locally on the box: `curl -sI http://127.0.0.1:3000` should return `200` or `307`, not connection refused.

## 3. Build & run

- **Build:** `npm run build` (runs `prisma generate`)
- **Start:** `npm start`
- **Migrations:** `npx prisma migrate deploy` against the staging DB before or after first deploy

## 4. App Platform (example)

Import `digitalocean-app-spec.example.yaml` in the DO UI (replace placeholders: repo, branch, env references). Adjust region and instance size for load.
