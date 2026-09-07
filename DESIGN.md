---
name: Pantry
description: "A kanban rack of signal cards — one card, one question: has this bin dropped below par?"
colors:
  kb-board: "#d9d2c2"
  kb-board-dark: "#0e0e10"
  kb-card: "#f5efe0"
  kb-card-dark: "#1e1d1a"
  kb-card-edge: "#c8bfa8"
  kb-card-edge-dark: "#35332c"
  kb-ink: "#1a1a17"
  kb-ink-dark: "#f2eee2"
  kb-ink-soft: "#5f5a4e"
  kb-ink-soft-dark: "#a8a294"
  kb-stocked: "#245c33"
  kb-stocked-dark: "#57c97e"
  kb-reorder: "#7a4e00"
  kb-reorder-dark: "#e8a33d"
  kb-out: "#a62a1f"
  kb-out-dark: "#ff6b57"
  ios-accent: "#0066ff"
  ios-accent-dark: "#0a84ff"
  ios-bg: "#f5f5f7"
  ios-bg-dark: "#000000"
  ios-surface: "#ffffff"
  ios-surface-dark: "#1c1c1e"
  ios-text: "#1a1a1a"
  ios-text-dark: "#f5f5f7"
  ios-text-secondary: "#86868b"
  ios-text-secondary-dark: "#98989d"
  ios-border: "#e5e5e7"
  ios-border-dark: "#38383a"
  ios-success: "#34c759"
  ios-danger: "#ff3b30"
  ios-warning: "#ff9500"
typography:
  card-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  bin-tag:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.12em"
  field-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.09em"
  stamp:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "10.5px"
    fontWeight: 800
    letterSpacing: "0.09em"
  numeral:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 800
    letterSpacing: "0"
    fontFeature: "tabular-nums"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  field-input:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 500
  ios-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 400
  ios-detail:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  ios-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.5px"
rounded:
  kb-stamped: "2px"
  ios-sm: "10px"
  ios-md: "14px"
  ios-lg: "20px"
  ios-full: "9999px"
spacing:
  kb-hair: "3px"
  kb-tight: "6px"
  kb-gap: "8px"
  kb-row: "10px"
  kb-gutter: "12px"
  kb-rack: "18px"
  ios-xs: "4px"
  ios-sm: "8px"
  ios-md: "16px"
  ios-lg: "24px"
  ios-xl: "32px"
components:
  kb-card:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.card-name}"
    rounded: "0px"
    padding: "10px 12px 10px 8px"
    height: "64px"
  kb-card-pulled:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.card-name}"
    padding: "10px 12px 10px 8px"
  kb-stamp-out:
    backgroundColor: "transparent"
    textColor: "{colors.kb-out}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "3px 7px"
  kb-stamp-stocked:
    backgroundColor: "transparent"
    textColor: "{colors.kb-stocked}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "3px 7px"
  kb-stamp-plain:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink-soft}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "3px 7px"
  kb-bin-tag:
    backgroundColor: "{colors.kb-card-edge}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.bin-tag}"
    rounded: "0px"
    padding: "6px 12px"
  kb-search:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.field-input}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 12px"
    height: "38px"
  kb-pulled-filter:
    backgroundColor: "transparent"
    textColor: "{colors.kb-out}"
    typography: "{typography.bin-tag}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 10px"
    height: "38px"
  kb-pulled-filter-pressed:
    backgroundColor: "{colors.kb-out}"
    textColor: "{colors.kb-card}"
    typography: "{typography.bin-tag}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 10px"
  kb-btn:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 14px"
    height: "44px"
  kb-btn-primary:
    backgroundColor: "{colors.kb-ink}"
    textColor: "{colors.kb-card}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 14px"
    height: "44px"
  kb-btn-danger:
    backgroundColor: "transparent"
    textColor: "{colors.kb-out}"
    typography: "{typography.stamp}"
    rounded: "{rounded.kb-stamped}"
    padding: "0 14px"
    height: "44px"
  kb-dock-scan:
    backgroundColor: "{colors.kb-ink}"
    textColor: "{colors.kb-card}"
    typography: "{typography.numeral}"
    rounded: "{rounded.kb-stamped}"
    height: "48px"
  kb-dock-new:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink}"
    rounded: "{rounded.kb-stamped}"
    height: "48px"
    width: "60px"
  kb-swipe-action-pull:
    backgroundColor: "{colors.kb-reorder}"
    textColor: "{colors.kb-card}"
    typography: "{typography.bin-tag}"
    width: "86px"
  kb-swipe-action-restock:
    backgroundColor: "{colors.kb-stocked}"
    textColor: "{colors.kb-card}"
    typography: "{typography.bin-tag}"
    width: "86px"
  kb-swipe-action-delete:
    backgroundColor: "{colors.kb-out}"
    textColor: "{colors.kb-card}"
    typography: "{typography.bin-tag}"
    width: "86px"
  ios-btn-primary:
    backgroundColor: "{colors.ios-accent}"
    textColor: "#ffffff"
    typography: "{typography.ios-body}"
    rounded: "{rounded.ios-sm}"
    padding: "8px 16px"
    height: "44px"
  ios-btn-secondary:
    backgroundColor: "{colors.ios-surface}"
    textColor: "{colors.ios-text}"
    typography: "{typography.ios-body}"
    rounded: "{rounded.ios-sm}"
    padding: "8px 16px"
    height: "44px"
  ios-input:
    backgroundColor: "{colors.ios-surface}"
    textColor: "{colors.ios-text}"
    typography: "{typography.ios-body}"
    rounded: "{rounded.ios-sm}"
    padding: "10px 12px"
    height: "44px"
  ios-item-row:
    backgroundColor: "{colors.ios-surface}"
    textColor: "{colors.ios-text}"
    typography: "{typography.ios-body}"
    rounded: "0px"
    padding: "12px 16px"
    height: "48px"
  ios-filter-pill:
    backgroundColor: "{colors.ios-surface}"
    textColor: "{colors.ios-text-secondary}"
    typography: "{typography.ios-detail}"
    rounded: "{rounded.ios-full}"
    padding: "5px 12px"
  ios-filter-pill-active:
    backgroundColor: "{colors.ios-accent}"
    textColor: "#ffffff"
    typography: "{typography.ios-detail}"
    rounded: "{rounded.ios-full}"
    padding: "5px 12px"
---

# Design System: Pantry

## Overview

**Creative North Star: "The Kanban Card"**

The lineage is the Toyota kanban signal card and the three-bin reorder system: a printed card that hangs on a rack and exists to say one thing — this bin dropped below par, refill it. Every rule in the forward system serves that sentence. An item is a card, not a tile; its state is a stamp pressed onto card stock, not a filled pill; and the interaction ritual is pulling a card off the rack. The board is duller than the card, so the card reads as a physical object resting on something rather than a painted region of the screen. Corners are effectively square (2px), rules are hairlines in the stock's own edge colour, and colour is spent only where it carries a signal.

**Scope, as shipped.** This world is applied to the **Pantry tab only** (`src/styles/world-kanban.css`, scoped to `.app-content[data-route='pantry']` and `.pantry-view`). The other four tabs — Grocery, Recipes, Saved, Settings — still run the **incumbent iOS-default system** (`src/styles/variables.css` + `src/styles/components.css`): blue accent, 10/14/20px radii, white cards on light grey, translucent chrome. That split is a deliberate, accepted, temporary state; propagation of The Kanban Card to the remaining tabs is the next planned step. **The Kanban Card is the project's design direction. The incumbent system is maintenance-only** — it governs surfaces not yet converted and must not be treated as the target for new work.

Two constraints from PRODUCT.md bind both systems and explain the shape of the world. First, the artifact is an iPhone-first installed PWA used one-handed in a kitchen and a store aisle, offline, sometimes glanced at between shelves: hence 44px minimum controls, the primary camera path parked in the thumb zone, and a fixed field grid that lets the eye scan a column without re-aiming. Second, the app honours the OS light/dark setting with no manual toggle, so every value must clear contrast on its own ground in both themes. The five-tab bottom bar keeps its native iOS affordances in all cases and is out of scope for either world.

**Key Characteristics:**
- Card stock and board, not surface and background: paper values (`#f5efe0` on `#d9d2c2`) in light, graphite on near-black in dark
- Squared-off geometry — one radius (2px) across the entire Pantry world
- State is stamped ink, never a colour fill
- Colour is a signal (stocked / reorder / out) and is never used decoratively
- Uppercase, heavily tracked micro-labels carry all secondary information
- Edge-to-edge rack: no floating panels, no inset cards, no elevation

## Colors

The Kanban Card palette is warm printed card stock carrying three signal inks; the incumbent palette is iOS system default. Dark mode is not a tinted copy of light — the **stock itself changes** to graphite on a dark board, with rules debossed rather than printed, and the signal inks brighten to hold on dark stock.

### Primary
- **Signal Red / Out Ink** (`kb-out`): the stockout. Card ink for the `Out` stamp, the 3px inset edge mark on a pulled card, the pulled-count filter's border, and the destructive swipe action's fill. The one state that earns extra weight (2px stamp border).
- **Card Ink** (`kb-ink`): all primary text, the dock's Scan button fill, the focus ring inside the Pantry world, and the baseline input's stroke. Doubles as the world's "black".

### Secondary
- **Stocked Green** (`kb-stocked`): the `Stocked` stamp on staples that are in stock, and the Restock swipe action's fill. Nothing else.
- **Reorder Amber** (`kb-reorder`): the Pull swipe action's fill. The middle of the three-bin signal; never used as a text colour or a state.

### Neutral
- **Board** (`kb-board`): the rack behind the cards, plus the sticky toolbar and dock grounds so they read as part of the board rather than as glass.
- **Card Stock** (`kb-card`): the card face, the search field, the detail panel, and the reversed text on filled ink.
- **Card Edge** (`kb-card-edge`): every hairline rule (1px), the bin-tag ground, the punch hole's stroke, and skeleton lines. One value carries all separation in the world.
- **Soft Ink** (`kb-ink-soft`): field labels, unit words, bin counts, placeholder text, notice copy, and the `Pull` stamp. Never a signal.

### Incumbent Neutral / Accent (un-propagated tabs only)
- **iOS Blue** (`ios-accent`): active tab, primary buttons, focused input borders, active filter pills across Grocery / Recipes / Saved / Settings.
- **iOS Grey Field, White Surface, Hairline Border, Secondary Grey** (`ios-bg`, `ios-surface`, `ios-border`, `ios-text-secondary`): white cards on light grey with 0.5px borders.
- **iOS Semantic Trio** (`ios-success`, `ios-danger`, `ios-warning`): filled status buttons and toasts in the incumbent tabs.

### Named Rules
**The Signal Ink Rule.** Colour in The Kanban Card is a signal or it does not appear. Stocked green, reorder amber and out red mean exactly one thing each; nothing in the world is coloured to look nice, to brand a surface, or to distinguish a section. If a new element cannot name which signal it carries, it is ink, soft ink, or stock.

**The Stock, Not Tint Rule.** Dark mode changes the card stock and the board, then re-picks the signal inks to hold on that stock. Never derive a dark palette by tinting, dimming, or overlaying the light values.

**The Own-Ground Rule.** Every text colour clears AA-normal against the ground it actually sits on, in both themes — verified in the shipped build: ink 15.20:1 / 14.53:1, soft ink 5.98 / 6.63, out 6.16 / 6.01, reorder 6.27 / 7.82, stocked 6.90 / 8.08. A colour whose only viable form is white-on-fill does not enter this system; the design it replaced measured 2.20:1 on filled state buttons.

**The Binary Depletion Rule.** Status colour is derived from `isOut` alone, never from a quantity. A par number on a card is reference information rendered in ink and soft ink; it never drives a signal colour, a progress meter, or a gradient. (Product truth, PRODUCT.md, "Decided 2026-09-07".)

## Typography

**Display Font:** none — the world ships no self-hosted or licensed face.
**Body Font:** the platform system stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Helvetica Neue`, sans-serif), shared with the incumbent system.
**Label/Mono Font:** none distinct; numerals use the same stack with `tabular-nums`.

**Character:** All voice comes from weight, case and tracking rather than from a face. Card names are set at a heavy-but-not-bold optical weight (650) with slightly negative tracking; everything secondary is uppercase, 700–800, and tracked open by 0.08–0.12em, so a label reads as a stamped field box rather than as prose. Numerals are always tabular and always heavier than their label.

**Known open dimension.** The typographic voice is unclaimed: the system stack was a binding constraint (native feel in an installed PWA), so the world's character is carried entirely by weight, caps and tracking. This is recorded as an unresolved dimension of the world, not as a settled choice. If a face is ever introduced, it is a world-level decision, not a per-screen one.

### Hierarchy
- **Card Name** (650, 16px, 1.25, -0.005em, clamped at 2 lines): the item. The only sentence-case text on a card; barcode lookups return long names, so it wraps twice then clamps.
- **Bin Tag** (800, 11px, 0.12em, uppercase): the sticky category label hanging over its rack, with its pulled count at 700/12px in soft ink.
- **Field Label** (700, 11px, 0.09em, uppercase, soft ink): `PAR` / `NO PAR` and the unit word on a card; detail-row labels at 10.5px.
- **Stamp** (800, 10.5px, 0.09em, uppercase): the state word. Bordered, never filled.
- **Numeral** (800, 13px, 0.09em → 0, `tabular-nums`, ink): the par value. Always in the world's darkest ink, one step larger and one step heavier than its label.
- **Body** (400, 14px, 1.45, soft ink): notice and empty-state copy only. There is no long-form text in this app.
- **Field Input** (500–700, 16px): search and the baseline editor. 16px is a floor, not a taste choice — iOS force-zooms a focused field below it.

### Named Rules
**The Fixed Track Rule.** Micro-labels and their numbers sit on a fixed grid (`56px 22px auto`), so the label and the number occupy a constant x on every row — measured at x=33 with a right edge of 115 across all rows in the shipped build. `tabular-nums` alone is insufficient: it locks glyph advance, not column origin. Any new row-level field set uses a grid, not inline flow.

**The Caps-For-Everything-But-The-Name Rule.** In The Kanban Card, the item name is the only sentence-case string on a card. Labels, states, counts, and button words are uppercase and tracked. Never introduce a sentence-case secondary line to a card row.

**The 16px Field Floor Rule.** Any focusable text or number input is at least 16px.

## Layout

`#app` is a fixed-height (100dvh) column: a scrolling content region over a fixed five-tab bar (`50px` plus the bottom safe-area inset). The shell pads content by 16px and honours the top safe area.

**The Pantry tab opts out of that padding.** The router writes the active route onto the content element (`contentEl.dataset.route = route`), and `.app-content[data-route='pantry']` zeroes the padding and paints the board. This is what makes the rack run edge to edge and what lets `position: sticky` measure from the real top of the screen. Any view that needs to own its own gutters uses this same `data-route` mechanism; nothing else overrides the shell.

**The rack.** Top to bottom: a sticky toolbar (`52px` plus the top safe-area inset; search field flexing, pulled-count filter fixed), then one rack per category in canonical `CATEGORIES` order — each opening with a sticky bin tag pinned directly beneath the toolbar (`top: safe-area + 52px`) — then 64px minimum card rows separated by hairlines, with 18px of board between racks. The view reserves the tab bar plus 92px at the bottom for the dock.

**The dock.** A fixed rail directly above the tab bar carrying the camera path: Scan takes the full flexible width, New is a fixed 60px. The product's first principle is "never make the user type what a camera can read", so the camera gets the reachable half of the thumb zone and typing gets the smaller affordance. The rail is opaque on purpose; a translucent version let card text ghost through and read as a defect rather than as depth.

**Spacing rhythm.** The world runs on a tight, small-step rhythm — 3 / 6 / 8 / 10 / 12 / 18px — with 12px as the horizontal gutter for every full-width element (toolbar, bin tag, card, dock, notice). Expanded detail is indented to 32px on the left so it hangs under its card rather than beside it. The incumbent tabs run the 4 / 8 / 16 / 24 / 32 scale.

**Responsive.** The phone is the only design target; an installed PWA nevertheless lands on iPad. At `min-width: 640px` the toolbar and rack column cap at 620px and centre, the dock centres, and the Scan button caps at 460px — one card row stretched to full tablet width stops reading as a card. There is no other breakpoint and no desktop layout.

### Named Rules
**The Edge-to-Edge Rack Rule.** The card grid is the composition, not content inside a panel. Cards span the full viewport width and are separated by hairlines; never inset the rack, never round the rack, never float a card.

**The Thumb-Zone Camera Rule.** The dominant primary action in a one-handed view is the camera, and it lives in the fixed dock above the tab bar. Typing is the smaller neighbouring affordance.

## Elevation & Depth

The Kanban Card is a **flat, material system**: depth comes from stock value and hairline rules, not from shadows. The card is lighter than the board, the bin tag is darker than the card, and separation is a 1px line in the card-edge colour. There is exactly one shadow in the world — a soft downward lift under the fixed dock — and one inset mark, the 3px signal-red bar on the left edge of a pulled card, which reads as an edge stamp rather than as lift. A pulled card also drops toward the out ink (`color-mix`, 88% stock / 12% out) so a pulled row is legible as a region before any word is read. Press feedback mixes 8% ink into the stock; there is no scale, no translate, no glow.

The incumbent system is likewise shadowless, layering white surfaces on grey with 0.5px borders, plus one saturated backdrop-filter on the tab bar (the native iOS chrome, preserved deliberately).

### Shadow Vocabulary
- **Dock lift** (`box-shadow: 0 -6px 16px -8px rgb(0 0 0 / 0.35)`): the only shadow in The Kanban Card. It separates the fixed dock from the scrolling rack behind it. Nothing else in the world casts.

### Named Rules
**The Flat Stock Rule.** Surfaces do not lift. Depth is expressed by stock value (board → card → tag) and by 1px card-edge rules. A new Pantry-world element that needs to feel separate changes its ground or gains a rule; it does not gain a shadow.

**The Opaque Chrome Rule.** Sticky and fixed chrome inside The Kanban Card is painted with the solid board colour. Translucency was tried on the dock and rejected: text ghosting through a rail reads as a rendering defect, not as material.

## Shapes

One radius governs the entire Pantry world: **2px** — enough to avoid a razor corner in print, too little to read as a rounded UI. It applies uniformly to stamps, buttons, fields, notices and skeleton lines. Cards, bin tags and the detail panel have **no radius at all**, because they are full-bleed pieces of stock, not chips.

Borders carry the form language. There are four border weights and each means something: **1px** card-edge is a structural rule (card separators, toolbar and dock edges, detail rows); **1.5px** is a control's stroke (buttons, stamps, inputs, the punch hole); **2px** is emphasis, used only for the `Out` stamp's heavier press and the dock buttons' stroke; **dashed 1.5px** marks a thing that is available rather than asserted (the `Pull` stamp, the empty-state notice).

Two signature geometries recur: the **punch hole** — a 9px circle stroked in card-edge at the leading edge of every card, the hole a real kanban hangs by, and the only circle in the world — and the **stamp rotation**, a `rotate(-2deg)` (or `-1deg` for the dashed `Pull`) that keeps the ink mark from sitting on the grid like a button.

The incumbent system, by contrast, is soft-cornered throughout (10 / 14 / 20px, plus fully-round pills and circular icon buttons). Do not mix the two vocabularies on one surface.

### Named Rules
**The One Radius Rule.** Everything in The Kanban Card that has a corner has a 2px corner. Full-bleed stock has none. There is no radius scale in this world; a pill, a capsule, or a 12px card belongs to the incumbent system.

**The Stamp-Is-Rotated Rule.** State marks sit off-axis by 1–2 degrees. Nothing else in the world rotates.

## Components

### Buttons
- **Shape:** squared (2px radius), 1.5px stroke in card-edge, transparent ground, uppercase 800 label tracked 0.09em, 44px minimum height.
- **Primary:** solid ink ground with card-stock text (`kb-btn-primary`), full width, used once per detail panel for the card's main verb ("Pull this card" / "Put back on the rack").
- **Danger:** out-ink stroke and out-ink text on transparent ground. Destructive actions are never filled in the detail panel; the fill is reserved for the swipe action.
- **Inline (detail rows):** 32px minimum, 10.5px label — the one place the 44px floor yields, because the row itself is the target area.
- **Press / Focus:** press is a ground shift only; focus is a 2px ink outline inset by 3px (`outline-offset: -3px`) so a ring on a full-bleed card never clips off-screen.
- **Incumbent buttons** (other tabs): 10px radius, filled accent or semantic colour, 15px/500 sentence-case label, 44px minimum, `opacity: 0.6` on press.

### Chips
The Kanban Card has no chips. Its one filter — the pulled count in the toolbar — is a squared, out-ink-stroked toggle that inverts to a solid out-ink fill when pressed (`aria-pressed`), pairing an 11px uppercase word with a 14px tabular number. Do not add a pill-shaped filter row to this world; the incumbent tabs' round `filter-pill` stays in the incumbent tabs.

### Cards / Containers
- **Corner style:** none — full-bleed stock.
- **Background:** card stock on a duller board; a pulled card shifts 12% toward out ink and gains a 3px inset out-ink edge.
- **Shadow strategy:** none (see Elevation & Depth).
- **Border:** a 1px card-edge rule on the bottom edge only, so a rack reads as a stack of stock rather than as boxes.
- **Internal padding:** `10px 12px 10px 8px`, 10px between the punch, the name block, and the stamp; 64px minimum row height.

### Inputs / Fields
- **Style:** card-stock ground on the board, 1px card-edge stroke (1.5px in ink for the baseline number editor), 2px radius, 16px text. The search field is 38px tall inside the 52px toolbar; the number editor is 62px wide, right-aligned, tabular.
- **Focus:** the world's 2px inset ink outline. No colour shift, no glow.
- **Placeholder:** soft ink.
- **Incumbent inputs:** 10px radius, 0.5px border, border colour shifts to accent blue on focus.

### Navigation
The five-tab bottom bar is shared, untouched, and native by intent: fixed, 50px plus safe area, translucent (`backdrop-filter: saturate(180%) blur(20px)` over an 85% surface), 0.5px top border, 22px SVG glyph over a 10px/500 label, accent blue when active. It is deliberately **not** themed by The Kanban Card — preserving native iOS affordances is a product constraint. Nothing in either world restyles it, and the Pantry world reserves space for it rather than drawing over it.

### Signature Component: The Stamp
The state of a card is a stamped ink mark, not a filled button: 3px/7px of padding, a `currentColor` border, a 2px radius and a `rotate(-2deg)` tilt, sitting in a 78×44px hit area at the trailing edge of the row. It exists in exactly three forms:
- **Out** — out ink, **2px** border. A stockout is the one state that earns extra weight.
- **Stocked** — stocked ink, 1.5px border. Shown only on a staple that is in stock.
- **Pull** — soft ink, **dashed**, tilted `-1deg`. An item with no declared baseline: an available action rather than a state, so it spends no signal ink at all.

Two properties make the stamp load-bearing, and both are why a fill was rejected. The ink is dark enough to read at text contrast on stock, where white-on-fill measured 2.20:1 in the design this replaced; and the word survives greyscale and colour-blindness on its own, without the colour.

### Signature Component: The Swipe Row
Row actions live behind a trailing swipe rather than as buttons competing inside the row. Each action is an 86px full-height block in a signal fill with card-stock text — Pull in reorder amber, Restock in stocked green, Delete in out red. The gesture opens past a 40% throw and snaps with `cubic-bezier(0.22, 1, 0.36, 1)` over 180ms; only one row is open at a time; `touch-action: pan-y` and an 8px direction lock keep vertical scrolling through the rack from ever being stolen. Action buttons stay in the DOM so they remain reachable by keyboard and screen reader, and focus inside the actions layer slides the surface open so focus never lands on something invisible.

### Signature Component: Expand-in-Place Detail
A tapped card expands beneath itself instead of opening a modal: the same card stock, indented to 32px on the left, a stack of label/value rows separated by 1px rules, the primary verb full-width in solid ink, then Edit and Delete side by side. One card is open at a time. This is the world's answer to depth — the rack opens, it does not stack.

### Resilience states (shared, both worlds)
A small shared layer at the end of `components.css` applies app-wide and belongs to neither world: skeleton rows with a 1.4s opacity pulse (the Pantry world re-skins these as 64px card-stock rows with card-edge lines), inline field errors, `[hidden]` enforcement, disabled controls at 0.35 opacity, a `:focus-visible` outline on real controls, and a `prefers-reduced-motion` block that collapses all animation and transition durations. Every new surface inherits these; do not re-implement them per world, and do not treat them as part of either world's identity.

## Do's and Don'ts

### Do:
- **Do** build new Pantry-tab surfaces from `--kb-*` tokens only, and give any new view that needs its own gutters a `data-route` opt-out rather than fighting `.app-content`'s padding.
- **Do** express state as a bordered ink stamp on stock, tilted 1–2 degrees, with a word that survives greyscale.
- **Do** put row-level labels and numbers on a fixed grid (`56px 22px auto`) so they hold a constant x down the rack; `tabular-nums` alone is not sufficient.
- **Do** keep one radius (2px) in The Kanban Card, and no radius at all on full-bleed stock.
- **Do** verify every new text colour at AA-normal against the ground it actually sits on, in both light and dark, before it enters the system.
- **Do** change the card stock and re-pick the signal inks for dark mode, rather than tinting the light palette.
- **Do** keep the primary camera action in the fixed dock in the thumb zone, with 44px minimum controls throughout.
- **Do** paint sticky and fixed chrome with the solid board colour.
- **Do** leave the five-tab bottom bar and the shared resilience layer exactly as they are.
- **Do** treat un-propagated tabs as maintenance: patch them in the incumbent system's own vocabulary until The Kanban Card is propagated, and convert a whole tab at once rather than blending the two.

### Don't:
- **Don't** use colour decoratively in The Kanban Card. If an element's colour cannot be named as stocked, reorder, or out, it is ink, soft ink, or stock.
- **Don't** derive a status colour, meter, or gradient from a quantity. Depletion is binary and comes from `isOut` alone.
- **Don't** express state as a filled pill with white text; that is the pattern this world replaced, and it measured 2.20:1.
- **Don't** add shadows to Pantry-world surfaces. The only shadow in the world is the dock's lift.
- **Don't** make Pantry chrome translucent; text ghosting through a rail reads as a defect.
- **Don't** introduce pill or capsule radii, circular icon buttons, or the incumbent 10/14/20px radius scale into The Kanban Card.
- **Don't** inset, round, or float the rack, and don't turn a card row into a tile.
- **Don't** open a modal for a row's detail; expand it in place, one at a time.
- **Don't** put a sentence-case secondary line on a card; secondary text is uppercase and tracked.
- **Don't** ship a focusable text or number input below 16px.
- **Don't** restyle the bottom tab bar in either world.
- **Don't** extend the incumbent iOS-default system with new patterns, and don't cite it as the project's design direction; it is what still governs un-propagated tabs, nothing more.
