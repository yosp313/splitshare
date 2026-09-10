# SplitShare

Scan a receipt, invite your table with a 6-character code, claim items, and settle via InstaPay. Local-first React PWA + Node SQLite sync server.

## Run locally

```bash
npm ci
npm run dev      # Vite on :5173, proxies /api → localhost:3001
npm run server   # sync server on :3001 (PORT and ALLOWED_ORIGIN env supported)
```

## Deploy (single VPS)

```bash
docker build -t splitshare .
docker run -d --name splitshare -p 3001:3001 \
  -e ALLOWED_ORIGIN=https://your-domain \
  -v splitshare-data:/app/data \
  splitshare
```

Put Caddy/Nginx in front for TLS and set `ALLOWED_ORIGIN` to your domain.
The server serves `dist/` + `/api` from one process. Rooms auto-expire after 48h.

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
