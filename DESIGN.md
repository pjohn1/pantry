---
name: Pantry
description: "Warm paper lists — cream stock on a duller board, plain sentence case, every control a 44px target."
colors:
  kb-board: "#d9d2c2"
  kb-board-dark: "#0e0e10"
  kb-card: "#f5efe0"
  kb-card-dark: "#1e1d1a"
  kb-card-edge: "#c8bfa8"
  kb-card-edge-dark: "#35332c"
  kb-control-edge: "#7c7361"
  kb-control-edge-dark: "#8a8577"
  kb-ink: "#1a1a17"
  kb-ink-dark: "#f2eee2"
  kb-ink-soft: "#5f5a4e"
  kb-ink-soft-dark: "#a8a294"
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
  ios-text-secondary: "#63636a"
  ios-text-secondary-dark: "#98989d"
  ios-border: "#e5e5e7"
  ios-border-dark: "#38383a"
  ios-success: "#34c759"
  ios-danger: "#ff3b30"
  ios-warning: "#ff9500"
  ios-badge: "#b3261e"
  ios-badge-dark: "#ff453a"
typography:
  row-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  row-sub:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0"
  row-number:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0"
    fontFeature: "tabular-nums"
  group-head:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0"
  control-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "0"
  notice-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  field-input:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 500
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.01em"
  cover-monogram:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  ios-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "16px"
    fontWeight: 400
  ios-detail:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  ios-control:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "15px"
    fontWeight: 500
rounded:
  kb-control: "8px"
  kb-check: "7px"
  kb-flush: "0px"
  ios-sm: "10px"
  ios-md: "14px"
  ios-lg: "20px"
  ios-full: "9999px"
spacing:
  kb-tight: "4px"
  kb-gap: "8px"
  kb-gutter: "12px"
  kb-block: "16px"
  kb-section: "24px"
  ios-xs: "4px"
  ios-sm: "8px"
  ios-md: "16px"
  ios-lg: "24px"
  ios-xl: "32px"
components:
  kb-row:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.row-name}"
    rounded: "{rounded.kb-flush}"
    padding: "0 0 0 3px"
    height: "48px"
  kb-row-out:
    backgroundColor: "color-mix(in srgb, #f5efe0 88%, #a62a1f)"
    textColor: "{colors.kb-ink}"
    typography: "{typography.row-name}"
    rounded: "{rounded.kb-flush}"
    height: "48px"
  kb-check:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink}"
    rounded: "{rounded.kb-flush}"
    size: "44px"
  kb-check-box:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    rounded: "{rounded.kb-check}"
    size: "24px"
  kb-check-box-ticked:
    backgroundColor: "{colors.kb-ink}"
    textColor: "{colors.kb-card}"
    rounded: "{rounded.kb-check}"
    size: "24px"
  kb-del:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink-soft}"
    rounded: "{rounded.kb-flush}"
    size: "44px"
  kb-toolbar:
    backgroundColor: "{colors.kb-board}"
    textColor: "{colors.kb-ink}"
    rounded: "{rounded.kb-flush}"
    padding: "0 12px"
    height: "52px"
  kb-search:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    typography: "{typography.field-input}"
    rounded: "{rounded.kb-control}"
    padding: "0 12px"
    height: "44px"
  kb-tool-btn:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink}"
    rounded: "{rounded.kb-control}"
    size: "44px"
  kb-add:
    backgroundColor: "{colors.kb-ink}"
    textColor: "{colors.kb-card}"
    rounded: "{rounded.kb-control}"
    size: "44px"
  kb-filter:
    backgroundColor: "transparent"
    textColor: "{colors.kb-out}"
    typography: "{typography.group-head}"
    rounded: "{rounded.kb-control}"
    padding: "0 12px"
    height: "44px"
  kb-filter-pressed:
    backgroundColor: "{colors.kb-out}"
    textColor: "{colors.kb-card}"
    typography: "{typography.group-head}"
    rounded: "{rounded.kb-control}"
    padding: "0 12px"
    height: "44px"
  kb-group-head:
    backgroundColor: "{colors.kb-board}"
    textColor: "{colors.kb-ink-soft}"
    typography: "{typography.group-head}"
    rounded: "{rounded.kb-flush}"
    padding: "10px 12px 4px"
  kb-btn:
    backgroundColor: "transparent"
    textColor: "{colors.kb-ink}"
    typography: "{typography.control-label}"
    rounded: "{rounded.kb-control}"
    padding: "0 16px"
    height: "44px"
  kb-btn-danger:
    backgroundColor: "transparent"
    textColor: "{colors.kb-out}"
    typography: "{typography.control-label}"
    rounded: "{rounded.kb-control}"
    padding: "0 16px"
    height: "44px"
  kb-notice:
    backgroundColor: "{colors.kb-card}"
    textColor: "{colors.kb-ink-soft}"
    typography: "{typography.notice-body}"
    rounded: "{rounded.kb-control}"
    padding: "18px"
  ios-btn-primary:
    backgroundColor: "{colors.ios-accent}"
    textColor: "#ffffff"
    typography: "{typography.ios-control}"
    rounded: "{rounded.ios-sm}"
    padding: "8px 16px"
    height: "44px"
  ios-btn-secondary:
    backgroundColor: "{colors.ios-surface}"
    textColor: "{colors.ios-text}"
    typography: "{typography.ios-control}"
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
    rounded: "{rounded.kb-flush}"
    padding: "12px 16px"
    height: "48px"
  saved-cover:
    backgroundColor: "{colors.kb-card}"
    borderColor: "{colors.kb-card-edge}"
    rounded: "{rounded.kb-control}"
    height: "56px"
  saved-cover-placeholder:
    backgroundColor: "{colors.kb-card}"
    borderColor: "{colors.kb-control-edge}"
    textColor: "{colors.kb-ink-soft}"
    typography: "{typography.cover-monogram}"
    rounded: "{rounded.kb-control}"
    height: "56px"
---

# Design System: Pantry

## Overview

**Creative North Star: "Warm Paper"**

The world is a sheet of warm cream paper laid on a duller board: full-bleed rows of card stock, hairline rules between them, one soft radius on anything you touch, and nothing else. It replaced a signage-styled predecessor whose heavy weights, wide tracking and capitals read as cold and jargon-heavy to the one person who uses the app. The lesson is recorded as the world's operating principle: **comfort comes from line height, plain sentence case, and 44px targets — not from ornament.** Every row says the same plain thing in the same plain voice, and the eye finds the exception (an item you are out of) by a coloured edge rather than by a badge.

Density is the other half of the character. Eleven items, six group headings and the toolbar all land inside one 393×852 viewport with no horizontal overflow, because a row is exactly 48px and a group heading is a quiet label rather than a printed band. The list is the composition; there are no panels, no cards inside cards, no elevation. One thing floats, and only one: the dock holding the view's primary verb, in the bottom corner where a thumb already is.

**Scope, as shipped.** Warm Paper is worn by **Pantry, Grocery and Saved** (`src/styles/world-kanban.css`, scoped to `.kb-list-view` and to `.app-content[data-route='pantry'|'grocery'|'inspo']`). **Settings alone still runs the incumbent iOS-default system** (`src/styles/variables.css` + `src/styles/components.css`): blue accent, 10/14/20px radii, white surfaces on light grey, translucent tab chrome. That split is a deliberate, accepted state, not a defect — Warm Paper is the project's design direction and the incumbent system is maintenance-only for the one surface it still governs.

Saved converted because it is a list, and it was the only list still speaking the other language: a two-column 4:5 photo grid with black gradient overlays and two circular buttons floating on each 190px thumbnail. It is now the same row on the same board as the other two, which is what "clean and cohesive with the rest of the app" resolved to.

The split is about **surfaces**, and two shared components are not surfaces: the **add/edit sheet** and the **toast** are modal children of the list views, opened and raised on every write, and both are Warm Paper now. They used to be the loudest reminder that the world stopped at the edge of the list — you tapped add on cream stock and got iOS-default white with a blue button, then a black pill dropped onto the board to confirm it.

Two product constraints from PRODUCT.md bind the world. It is an iPhone-first installed PWA used one-handed in a kitchen and a store aisle, offline, glanced at between shelves — hence the 44px floor on every control and the 16px floor on every field. And it honours the OS light/dark setting with no manual toggle, so every value clears contrast on its own ground in both themes.

**Key Characteristics:**
- Cream card stock on a duller board (`#f5efe0` on `#d9d2c2`), graphite on near-black in dark
- Plain sentence case everywhere; zero uppercase elements in either list view
- One 48px row height, hairline-ruled, edge to edge
- 8px on controls, 7px on the checkbox, zero on rows and group headings
- Colour is a signal: out-of-stock is the only thing that spends ink
- Chrome is sticky inside the existing scroller; the only fixed element is the dock
- The list derives itself — there is no refresh button, and there must not be one

## Colors

The palette is unchanged from the previous world and its contrast measurements carry forward: warm printed stock carrying one signal ink. Dark mode is not a tinted copy — the **stock itself changes** to graphite on a dark board, with rules debossed rather than printed, and the signal ink brightens to hold on dark stock.

### Primary
- **Signal Red / Out Ink** (`kb-out`): the one colour in the world. It is the 3px inset bar and the 12% ground shift on a row you are out of, the group heading's out-count, the out-only filter's stroke and its pressed fill, and the danger button's stroke and text. Nothing else is coloured.
- **Ink** (`kb-ink`): all primary text, the ticked checkbox fill, the add button's ground, and the world's focus ring. Doubles as the world's black.

### Neutral
- **Board** (`kb-board`): the ground behind the rows, and the sticky toolbar and group headings, so chrome reads as part of the board rather than as glass.
- **Card Stock** (`kb-card`): every row, the search field, the tool buttons, the notice panel, and reversed text on filled ink.
- **Card Edge** (`kb-card-edge`): decorative hairlines only — the 1px row rule, the toolbar rule, the group-head rule, the notice outline and the skeleton bars. It measures 1.60:1 on card and 1.22:1 on board, which is fine for a separator and not fine for anything that has to be found.
- **Control Edge** (`kb-control-edge`): the stroke on anything whose border is the only thing identifying it as a control — the search field, the tool and dock buttons, the unticked checkbox, text buttons, the staple toggle. Measured 4.08:1 on card and 3.11:1 on board in light, 4.58 / 5.24 in dark, so every one of them clears the 3:1 floor for a UI component boundary. This is a split from card-edge, not an addition to it: a hairline between two pieces of stock and a stroke that carries a control are different jobs and were one value.
- **Soft Ink** (`kb-ink-soft`): the row's "usually buy" line, group headings, placeholder text, notice copy, and the delete glyph. Never a signal.

`--kb-stocked` and `--kb-reorder` are **gone**. They were declared in both themes and referenced by no rule, and with depletion binary there was no state left for a second or third signal to mean. The world has one signal ink.

### Incumbent Neutral / Accent (Settings)
- **iOS Blue** (`ios-accent`): active tab label, primary buttons, focused input borders, active filter pills.
- **iOS Grey Field, White Surface, Hairline Border, Secondary Grey** (`ios-bg`, `ios-surface`, `ios-border`, `ios-text-secondary`): white surfaces on light grey with 0.5px borders. The secondary grey was darkened from `#86868b` to `#63636a`, because at the old value every piece of secondary copy in the incumbent system measured 3.33–3.62:1 — field hints, empty states, row details, the barcode scanner's live status and the inactive tab label. It now measures 5.47:1 on the grey field and 5.96:1 on white.
- **Badge** (`ios-badge`): the tab bar's grocery count, which is a numeral and therefore text. White on `ios-danger` measured 3.55:1 at 10px; it is now white on `#b3261e` (6.54:1) in light and near-black on `#ff453a` (5.11:1) in dark.
- **iOS Semantic Trio** (`ios-success`, `ios-danger`, `ios-warning`): `ios-danger` fills the two genuinely destructive confirmations. `ios-success` and `ios-warning` are declared and unused — the filled-green confirmation they used to paint measured 2.02–2.22:1 and has been replaced (see The Ink Confirmation Rule).

### Named Rules
**The Signal Ink Rule.** In Warm Paper, colour is a signal or it does not appear. Out-of-stock is currently the only signal, so it is currently the only colour. A new element that cannot name the state it signals is ink, soft ink, or stock — and a new signal earns a colour only when the state it marks is one the user actively looks for.

**The Ink, Not Green Rule.** A ticked checkbox fills with `--kb-ink`, deliberately not green. Nearly every pantry row is ticked, so a coloured column of confirmations would be decoration; the exception is what deserves colour, and the exception is the row you are out of.

**The Stock, Not Tint Rule.** Dark mode changes the card stock and the board, then re-picks the signal ink to hold on that stock. Never derive a dark palette by tinting, dimming, or overlaying the light values.

**The Own-Ground Rule.** Every text colour clears AA-normal against the ground it actually sits on, in both themes — measured in the shipped build: ink 15.20:1 light / 14.53:1 dark, soft ink 5.98 / 6.63, out ink 6.16 / 6.01. A colour whose only viable form is white-on-fill does not enter this system. The rule now extends to borders: a stroke that is the only thing identifying a control clears 3:1 on its own ground, which is what `--kb-control-edge` exists for.

**The Ink Confirmation Rule.** A confirmation is ink on stock, and the words carry the state. Filled green and filled red pills were tried and removed: they measured 2.02–2.22:1 and 3.41–3.55:1, and a coloured confirmation is decoration in a world where colour means a state you are looking for. An error toast is the one that shifts, to out ink — because an error *is* a state.

**The Binary Depletion Rule.** Status is derived from `isOut` alone, never from a quantity. A "usually buy" number on a row is reference information in ink and soft ink; it never drives a colour, a meter, or a gradient. (Product truth, PRODUCT.md, "Decided 2026-09-07".)

## Typography

**Display Font:** none — the world ships no self-hosted or licensed face.
**Body Font:** the platform system stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Helvetica Neue`, sans-serif), shared with the incumbent system.
**Label/Mono Font:** none distinct; numbers use the same stack with `tabular-nums`.

**Character:** Plain and quiet. All hierarchy comes from two sizes and two weights on one face: a 17px semibold item name over a 13px medium detail line, in sentence case, with letter-spacing at `0`. There is no tracked micro-label, no capitals, and no third voice. The only heavier note in a row is the number inside the detail line, set at 700 and tabular so a column of quantities lines up.

**Known open dimension.** The typographic voice is unclaimed by choice of face: the system stack is a binding native-feel constraint for an installed PWA. Character therefore comes from size, weight and case restraint. If a face is ever introduced, it is a world-level decision, not a per-screen one.

### Hierarchy
- **Row name** (600, 17px, 1.3, -0.01em, clamped at 2 lines): the item. Barcode lookups return long names, so it wraps to a second line rather than truncating — a shopping-list row has no detail sheet to read the full text in. The `-0.01em` is optical correction at 17px, not a style.
- **Row detail** (500, 13px, 1.25, soft ink): "usually buy 6" on Pantry; on your shopping list, either the amount or why the row is there ("you ran out", "you usually buy this"). Line height is set explicitly so a wrapped row cannot push past the 48px the tap targets establish.
- **Row number** (700, 13px, `tabular-nums`, ink): the "usually buy" figure inside the detail line. One weight step and one colour step above its own sentence; never larger.
- **Group heading** (600, 13px, soft ink) with its out-count (600, 13px, `tabular-nums`, out ink): the category label on the board.
- **Control label** (600, 15px): button words — "Try again", "Set up your staples", "Cancel", and the staple toggle's label.
- **Notice body** (400, 15px, 1.45, soft ink): empty, failed and loading copy only. There is no long-form text in this app.
- **Field input** (500, 16px): the search field and the shared sheet's fields.
- **Tab label** (500, 10px): the four bottom tabs, and the only sub-13px type in the app. It is native iOS tab-label size and is deliberately exempt.
- **Cover monogram** (700, 22px, soft ink): one character inside a 56px cover tile on Saved, and the only type in the app above 17px. It is a mark rather than a sentence — the type equivalent of an icon — which is why it sits off the reading ramp rather than extending it. Nothing else may take this size.

### Named Rules
**The Nothing-Is-Uppercase Rule.** No text in Warm Paper is uppercased. `text-transform` does not appear in the world's stylesheet, and a render of both list views contains zero uppercase elements. Capitals plus heavy weight plus wide tracking is signage typography; it was tried, it read as cold, and it was removed from all nine rules that carried it. Sentence case, always.

**The 13px Floor Rule.** Nothing inside a list view is set below 13px. The single exception in the app is the native 10px tab label, which is the platform's own size for that element and is not a licence to introduce 10–12px type anywhere else.

**The 16px Field Floor Rule.** Any focusable text or number input is at least 16px. Below it, iOS force-zooms a focused field.

**The Two-Weights Rule.** The ladder is 500 / 600 / 700 and letter-spacing is `0`. Nothing is 800, nothing is tracked open. Weight, not tracking, carries emphasis.

## Layout

`#app` is a fixed-height column: a scrolling content region over a fixed four-tab bar (`50px` plus the bottom safe-area inset). `html`/`body` own the viewport height at `100dvh`; the shell pads content by 16px and honours the top safe area.

**Pantry and Grocery opt out of that padding.** The router writes the resolved route onto the content element (`contentEl.dataset.route = route`), and `.app-content[data-route='pantry'|'grocery']` zeroes the padding and paints the board. This is what makes rows run edge to edge and what lets `position: sticky` measure from the real top of the screen. Any view needing its own gutters uses this same `data-route` mechanism; nothing else overrides the shell.

**The list.** Top to bottom: a sticky toolbar (`min-height: 52px` plus the top safe-area inset, holding search and — on Pantry — the out-only filter), then on the shopping list a "N to get" note, then one group per category in canonical `CATEGORIES` order, each opening with a non-sticky group heading, then 48px rows separated by hairlines. Group headings used to be sticky; thirteen sticky elements sharing one offset meant thirteen composited layers for a label, so they now scroll with the board. The toolbar is `min-height`, not `height`, so a grown label cannot overflow a fixed-height sticky box. The view reserves the tab bar, 24px, the dock's own height and 16px at the bottom.

**Navigation up top, action down low.** The toolbar holds only what is navigation — search, and the filter. The verbs live in the dock, within a thumb's reach: both usage scenes are one hand on a phone, and the top-right corner of a 6.7" screen is the one place a thumb cannot reach without regripping. This reverses the previous arrangement, where add and receipt-scan were toolbar buttons and the world contained no fixed elements at all. The dock is now the single exception, and it is built to The Floating Control Rule rather than around it.

**Spacing rhythm.** 4 / 8 / 12 / 16 / 24px, with 12px as the horizontal gutter for every full-width element (toolbar, group heading, notice, list note) and 8px as the toolbar's gap. 24px is the dock's and the toast's clearance above the tab bar, and it is a floor, not a preference.

**Side insets.** `viewport-fit=cover` is set, so `--safe-area-left` / `--safe-area-right` are honoured on the tab bar, the content region, the toolbar, every row and the toast. They were absent entirely, which put the leading checkbox of every row under the display's corner radius in landscape. The incumbent surfaces run the 4 / 8 / 16 / 24 / 32 scale.

**The floor of the screen is spoken for.** From the bottom up: the tab bar (50px plus the bottom inset), 24px of mandatory clearance, then the dock, then 10px, then the toast. Every one of those offsets is computed from `--tab-bar-height`, `--safe-area-bottom` and `--kb-dock-h` rather than written as a number, so adding a dock button moves the toast and the list's padding with it.

**Responsive.** The phone is the only design target; an installed PWA nevertheless lands on iPad. At `min-width: 640px` the toolbar and list column cap at 620px and centre. There is no other breakpoint and no desktop layout.

### Named Rules
**The Floating Control Rule.** Anything floating above `.tab-bar` needs **≥24px clearance** from the bar's top edge, **`z-index: 120`**, and must be a **child of `#app`** — a sibling of the tab bar, never a descendant of the router's content element. On iOS, `-webkit-backdrop-filter` promotes the tab bar to a composited layer whose *hit* region WebKit inflates by roughly the blur radius, so a closer element silently receives none of its taps; this made an earlier bottom dock completely untappable on a real iPhone. Clearance is the load-bearing half — `z-index` alone is necessary but not sufficient, because the inflation happens in the compositor rather than in paint order. Two corollaries: **never put `position: fixed` on `html`/`body`** (it strands the visual viewport and leaves paint and touch coordinates offset for the rest of the session), and **never let a view container own a transform** (it becomes the containing block for every fixed descendant; the view-enter animation is opacity-only for exactly this reason). Documented in place next to `.tab-bar` in `src/styles/layout.css`.

**The Sticky, Never Fixed Rule.** Chrome inside a list view is `position: sticky` within the existing scroller — never `position: fixed`, because a fixed descendant of the router's content element is reparented the moment that element is replaced or transformed. The one fixed element in the world lives outside the view entirely, as a child of `#app`; that is the only shape a floating control may take here.

**The Edge-to-Edge List Rule.** The rows are the composition, not content inside a panel. Rows span the full viewport width and are separated by hairlines; never inset the list, never round a row, never float one.

**The Uniform Row Rule.** Rows are uniform **within a list**: 48px on Pantry and Grocery (49px when a long name wraps), 72px on Saved, which carries a 56px cover tile. Adjacent 44px targets leave no ambiguous band between them. What the rule forbids is a row whose height depends on its content — that is what makes taps land on the neighbour — not two lists that each pick a height and hold it. Measured on Saved with a mix of one- and two-line titles: every row 72px, because two lines still come to 65.4px inside it.

## Elevation & Depth

Warm Paper is a **flat, material system**: depth comes from stock value and hairline rules, never from shadows. The card stock is brighter than the board, group headings sit on the board, and separation is a 1px line in the card-edge colour. The world casts **no shadow at all**. Its one `box-shadow` is an `inset` bar — the 3px out-ink mark on the leading edge of a row you are out of — which reads as a printed edge, not as lift. A row you are out of also shifts 12% toward out ink (`color-mix`) so it is legible as a region before any word is read.

The incumbent surfaces are likewise near-flat (white on grey with 0.5px borders). The tab bar's saturated `backdrop-filter` is native iOS chrome, preserved deliberately.

### Shadow Vocabulary
- **Out-of-stock edge** (`box-shadow: inset 3px 0 0 0 var(--kb-out)`): marks a row you are out of. Being inset, it prints rather than lifts.
- **Dock lift** (`box-shadow: 0 2px 10px rgb(26 26 23 / 18%)`, 55% black in dark): the world's one outer shadow, and the one exception to The No-Cast Rule. The dock is the only element that floats over scrolling stock, so it has to read as above the page rather than punched into it. Nothing that sits *in* the page earns this.

### Named Rules
**The No-Cast Rule.** Nothing that sits in the page casts a shadow. An element that needs to feel separate changes its ground or gains a hairline; `inset` prints a mark onto stock. The single exception is the dock, which is genuinely above the page — and it is the only one the world grants.

**The Opaque Chrome Rule.** Sticky chrome in Warm Paper is painted with the solid board colour. Translucency was tried and rejected: row text ghosting through a bar reads as a rendering defect, not as material. The native tab bar keeps its blur because it is the platform's own chrome.

## Shapes

The form language is one soft radius on things you touch and no radius on the sheet itself. **8px** governs every control — the search field, the tool and dock buttons, the out-only filter, text buttons, the staple toggle, the toast, the sheet's top corners, the notice panel and the receipt review list. **7px** is the checkbox, one step tighter so a 24px square does not read as a circle. **Full-bleed rows and group headings have no radius at all**, because they are pieces of stock, not chips. (The loading skeleton's bar keeps a 2px radius; it is a leftover one-off, not a scale step, and nothing new should adopt it.)

Borders carry the rest of the form. There are two weights and each means something: **1px** in card-edge is a structural rule (row separators, toolbar and group-head rules, the notice panel's outline); **1.5px** is a control's own stroke (the checkbox, the filter, text buttons), and 1px in control-edge is the stroke on a filled control (the search field, the tool and dock buttons, the staple toggle). The ticked checkbox is drawn as a 2px card-stock tick rotated inside a filled ink square — the only rotation in the world, and it is a glyph construction rather than a stylistic tilt. Icons are inline SVG at 19–20px.

The incumbent system is soft-cornered throughout (10 / 14 / 20px, plus fully-round pills and circular icon buttons). Do not mix the two vocabularies on one surface.

### Named Rules
**The Derived List Rule.** The shopping list is an output, never a document. It reconciles itself against the standing order on every open and after every write to that order, and the reconciliation is additive — `manual` and `out` rows keep their identity and their ids, and an existing `auto` row is left alone rather than destroyed and re-minted under the user's thumb. There is no refresh button and there must not be one; "Refresh list" sat below every category group, meant `.clear()`, and made the product's one uncopyable mechanism a thing the user had to remember.

The rule needs one supporting primitive: deleting an `auto` row **snoozes** its standing-order entry until that item is next purchased. Without it, auto-derivation would put the row back before the user's thumb left the screen. A snoozed staple says so on its Settings row, so the state is never silently held.

**The Kept-Place Rule.** A search query, a filter and a scroll position survive a tab switch. The router destroys and rebuilds a view on every navigation — that is deliberate and stays — so the *state* is cached in a module-level map (`src/utils/view-state.ts`) and rehydrated by the factory, never the DOM. Both usage scenes are interrupted ones; re-typing a search after every look-away was the most repeated friction in the app.

**The Two Radii Rule.** In Warm Paper, controls are 8px, the checkbox is 7px, and full-bleed stock is 0. There is no other step. A pill, a capsule, or a 14px panel belongs to the incumbent system.

**The 44px Target Rule.** Every interactive element is at least 44px in its smallest dimension. Measured in the shipped build with the Pantry tab rendered: **zero controls under 44px**. The visible box may be smaller — the checkbox draws at 24px inside a 44px target, the sheet's close mark at 18px inside 44, Saved's pencil and trash at 19px inside 44 — but the target may not. `.kb-row-main` is the case this rule previously claimed and did not hold: `.kb-row` centres its children, so the name block never stretched to the row's 48px and the Pantry edit target measured 26.1px. It now carries its own `min-height: 44px`.

## Components

### Buttons
- **Shape:** 8px radius, 44px minimum height, 15px/600 sentence-case label.
- **Text button** (`.kb-btn`): transparent ground, 1.5px control-edge stroke, ink label. Used for a notice's retry, the first-run "Set up your staples", and the receipt panel's Cancel. It no longer appears in a list footer — "Refresh list" is gone, because the list derives itself (see The Derived List Rule).
- **Icon buttons** (`.kb-tool-btn`): 44×44, card stock, 1px control-edge stroke, 20px inline SVG. Now the toolbar's secondary slot only; `:disabled` drops it to 0.45 opacity, which it needed and did not have — the shared `.btn:disabled` rule never matched it, so a receipt mid-scan looked exactly like one waiting to be started.
- **Dock buttons** (`.kb-dock-btn`): 52×52, 8px radius, card stock with a 1px control-edge stroke and the world's one outer shadow. `.kb-dock-btn--primary` is the inverted one — solid ink ground, card-stock glyph — because add is the dock's primary verb.
- **Focus:** a 2px ink outline inset by 3px (`outline-offset: -3px`), so a ring on a full-bleed row never clips off-screen. No colour shift, no glow. **On a filled control the ring flips to card stock** (`.kb-dock-btn--primary`, `.kb-add`, the pressed filter): inset by 3px, an ink ring inside an ink fill measured 1.00:1 and was simply invisible.
- **Incumbent buttons** (Settings): 10px radius, filled accent or semantic colour, 15px/500 label, 44px minimum, `opacity: 0.6` on press.

### Chips
**There are none, in either system.** Warm Paper's one filter — the out-only toggle in the Pantry toolbar — is an 8px, out-ink-stroked, 44px control that inverts to a solid out-ink fill when pressed (`aria-pressed`), pairing the word "out" with a tabular count. It disables rather than hides at zero: a control that vanishes whenever the pantry is whole never becomes a habit, and its removal used to resize the search field under a thumb already reaching for it.

The incumbent round `filter-pill` is **gone**, class and all. Its only surface was Saved's meal-category row — Breakfast / Lunch / Dinner / Snack — and four pills across the top of a personal collection of a dozen links is a taxonomy that has to be maintained at save time by the one person it serves. Search does the same job and asks for nothing. Do not reintroduce a pill-shaped filter row to either system.

### The dock
The bottom-right stack that carries a view's primary verbs: add on all three list-bearing tabs, plus receipt-scan on the shopping list. 52px buttons, 10px apart, 12px from the trailing edge plus the side inset.

It exists because both usage scenes are one hand on a phone and the top-right corner of a 6.7" screen is the one place a thumb cannot reach without regripping. It is the **only `position: fixed` element in Warm Paper**, and every clause of The Floating Control Rule is load-bearing on it: a child of `#app` (not of the router's content element, which is replaced on every navigation), `z-index: 120`, and a measured 24px of clearance from the tab bar. Verified in the shipped build: `parentIsApp: true`, `z: 120`, `clearance: 24`, and zero fixed descendants inside `.app-content`.

`src/components/shared/dock.ts` owns the single host element and publishes its height on `#app` as `--kb-dock-h`. Two things read that variable rather than guessing: the list's bottom padding, so the last row can always be scrolled clear of the buttons, and the toast, so a confirmation never lands on the control that produced it. A new floating element belongs *in* the dock, not beside it.

### Cards / Containers
- **Corner style:** none — rows are full-bleed stock. The only radiused container is the notice panel (8px).
- **Background:** card stock on a duller board; a row you are out of shifts 12% toward out ink and gains the 3px inset edge.
- **Shadow strategy:** none (see Elevation & Depth).
- **Border:** a 1px card-edge rule on the bottom edge only, so a group reads as a stack of stock rather than as boxes.
- **Internal padding:** none vertically — the row's 48px comes from its own `min-height` and its 44px children, not from padding. 3px of lead-in on the left, 4px of trailing margin on the delete.

### Inputs / Fields
- **Style:** card-stock ground on the board, 1px control-edge stroke, 8px radius, 16px/500 text, 44px tall, 12px of internal gutter.
- **Focus:** the world's 2px inset ink outline.
- **Placeholder:** soft ink.
- **Labels:** 13px/600 soft ink, sentence case. They were 12px uppercase with 0.5px tracking, which was simultaneously under the 13px floor and the signage voice this world was built to replace — inside the sheet both list views open.
- **Incumbent inputs:** 10px radius, 0.5px border. Now Settings' own forms only; Saved's sheets and the shared sheet are Warm Paper (see The shared sheet).

### The shared sheet
`openModal` is the app's one modal, and it is **Warm Paper**: board-coloured sheet, 8px top corners, card-stock fields with control-edge strokes, an ink primary button, 13px soft-ink sentence-case labels, out-ink field errors. It used to be iOS-default white with 20px radii and a blue button, which meant every single write left the world and came back.

It is not a surface the user visits — it is a modal child of the three list views, opened on every add, edit, barcode scan, cover change and receipt review. That is why it converted ahead of the surfaces themselves: the two-system split is about *surfaces*, and a sheet is not one. Its last incumbent holdout, the Link / Screenshot tab pair in the add sheet, is now card stock with a control-edge stroke and an ink fill on the selected tab, having been iOS-grey with a 14px radius and a drop shadow The No-Cast Rule does not grant.

Mechanics, all shared: Escape closes, Tab is trapped (including when focus starts outside the sheet, which the old trap could not see), focus moves in on open and returns to the trigger on close, `visualViewport` supplies `--keyboard-inset` so the submit button never sits under the iOS keyboard, and a backdrop tap can be guarded by `confirmDiscard` so a stray one-handed tap cannot destroy a draft. The close control is a 44px target around an 18px inline-SVG X — drawn, not a `×` character.

### The staple toggle
The one control in the sheet that changes what an item *means*: a 44px `aria-pressed` block reading **"I always keep this in stock"** over a 13px soft-ink line, drawing the same 24px/7px tick as the row checkbox so one glyph means one thing app-wide. The amount fields appear only when it is on.

It replaced a pre-filled quantity field, and the replacement is the most consequential change in this build. Because the field defaulted to `1` it was never blank, so the "is this a staple" signal was never false, so **every add and every edit silently declared a permanent staple** — including opening an item to fix its category. Within a month every row read "usually buy 1" and the diff the product exists to show carried no information. A decision this consequential gets a control that states it in words.

### The receipt review
`.kb-review-list` / `.kb-review-row` / `.kb-review-main` / `.kb-review-name` / `.kb-review-line`, in the shared sheet. Matched rows are pre-ticked and each shows **the receipt line that matched it** beneath the name; unmatched lines follow under "Also on this receipt". Nothing is written until the primary button, which counts what it will move.

The line is the point. The matcher is fuzzy by necessity, and a guess the user can see is a guess they can correct in one tap; a guess they cannot see is a corrupted ledger row, which is the worst failure this product has. While the scan runs, a `.kb-notice` in the list carries a tabular percentage and a Cancel.

### The toast
An 8px ink pill on the bottom edge, above the dock, holding a 15px message and — when there is one — a 44px underlined action. One toast lives at a time: a node is reused and its text replaced, because working down a shopping list is eight or ten writes in a few seconds and each used to append its own pill into a growing stack.

Both its position and its colour changed for the same reason. At the top of the screen it sat directly on the search field and the add button for its whole life, while Undo — the most time-critical control in the app — was as far from the thumb as the screen allows *and* on a five-second timer. And filled green measured 2.02–2.22:1. It is ink on stock in every state; only an error shifts, to out ink. `pointer-events` is off on the container and on only for the action, so a stale confirmation can never eat a tap.

### Navigation
The **four-tab** bottom bar — Pantry, Grocery, Saved, Settings — is shared, untouched, and native by intent: fixed, 50px plus safe area, translucent (`backdrop-filter: saturate(180%) blur(20px)` over an 85% surface), 0.5px top border, 22px inline SVG over a 10px/500 label, accent blue when active. It is deliberately **not** themed by Warm Paper; preserving native iOS affordances is a product constraint. The list views reserve space for it rather than drawing over it, and nothing in either system restyles it.

### Signature Component: The row
One item, one 48px line of card stock, three parts and no more: a **checkbox target** at the leading edge, a **name block** that flexes, and an **always-visible delete** at the trailing edge. The name block is a two-line stack — 17px name over a 13px soft-ink second line — and is the edit target on both list views. It carries `min-height: 44px` of its own, because `align-items: center` means it does not inherit the row's 48px.

The second line is where each list says the one thing its scene needs. On Pantry it is the standing amount, "usually buy 6" — the typical-order diff, which PRODUCT.md requires be legible in the list itself. On the shopping list it is **why the row is there**: "you ran out", "you usually buy this", or the amount when the amount is not one. `source` was a field the user could never see.

The row carries no `aria-label`. One was there and it overrode the children, which meant the standing amount — the product's whole mechanism — was the one thing a screen reader could not read. The row reads its own text, with a visually-hidden "— edit" suffix.

### The saved row and its cover
Saved's row is the standard row with the checkbox slot replaced by a **56px cover tile**, and it is 72px rather than 48px to hold it. Its three parts read left to right: the tile and the title block together are one button that **opens the thing**, then a 44px pencil, then the same 44px trash every other row carries. Opening is the unambiguous primary verb on a saved idea, so it gets the whole title block rather than a fourth control; the two maintenance verbs stay visible one-tap targets, because this app has no gestures.

The cover is a picture when one can be had and a **monogram on plain card stock** when it cannot: one character taken from the link itself — the creator handle, else the title, else the domain — at 22px/700 in soft ink behind a 1px control-edge stroke.

The placeholder is the part that was actually broken. It used to be a full-bleed tile painted with the Instagram brand gradient or solid `#010101`, carrying a 13px/700 uppercase wordmark — a brand fill, capitals and tracking, three things this world exists to have removed. And it was not an edge case: `api.instagram.com/oembed` was retired in October 2020, so *every* Instagram card had been a placeholder for years, and the code was still calling that endpoint on every save. A brand's colour is not this app's to spend, and the one accent it owns is reserved for being out of something.

**Covers arrive late, and that is designed.** The row paints its monogram the instant the link is saved; the picture is fetched afterwards and swapped into that one tile in place, never by re-rendering a list a thumb may be scrolling. The fetch is source-native only — TikTok's oEmbed, YouTube's constructible thumbnail URL, Instagram's `/media/` image (which needs no CORS and no token, and which Instagram usually refuses anyway), and a direct image link. A public reader proxy would cover far more sites, and was rejected: it would mean sending saved links to a party that is not their source. What those four paths cannot serve keeps its monogram, and **Choose a photo** in the edit sheet is the escape hatch that always works.

Whatever is found is re-encoded through the canvas to a data URL and stored on the device, not kept as a remote address. A social CDN's thumbnail link expires, which is why cards saved months ago showed nothing; and the tab is read while deciding what to cook, which is exactly when a phone is least likely to have signal. Every attempt is stamped, so a link with no cover to give costs one request a day rather than one per open.

### Signature Component: The checkbox
A 44×44 target around a 24px, 7px-radius box: card stock with a 1.5px card-edge stroke when unticked, filled solid `--kb-ink` with a card-stock tick when ticked. The unticked stroke is control-edge, not card-edge: an empty card-stock box on a card-stock row is identified by that stroke alone, and at card-edge it measured 1.60:1 light and 1.33:1 dark. It means "I have this" on Pantry and "got it" on your shopping list. Its fill is ink rather than green on purpose (see The Ink, Not Green Rule) — it is a control, not a status light, which is why the out-of-stock signal lives on the row's ground and edge instead.

### Signature Component: The always-visible delete
Every row carries a 44×44 delete with a 19px inline SVG in soft ink. **There is no gesture anywhere in the app** — no swipe, no long-press, no hidden action. A destructive action that has to be discovered fails in a store aisle with one cold hand, and the swipe row that used to hold this action was removed rather than tuned.

### Resilience states (shared, both systems)
A small shared layer at the end of `components.css` applies app-wide and belongs to neither system: inline field errors (with `role="alert"` and an `aria-describedby` link to the field), `[hidden]` enforcement, disabled controls at 0.35 opacity, a `:focus-visible` outline on real controls, a `.visually-hidden` utility for the heading and label text the layout does not show, and a `prefers-reduced-motion` block that collapses every animation and transition (verified: 14 of 14 covered, no gap). Every new surface inherits these; do not re-implement them per surface, and do not treat them as part of either system's identity.

**Skeletons are conditional.** Warm Paper's 48px card-stock skeleton rows are scheduled behind a 120ms timer and cancelled when the load resolves. IndexedDB is already open and warm on every navigation after the first, and flashing six grey bars over a 5ms read made a local database look like a network round trip in an app whose whole pitch is that there is no network.

**Semantics are part of the layer.** Each view opens with a visually-hidden `<h1>`; each category heading is an `<h2>`; each group is `role="group"` with `aria-labelledby`; rows are `role="listitem"` inside `role="list"`, so a shopping list announces "list, 18 items". Measured on the Pantry tab: 1 `h1`, 13 `h2`, 13 labelled groups, 22 list items. The app had exactly one heading element in total before this.

## Do's and Don'ts

### Do:
- **Do** build new Pantry or Grocery surfaces from `--kb-*` tokens only, and give any new view that needs its own gutters a `data-route` opt-out rather than fighting `.app-content`'s padding.
- **Do** keep every list row at a uniform 48px with `align-items: center` and no vertical padding, letting its 44px children set the height — and give a flexing child its own `min-height: 44px`, because centring means it will not inherit the row's.
- **Do** group a list by the categories its items actually carry, in the fixed `CATEGORIES` order, and gather anything unrecognised under Other. Iterating the enum instead means a row whose category is not in it renders nowhere at all, with no count and no notice — and an imported backup is free to carry one.
- **Do** put a view's primary verb in the dock, and let the list's padding and the toast read `--kb-dock-h` rather than hard-coding a clearance.
- **Do** restore focus to the equivalent control on the next row after a mutating render, so working down a list by keyboard or VoiceOver does not return to the top on every tick.
- **Do** give every interactive element a 44px minimum target, and keep the visible box smaller when the design wants it quieter.
- **Do** write in plain sentence case, on the 13 / 15 / 16 / 17px ramp, at 500 / 600 / 700, with letter-spacing at `0`.
- **Do** use 8px on controls, 7px on the checkbox, and no radius on full-bleed stock.
- **Do** keep floating anything out of the list views; if something must float above the tab bar, give it ≥24px clearance, `z-index: 120`, and `#app` as its parent.
- **Do** make sticky chrome sticky inside the existing scroller and paint it with the solid board colour.
- **Do** verify every new text colour at AA-normal against the ground it actually sits on, in both light and dark, before it enters the system.
- **Do** change the card stock and re-pick the signal ink for dark mode rather than tinting the light palette.
- **Do** say **item**, **your pantry**, **your shopping list**, and **usually buy** in UI copy — one name per concept.
- **Do** leave the four-tab bottom bar and the shared resilience layer exactly as they are.
- **Do** treat Settings as maintenance: patch it in the incumbent system's own vocabulary, and convert a whole surface at once rather than blending the two — which is how Saved converted, in one pass, rather than by restyling a grid it was going to stop being.
- **Do** give a Settings row the same shape the list views use when it holds the same kind of actions: content is the edit target, one 44px trash at the trailing edge. A pair of filled buttons per row made a column of red the loudest thing on a maintenance screen.

### Don't:
- **Don't** uppercase anything. No `text-transform`, no tracked capitals, no signage voice — that is the treatment this world replaced.
- **Don't** introduce a weight above 700, or open letter-spacing on anything. The only non-zero tracking in the world is `-0.01em` optical correction on the 17px row name.
- **Don't** set type below 13px in a list view. The 10px tab label is the platform's own size for the platform's own element.
- **Don't** ship a focusable text or number input below 16px.
- **Don't** let a border in card-edge be the only thing identifying a control; that is what `--kb-control-edge` is for.
- **Don't** draw a focus ring in the same colour as the fill it lands inside. The world's inset ink ring is invisible on an ink-filled button.
- **Don't** default a field whose value declares a commitment. An opt-in that has to be *cleared* to decline is not an opt-in, and this one silently made forty staples.
- **Don't** write to two stores without a way back. A receipt reviews before it applies; ticking a row off the list snapshots both sides so Undo is exact.
- **Don't** colour something because it looks better coloured. If an element's colour cannot be named as the state it signals, it is ink, soft ink, or stock. `--kb-stocked` and `--kb-reorder` are gone; do not reintroduce a second or third signal ink for a state the product does not track.
- **Don't** paint a confirmation. A filled green success pill is decoration, and the two that shipped measured 2.02:1 and 2.22:1.
- **Don't** put a `×` or a `✕` where an icon belongs. Every mark in the app is an inline SVG on the same 24px grid at the same stroke weight.
- **Don't** fill a ticked checkbox with green, or any accent. A column of coloured confirmations is decoration; the exception gets the colour.
- **Don't** derive a status colour, meter, or gradient from a quantity. Depletion is binary and comes from `isOut` alone.
- **Don't** add an outer shadow to anything that sits in the page. The world has exactly two `box-shadow`s: the inset out-of-stock edge, and the dock's lift — which is earned by genuinely floating above scrolling stock.
- **Don't** make list-view chrome translucent; row text ghosting through a bar reads as a defect.
- **Don't** use `position: fixed` inside a list view, and never on `html`/`body`. Don't put a transform on a view container.
- **Don't** put a floating control within 24px of the tab bar, or make it a child of the router's content element. This shipped once and was completely untappable.
- **Don't** hide an action behind a gesture. Row actions are visible 44px buttons; there is no swipe in this app.
- **Don't** introduce pill or capsule radii, circular icon buttons, or the incumbent 10/14/20px scale into Warm Paper.
- **Don't** inset, round, or float a row, and don't turn a row into a tile.
- **Don't** extend the incumbent iOS-default system with new patterns, and don't cite it as the project's design direction; it governs Settings and nothing more.
