# Repository Guidelines

## Project Structure

This is a Vite-powered React PWA. Application UI and state orchestration live in `src/App.jsx` and `src/main.jsx`; shared styling is in `src/styles.css`. Domain logic is split into `src/lib/splitShareStore.js` (local persistence and receipt math), `src/lib/receiptParser.js` (receipt text parsing), and `src/lib/syncApi.js` (HTTP sync calls). The SQLite sync service is in `server/sync-server.mjs`. Verification scripts are in `scripts/`, installable PWA assets are in `public/`, and production output is generated in `dist/`.

## Build, Test, and Development Commands

- `npm run dev` — start the Vite development server with `/api` proxying to the sync server.
- `npm run server` — start the local SQLite sync service on port 3001.
- `npm run build` — create the production bundle in `dist/`.
- `node scripts/check-math.mjs` — verify receipt totals and share calculations.
- `node scripts/check-receipt.mjs` — verify receipt parsing behavior.
- `node scripts/check-payment.mjs` — verify InstaPay links and settlement state.
- `npm run check:sync` — run the SQLite/API integration checks.

Run the build and relevant checks before submitting changes. There is no configured formatter, linter, or test framework; checks use Node’s built-in `assert`.

## Coding Style & Naming

Use two-space indentation, semicolons, single quotes, and the existing compact React style. Name React components and files in PascalCase where applicable; use camelCase for functions, state, and handlers; use kebab-case for CSS classes. Prefer existing helpers and CSS tokens over new abstractions. Keep currency display in `EGP` and preserve the local-first room model.

## Testing Guidelines

Add or update a small `scripts/check-*.mjs` assertion script for non-trivial domain behavior. Keep checks deterministic and runnable directly with Node. UI changes should be verified at desktop and mobile widths, including keyboard focus and empty/loading/error states.

## Commits & Pull Requests

No Git history is available in this checkout. Use short, imperative commit messages such as `Fix receipt total rounding` or `Polish mobile room layout`. Pull requests should describe user-visible behavior, list verification commands, call out sync or storage changes, and include screenshots for meaningful UI changes.

## Security & Configuration

Do not commit real payment credentials or production room data. Treat InstaPay links, localStorage state, and `data/splitshare.sqlite` as development data; use isolated test data when exercising sync behavior.
