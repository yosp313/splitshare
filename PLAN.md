# SplitShare illustrative introduction page

## Overview

Build a polished first-run introduction screen for SplitShare by upgrading the existing `Welcome` screen in `src/App.jsx`. The screen should explain the product at a glance through a small editorial illustration of the scan → split → settle flow, then let a user immediately create or join a room.

This is an in-app entry experience, not a new public marketing route. `App` already renders `Welcome` whenever there is no stored profile or room, so the feature should fit that existing local-first flow.

## Users and core flow

- A host arriving at SplitShare for the first time understands the benefit, selects a profile emoji, enters a name and InstaPay shareable link, and creates a room.
- A participant understands that they can join an existing split, switches to “Join a room,” enters their name and six-character code, and enters the room.
- A returning user with a stored room continues directly to the existing room view.

## Acceptance criteria

1. With no stored profile/room, the app opens on an illustrative introduction page with SplitShare branding, clear value proposition, and visible scan–split–settle visual storytelling.
2. The existing “Start a split” and “Join a room” modes remain usable from the introduction page, including emoji selection, field validation, error messaging, and their current create/join handlers.
3. Successful create and join flows enter `RoomView` unchanged; existing receipt, settlement, persistence, and sync behavior is not altered.
4. The illustration is decorative and does not compete with or intercept the form. Decorative elements are hidden from assistive technology.
5. The page works at desktop and narrow mobile widths (minimum supported body width is 320px) without horizontal overflow or clipped controls.
6. Keyboard focus remains visible and logical; reduced-motion users do not receive required animation.
7. No new runtime dependency, route, API endpoint, persisted field, or server change is needed.

## Existing architecture to preserve

### Screen selection

`src/App.jsx` decides the entry screen with:

- `!state.profile || !state.room` → `Welcome`
- otherwise → `RoomView`

Do not introduce a second onboarding flag or a new router for this request. The existing local-storage behavior in `getStoredState` and `saveStoredState` remains authoritative.

### Relevant components and interfaces

- `Welcome({ mode, setMode, form, setForm, onCreate, onJoin, error })`: owns the introduction markup and existing entry form props. Extend this component’s presentation only.
- `Brand` and `Icon`: reuse these existing primitives for the logo and any small illustration glyphs.
- `App`: continue passing the current handlers and state; no new data flow is expected.
- `src/styles.css`: add the illustration and responsive rules alongside the existing `/* Welcome */` styles, matching current tokens and breakpoints.

### Domain and external dependencies

No domain changes are planned. Continue using the existing React/Vite stack, CSS, inline SVG icons, and already loaded typography. Do not add an illustration library, animation library, image asset, or new service.

## Proposed UI modules

1. **Introduction shell**
   - Keep the existing full-height `welcome-page` and `welcome-nav` structure.
   - Preserve the logo, “Made for the table” note, editorial cream/black/coral/yellow visual language, and bottom “Scan · split · settle” cue.

2. **Illustrative story block**
   - Add a compact static visual near the hero copy or as a controlled layer within the left column.
   - Show three recognizable stages: a receipt being scanned, people/items being assigned, and a settled payment/share result.
   - Prefer CSS shapes and existing `Icon` paths (receipt, scan, users, share, check, spark) over image generation or new assets.
   - Use `aria-hidden="true"` on purely decorative wrappers; keep explanatory copy in real text.
   - Keep the illustration subordinate to the headline and leave the form as the dominant interaction on desktop and mobile.

3. **Entry card**
   - Retain the current tabs, profile emoji picker, create fields, join fields, primary buttons, privacy note, and error region.
   - Keep mode switching as the only state change introduced by the page; do not add carousel/onboarding steps.
   - Ensure the illustration does not alter autofocus, tab order, form labels, or submit behavior.

## Data model

No new persisted data.

Existing state remains:

```text
state = {
  profile: Profile | null,
  room: Room | null,
  friends: Friend[]
}
```

The illustration uses static presentation only. It must not create demo rooms, write fake receipt data, or imply that its visual values are live state.

## Build phases

### Phase 1 — Baseline and structure

- Confirm the current `Welcome` render path and inspect the existing desktop/mobile CSS.
- Keep the current DOM contract for form controls and handlers.
- Add the smallest static illustration markup needed for the three stages, using existing primitives.

**Verify:** the app still renders the existing create/join form and no imports or handlers become unused.

### Phase 2 — Visual treatment

- Style the illustration with existing CSS tokens: cream ground, ink outlines, yellow receipt/action accents, coral emphasis, and muted rules.
- Use composition, overlap, borders, and small labels to make the scan → split → settle narrative legible without a dependency.
- Add only the responsive rules required at the existing 820px and 560px breakpoints.
- Reuse the existing entrance animation conventions, and ensure the reduced-motion rule covers any new motion.

**Verify:** desktop and mobile layouts have no overflow; the form remains readable and primary.

### Phase 3 — Interaction and accessibility pass

- Confirm the illustration is non-interactive unless a control is explicitly needed; do not add decorative click targets.
- Check focus order, visible focus rings, text contrast, labels, and the `role="alert"` error path.
- Test both modes with empty and invalid inputs, then successful create/join paths against the existing sync service workflow.

**Verify:** all existing entry behavior is unchanged and the illustration is ignored by screen readers.

### Phase 4 — Regression verification

- Run `npm run build`.
- Run the existing deterministic domain checks relevant to the touched surface (`node scripts/check-math.mjs`, `node scripts/check-receipt.mjs`, and `node scripts/check-payment.mjs`); no new domain test is needed unless implementation changes domain logic.
- Review at desktop and mobile widths, including keyboard focus, validation/error state, and the returning-user room path.

**Milestone:** the first-run screen communicates the product visually, remains functional, and does not expand the application architecture.

## Risks and mitigations

- **Ambiguous “intro page” meaning:** this plan assumes the requested page is the current first-run entry screen, because the repository has no router or separate landing route. If a standalone marketing page is intended, it would need a separate route/screen decision.
- **Illustration crowds the form:** constrain the visual to the left/story area, collapse or simplify it on small screens, and preserve the entry card’s width and controls.
- **Decorative UI becomes misleading:** use static labels and presentation-only values; do not connect the artwork to room or receipt state.
- **Remote typography/network unavailable:** keep the existing font fallbacks; layout must remain usable without Google Fonts.
- **Animation harms accessibility or performance:** keep motion CSS-only and subtle, and honor the existing `prefers-reduced-motion` rule.

## Assumptions

- The primary audience is diners using a phone or laptop at a shared table.
- The existing visual direction (editorial typography, cream background, black/yellow/coral palette) is desired and should be extended rather than replaced.
- “Illustrative” means a lightweight in-product visual story, not a photographic hero or an externally generated raster asset.
- The Coder may adjust copy and spacing modestly to fit the illustration, but must not change product claims, room behavior, or payment semantics.
- Existing backend availability and InstaPay validation remain prerequisites for the current create flow; this task does not add offline room creation.

## Open-questions summary

None blocking. The only material ambiguity—the meaning of “intro page”—is resolved above in favor of evolving the existing `Welcome` screen.
