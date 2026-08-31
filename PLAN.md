# Plan: SplitShare receipt-splitting PWA

## Route task: reusable friends and local profile

Build a local-only friends feature without changing the sync API or room payload.

1. Extend `src/lib/splitShareStore.js` state normalization with `friends: []`, plus
   small helpers for creating, updating, and removing friend records. Keep the
   existing profile `{ name, instapayLink, emoji }` in localStorage and migrate
   old state that has no friends field.
2. Add a Friends panel to the existing room sidebar in `src/App.jsx`. It should
   list saved friends, allow adding a name and InstaPay link, edit/delete saved
   records, and add a selected friend to the current room using the saved
   details. Do not persist friends to the remote room document.
3. Ensure create/join/logout state flows preserve the saved profile and friends,
   and keep the onboarding fields prefilled from localStorage.
4. Add minimal CSS in `src/styles.css` for the panel and mobile layout, matching
   existing tokens and accessible labels/focus states.
5. Verify with a deterministic Node assertion script for friend/profile
   persistence helpers, then run the existing checks and production build.

Success: a user can save their name and InstaPay link once, reload, manage a
reusable friend list locally, and add a saved friend to a room with one action.

Depth: tree 5   Mode: orchestrated (executed sequentially in this session)
Budget note: greenfield MVP with a complete happy path and production-minded responsive polish.

## Contract

Decided before implementation. The app is a local-first demo that keeps the current profile and room in `localStorage`.

- Interfaces: React state is owned by `App.jsx`; `splitShareStore.js` owns persistence and receipt math; `receiptParser.js` owns OCR-like text extraction and normalization. The receipt model is `{merchant, date, items: [{id, name, quantity, price, assignedTo}], subtotal, tax, service, total}`. Participants are `{id, name, phone, initials, color}`.
- Data ownership: leaf 1 owns app bootstrap and PWA files; leaf 2 owns store and parser; leaf 3 owns onboarding, room, and receipt workflow components; leaf 4 owns global CSS and responsive/accessibility polish; leaf 5 owns verification scripts and integration evidence. No leaf overwrites another leaf's source files.
- Naming and conventions: React function components, camelCase JS, CSS custom properties, semantic buttons/labels, no external icon library, no server assumptions. Currency is Egyptian pounds and displays as `EGP`.
- Product behavior: a new user enters name and InstaPay username, gets a six-character room code, can upload a receipt image, sees a parsing state, edits line items/fees, assigns items to participants, marks their share settled, and can pay the host. Guests can use the room code to enter a local simulated room.
- Known boundary: OCR is implemented as deterministic client-side receipt text parsing with a seeded demo parse from an uploaded image filename when no text layer is available. The flow is honest in the UI and keeps parsed data editable; production OCR/provider wiring is a follow-up.

## Tree

- 1 SplitShare PWA
  - 1.1 Foundation .......... gates/node-1.1.md
    - 1.1.1 App bootstrap ........ gates/leaf-1.1.1.md
      - 1.1.1.1 PWA shell ........ gates/leaf-1.1.1.1.md
        - 1.1.1.1.1 Installable assets ........ gates/leaf-1.1.1.1.1.md
    - 1.1.2 Domain state ........ gates/leaf-1.1.2.md
  - 1.2 Product workflow ...... gates/node-1.2.md
    - 1.2.1 Entry and room ...... gates/leaf-1.2.1.md
      - 1.2.1.1 Receipt capture .. gates/leaf-1.2.1.1.md
        - 1.2.1.1.1 Splitting ...... gates/leaf-1.2.1.1.1.md
    - 1.2.2 Finish pass .......... gates/leaf-1.2.2.md

## Status log

- 2026-08-20 plan written, contract fixed
- 2026-08-20 foundation leaves implemented and verified: PWA shell, store, parser, OCR integration
- 2026-08-20 workflow leaves implemented and verified: onboarding, room invite, receipt editing, participant splits
- 2026-08-20 finish pass verified: desktop/mobile visual inspection, build, math, and gate ledger all pass
- 2026-08-20 follow-up verified: manual receipt entry, participant self-claims, and receipt-of-proof OCR reconciliation

## Follow-up: SQLite sync backend (tree 3)

Contract: `server/sync-server.mjs` owns a SQLite database with one JSON room document per six-character room code. `src/lib/syncApi.js` owns browser HTTP calls. The existing room model remains the payload; the client keeps localStorage as its cache, retries failed writes, and refreshes the active room every two seconds.

- 3.1 SQLite/API surface: schema, create/get/update endpoints, validation, and runnable integration check.
- 3.2 Client sync wiring: server-backed create/join/edit/poll flow with local cache retained for reloads and transient outages.
- 3.3 Integration verification: production build plus existing receipt and math checks.
