# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small groups dining together in Egypt. One person starts a room after a meal, shares its short code, and the others join from their own phones to claim items and settle their shares.

## Product Purpose

SplitShare removes the awkward arithmetic from shared meals. It lets a group capture or enter a receipt, assign items to people, allocate tax and service proportionally, and see what each person owes. Success is a fair, understandable split without a group-chat spreadsheet or manual calculation.

## Positioning

SplitShare combines receipt capture, item-level claiming, and InstaPay settlement in one lightweight shared room. Its useful distinction is the local-first flow: the host can begin on-device, invite a table with a short code, and keep the bill understandable while the group settles.

## Operating Context

Usage happens immediately around a restaurant table, primarily on phones. The host creates a room and provides an InstaPay link; friends join with a six-character room code. Participants claim the items they had, shared items remain split across assignees, and tax plus service are allocated according to each person’s item share. A participant can pay the host through InstaPay and mark their share settled.

## Capabilities and Constraints

- Receipt images can be uploaded and read locally with OCR; plain-text receipts and manual item entry are also supported.
- Receipt items, quantities, prices, tax, service, assignments, totals, participant state, and settlement state are editable.
- Room and profile state persist in browser local storage. An optional HTTP API stores shared room state in SQLite for development synchronization.
- Currency is EGP and payment links use InstaPay URLs or usernames.
- The current flow has no user accounts, authentication, payment verification, or durable room lifecycle beyond the implemented local/API state model. Future work must not imply those capabilities.
- Room codes are six uppercase letters or numbers. The current implementation supports a single room in the active local profile.
- Preserve local-first behavior, touch-friendly controls, keyboard focus, labeled inputs, status announcements, and reduced-motion support.

## Brand Commitments

The product name is SplitShare. Existing copy commits to a warm, plainspoken voice centered on good food, fair sharing, and removing awkward group-chat math. InstaPay is the named settlement mechanism.

## Evidence on Hand

- Working UI and workflows in `src/App.jsx` and `src/styles.css`.
- Receipt math and local persistence in `src/lib/splitShareStore.js`.
- Receipt parsing and OCR handoff in `src/lib/receiptParser.js` and `src/App.jsx`.
- Optional SQLite sync service in `server/sync-server.mjs`.
- PWA metadata in `public/manifest.webmanifest` and the product icon in `public/icon.svg`.
- A deterministic sample receipt exists in `src/lib/receiptParser.js` for development checks.
- No production testimonials, customer logos, payment credentials, or validated market evidence are present; future work must not fabricate them.

## Product Principles

- Make the fair amount obvious to every person at the table.
- Keep the path from receipt to settled share short.
- Prefer item-level clarity over opaque equal splitting.
- Work locally first and stay useful when sync is unavailable.
- Keep payment handoff explicit; do not pretend SplitShare verifies payment.

## Accessibility & Inclusion

The product should remain usable on small touch screens and with keyboard navigation. Preserve visible focus states, semantic labels and status messaging, adequate touch targets, readable contrast, and the existing reduced-motion behavior. The repository does not establish a more specific accessibility standard yet.
