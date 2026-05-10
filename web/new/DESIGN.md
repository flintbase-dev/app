---
version: alpha
name: Flint
description: Developer-first AI inference platform. The visual language is grounded in the metaphor of flint stone — angular, precise, and capable of generating heat and light on demand.

colors:
  # Brand — Flint orange ramp
  brand-50:  "#FEF2EC"
  brand-100: "#FDD5BC"
  brand-200: "#FAB48A"
  brand-300: "#F78F55"
  brand-400: "#F26B1F"
  brand-500: "#D45512"
  brand-600: "#A83E0A"
  brand-700: "#7C2A05"
  brand-800: "#511803"
  brand-950: "#270900"

  # Neutral — Obsidian warm-gray ramp
  neutral-50:  "#F6F4F1"
  neutral-100: "#E3E0D9"
  neutral-200: "#C5C2B9"
  neutral-300: "#9C9A91"
  neutral-400: "#6F6D65"
  neutral-500: "#4C4A43"
  neutral-600: "#33312B"
  neutral-700: "#201F1A"
  neutral-800: "#141310"
  neutral-950: "#0F0E0D"

  # Semantic — Info (Steel blue)
  info:        "#2D6DB8"
  info-bg:     "#EEF4FB"
  info-dark:   "#0D305A"

  # Semantic — Success (Moss green)
  success:     "#3B6D18"
  success-bg:  "#EEF5E8"
  success-dark: "#163006"

  # Semantic — Warning (Gold)
  warning:     "#C08C0A"
  warning-bg:  "#FEF8E6"
  warning-dark: "#291B00"

  # Semantic — Danger (Ember red)
  danger:      "#BC2C2C"
  danger-bg:   "#FDEEEE"
  danger-dark: "#2A0404"

  # Semantic tokens
  primary:       "{colors.brand-400}"
  primary-hover: "{colors.brand-500}"
  primary-subtle: "{colors.brand-50}"
  text-primary:   "{colors.neutral-950}"
  text-secondary: "{colors.neutral-500}"
  text-tertiary:  "{colors.neutral-300}"
  text-on-brand:  "{colors.brand-50}"
  bg-base:        "#FFFFFF"
  bg-surface:     "{colors.neutral-50}"
  bg-dark:        "{colors.neutral-950}"
  bg-dark-surface: "{colors.neutral-800}"
  border:         "{colors.neutral-100}"
  border-emphasis: "{colors.neutral-200}"

typography:
  display:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.03em

  h1:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.02em

  h2:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.015em

  h3:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.01em

  body-lg:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: 0em

  body-md:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em

  body-sm:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em

  label-lg:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0em

  label-md:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0em

  label-caps:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.07em

  caption:
    fontFamily: Geist, -apple-system, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em

  code-md:
    fontFamily: "IBM Plex Mono", monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em

  code-sm:
    fontFamily: "IBM Plex Mono", monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em

spacing:
  base: 8px
  2:  2px
  4:  4px
  6:  6px
  8:  8px
  12: 12px
  16: 16px
  20: 20px
  24: 24px
  32: 32px
  48: 48px
  64: 64px
  96: 96px
  max-width: 1200px
  content-width: 720px

rounded:
  none: 0px
  xs:   2px
  sm:   4px
  md:   6px
  lg:   8px
  xl:   12px
  2xl:  16px
  full: 9999px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.text-on-brand}"
    typography:      "{typography.label-lg}"
    rounded:         "{rounded.lg}"
    height:          36px
    padding:         14px

  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"

  button-secondary:
    backgroundColor: "transparent"
    textColor:       "{colors.text-primary}"
    typography:      "{typography.label-lg}"
    rounded:         "{rounded.lg}"
    height:          36px
    padding:         14px

  button-ghost:
    backgroundColor: "transparent"
    textColor:       "{colors.text-secondary}"
    typography:      "{typography.label-lg}"
    rounded:         "{rounded.lg}"
    height:          36px
    padding:         14px

  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor:       "{colors.danger}"
    typography:      "{typography.label-lg}"
    rounded:         "{rounded.lg}"
    height:          36px
    padding:         14px

  button-sm:
    height:  28px
    padding: 10px
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"

  button-lg:
    height:  44px
    padding: 20px
    typography: "{typography.body-md}"
    rounded:    "{rounded.xl}"

  input:
    backgroundColor: "{colors.bg-base}"
    textColor:       "{colors.text-primary}"
    typography:      "{typography.body-sm}"
    rounded:         "{rounded.lg}"
    height:          36px
    padding:         10px

  input-focus:
    backgroundColor: "{colors.bg-base}"
    textColor:       "{colors.text-primary}"

  input-error:
    backgroundColor: "{colors.bg-base}"
    textColor:       "{colors.text-primary}"

  badge-brand:
    backgroundColor: "{colors.primary-subtle}"
    textColor:       "{colors.brand-700}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.full}"
    padding:         8px

  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor:       "{colors.info-dark}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.full}"
    padding:         8px

  badge-success:
    backgroundColor: "{colors.success-bg}"
    textColor:       "{colors.success-dark}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.full}"
    padding:         8px

  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor:       "{colors.warning-dark}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.full}"
    padding:         8px

  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor:       "{colors.danger-dark}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.full}"
    padding:         8px

  card:
    backgroundColor: "{colors.bg-base}"
    rounded:         "{rounded.xl}"
    padding:         20px

  card-surface:
    backgroundColor: "{colors.bg-surface}"
    rounded:         "{rounded.xl}"
    padding:         20px

  alert-info:
    backgroundColor: "{colors.info-bg}"
    textColor:       "{colors.info-dark}"
    rounded:         "{rounded.lg}"
    padding:         14px

  alert-success:
    backgroundColor: "{colors.success-bg}"
    textColor:       "{colors.success-dark}"
    rounded:         "{rounded.lg}"
    padding:         14px

  alert-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor:       "{colors.warning-dark}"
    rounded:         "{rounded.lg}"
    padding:         14px

  alert-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor:       "{colors.danger-dark}"
    rounded:         "{rounded.lg}"
    padding:         14px
---

# Flint Design System

## Overview

Flint is a developer-first AI inference platform. Its visual identity is grounded in the metaphor of flint stone — a material that is angular, ancient, and precise, yet capable of generating fire on demand. This duality — raw utility and latent power — defines every design decision.

The target audience is software engineers and ML practitioners who are highly sensitive to visual noise, marketing-speak, and aesthetic overdesign. The UI must earn their trust through clarity, precision, and density rather than through warmth or visual delight.

**Personality:** Precise. Direct. Grounded. Quietly powerful.

**What to evoke:** The feeling of a well-made tool — a good text editor, a well-tuned terminal. Nothing decorative for its own sake. Everything serving a function.

**What to avoid:** Consumer AI aesthetics (soft gradients, bubbly corners, purple-blue palettes). Anything that feels like marketing. Anything cute, playful, or rounded beyond necessity.

The brand operates in two modes: a **dark mode** for hero and marketing surfaces (deep obsidian grounds the brand color), and a **light mode** for product UI, documentation, and dashboards. Both modes share the same token system.

---

## Colors

The palette is built from two primary ramps — Flint orange and Obsidian warm-gray — plus four functional semantic colors. The warm-gray is intentionally not cool or blue-shifted; it shares the same chromatic territory as the brand orange, which makes the two feel unified rather than in tension.

- **Brand / Flint (`brand-400: #F26B1F`):** A vivid red-orange — the color of a struck flint spark. This is the only brand color and should be used sparingly: primary CTA buttons, links, active states, and brand marks only. Never used decoratively.

- **Obsidian (`neutral-*`):** A warm gray ramp ranging from near-white (`#F6F4F1`) to near-black (`#0F0E0D`). The slight warmth — a trace of the brand orange's hue — keeps the neutrals from feeling cold or clinical. This ramp forms the entire structural foundation: backgrounds, borders, text, dividers.

- **Info / Steel (`#2D6DB8`):** A desaturated blue used for informational states and links within body copy where the brand orange would create too much visual weight.

- **Success / Moss (`#3B6D18`):** An earthy green for success states. Warm-biased to stay coherent with the overall palette temperature.

- **Warning / Gold (`#C08C0A`):** A muted amber for warnings. Deliberately less saturated than the brand orange to avoid visual confusion.

- **Danger / Ember (`#BC2C2C`):** A controlled red for error and destructive states.

### Dark mode color mapping

In dark mode, surface colors invert to the deep end of the Obsidian ramp. Brand orange shifts one stop lighter (`brand-300: #F78F55`) to compensate for the darker background. Text and border tokens shift accordingly. All semantic colors use their `-bg` and `-dark` variants for surface and text respectively.

---

## Typography

Flint uses two typefaces with distinct roles:

**Geist** handles all UI text — navigation, headings, body, labels, captions. Its geometric precision and high legibility at small sizes make it ideal for dense developer interfaces.

**IBM Plex Mono** handles all code — inline snippets, code blocks, API responses, technical metadata like latency numbers, token counts, and timestamps. The monospace signals: *this is data, not prose.*

### Scale rationale

The scale compresses toward the large end (display and h1 have tight tracking at −0.02em to −0.03em) and relaxes toward the small end. Only two weights are used: **400 Regular** for body and **500 Medium** for headings, labels, and interactive elements. Weight 600+ is never used — it reads as too heavy against the platform's editorial tone.

**Label caps** (`11px / 500 / 0.07em / uppercase`) is used exclusively for section labels, table headers, and sidebar group titles. It must never be used for body content.

---

## Layout

Flint follows a **Fixed-Max-Width** desktop layout (max 1200px) with a centered content column (720px for documentation and long-form prose). All spacing derives from an 8px base unit.

The 8px grid is strict. Micro-adjustments of 2px or 4px are permitted only within component internals (e.g., icon-to-label gaps, badge padding). No arbitrary pixel values.

**Page structure:**
- Navigation: 48px fixed top bar (dark)
- Sidebar (dashboard): 240px fixed, content fills remainder
- Content column: max 720px, centered with 32px margins
- Card grid: 12px or 24px gaps

**Documentation pages** use a generous `line-height: 1.7` on body copy and 48px vertical rhythm between sections to prioritize readability over density.

**Dashboard pages** use tighter spacing (12–16px gaps, `line-height: 1.5` on data labels) to prioritize information density.

---

## Elevation & Depth

Flint is a **border-first, shadow-minimal** system. Visual hierarchy is established through tonal contrast and border weight, not drop shadows.

| Level | Usage | Implementation |
|---|---|---|
| 0 | Flat cards, dividers, table rows | `border: 0.5px solid neutral-100` |
| 1 | Dropdowns, popovers | `box-shadow: 0 1px 3px rgba(0,0,0,.06)` |
| 2 | Modals, floating panels | `box-shadow: 0 2px 8px rgba(0,0,0,.08)` |
| 3 | Command palette, toasts | `box-shadow: 0 4px 16px rgba(0,0,0,.10)` |

The default border weight is `0.5px` — unusually thin, giving components a precision-machined quality. `1px` borders are used only for hover and emphasis states. `2px` brand-colored borders mark selected/featured cards — this is the only exception to the 0.5px rule.

In dark mode, shadows are removed entirely. Hierarchy is conveyed through tonal layers of the Obsidian ramp (950 → 800 → 700 → 600).

---

## Shapes

Flint's corner radius is conservative and intentional. The language is **engineered rather than organic** — just enough softness to feel modern, not enough to feel rounded or playful.

| Token | Value | Usage |
|---|---|---|
| `none` | 0px | Dividers, single-sided borders |
| `xs` | 2px | Micro elements — tags, table cells |
| `sm` | 4px | Code blocks, kbd shortcuts |
| `md` | 6px | Buttons (default), select dropdowns |
| `lg` | 8px | Input fields, alerts, progress bars |
| `xl` | 12px | Cards (default), modals |
| `2xl` | 16px | Large cards, hero panels |
| `full` | 9999px | Badges, chips, avatar circles, toggles |

**Single-sided border accents** (left-border on alerts, for example) must always use `border-radius: 0`. Never apply corner radius to a border that does not enclose all four sides.

---

## Components

### Buttons

Four variants: **primary**, **secondary**, **ghost**, and **danger**. Three sizes: sm (28px), default (36px), lg (44px).

Primary uses the brand color fill with brand-50 text. Secondary uses a transparent background with a 0.5px neutral-200 border. Ghost is transparent with no border — used for low-priority actions and icon buttons. Danger uses the danger-bg fill with danger text — never a solid red background for non-destructive-confirmation contexts.

Hover states: primary darkens one ramp stop (brand-400 → brand-500). Secondary and ghost gain a neutral-50 background fill. All transitions are 120ms ease.

Buttons containing icons place the icon at 14×14px. Never let icons inherit the button's font size.

Icon-only buttons (square) use equal horizontal and vertical padding to produce a square hit area.

### Input Fields

Height 36px, `body-sm` typography, neutral-200 border at rest. On focus: border transitions to `brand-400`, with a `box-shadow: 0 0 0 3px rgba(242,107,31,.12)` focus ring. Error state: border becomes `danger`, focus ring uses `rgba(188,44,44,.10)`.

Helper text sits below the field at `caption` size in `text-tertiary`. Error messages replace helper text at `caption` size in `danger`.

Select elements match input field styling exactly. Never style selects differently from text inputs.

### Badges & Status Tags

Badges use the `full` border radius (pill shape). All badge variants use the 50-level background and 700-level text from the same color ramp — never generic black or white text on colored backgrounds.

Inline code tags use `neutral-50` background, `neutral-600` text, `sm` (4px) radius, and IBM Plex Mono.

### Cards

Default cards: white background, 0.5px neutral-100 border, `xl` (12px) radius, 20px padding. Surface cards: neutral-50 background, no border (background contrast provides separation).

Featured or selected cards use a `2px brand-400` border — the only 2px border in the system. Background and radius remain identical to default cards; only the border weight and color change.

### Alerts

Four semantic variants (info, success, warning, danger) using their respective `-bg` background and a `3px left border` in the solid semantic color. No icon is required but a 16×16px icon may be placed left-aligned. Text is `body-sm` in the `-dark` semantic text color.

### Toggles

36×20px pill shape using `full` radius. Off state: neutral-200 track, white thumb. On state: brand-400 track, white thumb. Thumb is 14×14px, positioned 3px from the nearest edge. Transition: 150ms ease on both track color and thumb position.

### Data Tables

Header row: neutral-50 background, 0.5px neutral-100 bottom border, `label-caps` typography in `text-tertiary`. Data rows: `body-sm` in `text-secondary`, 0.5px neutral-50 row dividers. Hover row: neutral-50 background. The table itself carries no outer border — the container card provides the boundary.

### Navigation (Top Bar)

48px height, neutral-950 background. Logo in 500 weight, `neutral-50` color. Nav links in `body-sm`, `neutral-300` at rest, white on hover with neutral-600 background pill. Active link uses `brand-300` text (lighter for dark surface legibility). CTA button uses brand-400 background, brand-50 text, `md` radius — the only brand fill element in the nav.

### Code Blocks

neutral-800 background, neutral-50 base text. Syntax highlighting uses: brand-300 for identifiers/method names, `#98c379` for strings, `#61afef` for keywords, `#d19a66` for numbers and booleans. Padding 12px vertical, 14px horizontal. Radius `xl` (12px). Horizontal scrolling permitted; never wrap code.

---

## Do's and Don'ts

- **Do** use `brand-400` as the sole brand color. One color, one role: primary interactive action.
- **Don't** use brand orange decoratively — not for section dividers, not for illustrations, not for backgrounds.
- **Do** use `0.5px` borders by default. Reserve `1px` for hover/emphasis and `2px` only for featured card selection.
- **Don't** mix corner radii within the same component. A button cannot have `xl` on one corner and `md` on another.
- **Do** use IBM Plex Mono for all numeric technical data — latency, token counts, timestamps, API keys.
- **Don't** use Geist for inline code or code blocks.
- **Do** maintain WCAG AA contrast (4.5:1) for all text. The `brand-400` orange on white is borderline — use `brand-500` or darker for small body text.
- **Don't** use more than two font weights (`400` and `500`) anywhere in the product.
- **Do** use warm-gray neutrals (Obsidian ramp) exclusively. Never introduce a cool or blue-shifted gray.
- **Don't** add drop shadows to flat card surfaces. Borders and tonal contrast carry elevation.
- **Do** use `label-caps` only for structural section labels and table headers. Never for body content or descriptions.
- **Don't** place brand-400 text on brand-50 backgrounds at sizes below 14px — the contrast ratio is insufficient.
- **Do** use the dark hero pattern (neutral-950 surface + brand-400 CTA) for landing pages and marketing.
- **Don't** use gradient backgrounds, mesh backgrounds, or noise textures anywhere in the product.
- **Do** keep icon sizes explicit: 14px within buttons, 16px in lists and alerts, 20px for empty states, 24px for navigation.
- **Don't** let icons inherit container font sizes — always set explicit dimensions.
