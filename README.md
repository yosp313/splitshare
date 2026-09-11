# SplitShare

Scan a receipt, invite your table with a 6-character code, claim items, and settle via InstaPay. Local-first React PWA + Node SQLite sync server.

## Run locally

```bash
npm ci
npm run dev      # Vite on :5173, proxies /api → localhost:3001
npm run server   # sync server on :3001 (PORT and ALLOWED_ORIGIN env supported)
```

## Deploy (single VPS, nginx + app)

```bash
HTTP_PORT=80 ALLOWED_ORIGIN=https://your-domain docker compose up -d --build
curl localhost/healthz   # {"ok":true}
```

`nginx.conf` proxies everything to the node app (which serves `dist/` + `/api`
from one process), with gzip, hardened headers, 64KB body cap, and SSE-safe
`/api/` proxying (no buffering, 1h timeouts). SQLite lives in the
`splitshare-data` volume. Single-container fallback:

```bash
docker build -t splitshare .
docker run -d --name splitshare -p 3001:3001 \
  -e ALLOWED_ORIGIN=https://your-domain \
  -v splitshare-data:/app/data \
  splitshare
```

TLS is automatic once DNS points at the host. `nginx` boots HTTP-only
(ACME webroot at `/var/www/certbot`), the `certbot` service issues on every
`up`, and the entrypoint switches to 443 after certs land:

```bash
# 1. Namecheap: A record splitshare -> <VPS-IP>, wait for propagation
# 2. Boot (certbot attempts issuance; safe to re-run until DNS is live)
CERTBOT_EMAIL=you@example.com docker compose up -d --build
# 3. Once issued, restart nginx onto the 443 config:
docker compose exec nginx -s reload 2>/dev/null || docker compose restart nginx
curl https://splitshare.youssef-ayman.me/healthz
```

Renewal cron on the host (certs persist in the `letsencrypt-certs` volume):

```cron
0 3 * * * cd /path/to/splitshare && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

Rooms auto-expire after 48h.

## Backups

```bash
npm run backup   # copies data/splitshare.sqlite → data/backups/, keeps 7 daily
```

Run nightly via cron. `BACKUP_DIR`, `BACKUP_KEEP`, and `DB_PATH` env vars supported.

## Verify

```bash
npm run build
node scripts/check-math.mjs
node scripts/check-receipt.mjs
node scripts/check-payment.mjs
npm run check:sync
```

## Privacy

Profile and room state live in browser localStorage. Shared rooms are stored
as plain JSON in SQLite and auto-delete 48h after their last update. Only put
necessary info in receipts. SplitShare records settlement marks; it never
verifies InstaPay payments.
