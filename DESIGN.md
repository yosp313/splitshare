---
name: SplitShare
description: A warm, plainspoken tool for splitting a shared meal fairly.
colors:
  ink: '#111111'
  muted: '#746f65'
  ground: '#f5f2ea'
  paper: '#fbfaf6'
  line: '#ded9cd'
  yellow: '#f4c63d'
  coral: '#e27a55'
  blue: '#6d7fce'
  settled: '#dce9c9'
  dark-panel: '#2b2b29'
  dark-hover: '#2c2c2a'
  dark-copied: '#3b392f'
  dark-border: '#44423e'
  warm-brown: '#4d4328'
  settled-ink: '#52663f'
  lede-ink: '#605c53'
  eyebrow-ink: '#6b675e'
  claim-ink: '#7c6826'
  money-ink: '#7e796e'
  live-green: '#83ae67'
  secondary-ink: '#898479'
  tab-ink: '#8b867b'
  owe-kicker: '#8c7c48'
  owe-muted: '#8d8160'
  owe-value: '#9d906f'
  quiet-ink: '#8d887d'
  placeholder: '#9a9589'
  error-ink: '#a14e33'
  owe-icon: '#a48728'
  faint-ink: '#aaa499'
  invite-kicker: '#99978f'
  footer-ink: '#aaa59a'
  share-ink: '#aaa69d'
  invite-copy: '#c1beb5'
  ring-muted: '#c6bbae'
  input-hover: '#c7c0b2'
  dash-border: '#c8c2b5'
  ring-border: '#d8d2c5'
  input-border: '#e5dfd2'
  field-border: '#e5e0d5'
  loader-border: '#e8e2d6'
  people-border: '#e8e3d8'
  owe-rule: '#ead79e'
  people-rule: '#ebe7dc'
  item-rule: '#ebe7df'
  owe-border: '#ebd79a'
  total-border: '#f0cabb'
  error-surface: '#f8e4de'
  total-surface: '#f9e7df'
  yellow-hover: '#ffd65b'
  paper-wash: '#fff7dc'
  white: '#fff'
  white-soft: 'rgba(255,255,255,.08)'
  shadow-soft: 'rgba(53, 48, 39, .08)'
typography:
  display:
    fontFamily: 'Manrope, sans-serif'
    fontSize: 'clamp(3.6rem, 8.2vw, 6.9rem)'
    fontWeight: 800
    lineHeight: 0.91
    letterSpacing: '-0.09em'
  body:
    fontFamily: 'Manrope, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: 'DM Mono, monospace'
    fontSize: '10px'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: '0.08em'
  serifAccent:
    fontFamily: 'Playfair Display, serif'
    fontSize: '25px'
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: '-0.06em'
  scale:
    xxs: '8px'
    xs: '9px'
    sm: '11px'
    body: '12px'
    body-lg: '13px'
    md: '17px'
    code: '14px'
    action: '15px'
    title-sm: '19px'
    title: '21px'
    title-lg: '23px'
    display-sm: '24px'
    display-md: '30px'
    display-lg: '31px'
    display-xl: '32px'
    display-2xl: '34px'
    mobile: '54px'
    mobile-lg: '61px'
    room-max: '62px'
    heading-max: '50px'
    hero: '98px'
    hero-max: '111px'
rounded:
  xs: '2px'
  sm: '5px'
  md: '8px'
  lg: '14px'
  field: '7px'
  pill-sm: '4px'
  error: '6px'
  control: '9px'
  panel-sm: '10px'
  panel-lg: '12px'
  panel-xl: '13px'
  button-lg: '15px'
spacing:
  sm: '8px'
  md: '16px'
  lg: '26px'
components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: '0 18px'
    height: '43px'
  button-accent:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
    rounded: '{rounded.md}'
    padding: '0 18px'
    height: '43px'
  surface-card:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '30px'
---

# Design System: SplitShare

## Overview

**Creative North Star: "A good table, made legible."**

SplitShare uses a warm paper ground, black ink, and small signals of yellow and coral to make a practical money tool feel human at the table. The visual voice is direct and lightly editorial: oversized compact headlines set the mood, while monospaced labels and ruled surfaces make the calculation auditable.

The system is intentionally friendly without becoming playful chrome. Its best moments are small acts of clarity: a room code that is easy to copy, an item that visibly belongs to someone, and a fair total that stands apart from the working details.

**Key Characteristics:**
- Warm off-white ground with paper-toned surfaces.
- Black ink and mono labels for trust and scanability.
- Yellow for action and attention; coral for emphasis and warmth.
- Compact rounded corners, fine borders, and restrained ambient shadows.

## Colors

The palette is warm and low-glare, with yellow and coral used sparingly as functional signals rather than decoration.

### Primary
- **Ink**: the main text and primary action color.
- **Sunlit Yellow**: action, selection, and the most important live signal.
- **Table Coral**: editorial emphasis, errors, and secondary attention.

### Secondary
- **Quiet Blue**: available for secondary state or future supporting information; do not let it compete with yellow.
- **Settled Green**: paid and completed states.

### Neutral
- **Warm Ground**: page background.
- **Paper**: cards and readable working surfaces.
- **Muted Ink**: secondary copy and labels.
- **Rule**: borders and dividers.

### Named Rules
**The Fair Total Rule.** The amount a person owes must be more visually obvious than the arithmetic supporting it.

## Typography

**Display Font:** Manrope (with sans-serif fallback)
**Body Font:** Manrope (with sans-serif fallback)
**Label/Mono Font:** DM Mono

**Character:** Manrope is compact, friendly, and highly legible at the table. DM Mono gives codes, labels, dates, and small state indicators an instrument-like precision.

### Hierarchy
- **Display** (800, `clamp(58px, 8.2vw, 111px)`, `.91`): welcome headline and high-level product promise.
- **Headline** (800, `clamp(30px, 3.4vw, 50px)`, `.95`): room and receipt titles.
- **Title** (800, `21px–25px`, `1.05`): panel and entry-card headings.
- **Body** (400–600, `11px–16px`, `1.5–1.65`): instructions, descriptions, and helper copy.
- **Label** (400–800, `10px–11px`, tracked uppercase): metadata, state, and navigation cues.

## Layout

The welcome surface uses a centered asymmetric two-column composition: an oversized message beside one focused entry card. The room surface uses a wide receipt column beside a compact details sidebar, collapsing to a single stack below `820px`. Page gutters are fluid on desktop and fixed to touch-safe margins on mobile. Vertical rhythm is generous around major headings and tighter inside working panels.

## Elevation & Depth

Depth is mostly tonal: warm paper against warm ground, fine rules, and a few controlled shadows. Shadows are ambient and soft, never structural or dramatic. The yellow primary action can use a small grounded offset to feel touchable.

### Shadow Vocabulary
- **Entry lift** (`0 20px 45px rgba(53, 48, 39, .10)`): welcome entry card only.
- **Button grounding** (`0 4px 0 rgba(17, 17, 17, .10)`): primary dark buttons.

## Shapes

Surfaces use compact rounded corners: 5px for controls and dense fields, 8px for buttons and small controls, and 10–14px for larger cards. Borders are thin and warm. Avoid pills except for small status labels; circular silhouettes are reserved for avatars, icon buttons, and compact marks.

## Components

### Buttons
- **Shape:** compact rounded rectangles (8px), with a 43px minimum height and 48px on coarse pointers.
- **Primary:** black background, white text, bold Manrope, and a small grounding shadow.
- **Accent:** yellow background with black text for the main upload or settlement action.
- **Hover / Focus:** slight upward movement on hover; visible yellow focus ring everywhere.

### Cards / Containers
- **Corner Style:** 8–14px depending on scale.
- **Background:** paper surfaces on warm ground; dark invite card for high-contrast room sharing.
- **Shadow Strategy:** ambient lift only on the welcome entry card.
- **Border:** 1px warm rule for working surfaces.
- **Internal Padding:** 17px–30px.

### Inputs / Fields
- **Style:** warm near-paper background, 1px warm border, 7px radius, and clear labels above.
- **Focus:** black border plus a 4px translucent yellow ring.
- **Error:** pale coral background with darker coral text.

### Navigation
- **Style:** quiet header with brand mark, mono room metadata, and plain text actions. Mobile keeps the room code centered and protects touch targets.

### Receipt Editor
The receipt editor is the product's signature working surface: sparse rows, visible EGP values, direct inline edits, and an explicit claim button per item. Do not hide the assignment state behind a modal.

## Do's and Don'ts

### Do:
- **Do** keep the fair amount and the next action obvious within seconds.
- **Do** use yellow as a functional signal for action, selection, or live state.
- **Do** preserve readable labels, visible focus, and touch-sized controls.
- **Do** let borders and spacing organize dense receipt information.

### Don't:
- **Don't** turn the room into a generic dashboard of equal cards.
- **Don't** use gradients, neon glow, or decorative illustrations where the receipt itself should lead.
- **Don't** imply payment verification; SplitShare only hands off to InstaPay and records the user's settlement mark.
- **Don't** make mobile users reach for tiny controls or hover-only affordances.
