---
target: src/components/pantry/pantry-view.ts
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/Users/pj/pantry/src/components/pantry/pantry-view.ts"
target_fingerprint: "sha256:57401d73586a3f9ada6a4321b814834c018bbb7246d1ba7642993cdcdc193005"
target_path: /Users/pj/pantry/src/components/pantry/pantry-view.ts
timestamp: 2026-09-07T15-29-25Z
slug: src-components-pantry-pantry-view-ts
---
**Method: dual-agent** (A: design review · B: detector + rendered measurement, both isolated). B had a working headless-Chrome CDP renderer, so most findings are measured rather than inferred.

Re-run after the Kanban Card redesign. Previous run scored 16/40.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Skeleton, per-write toasts, per-bin counts, aria-expanded. But pull() paints nothing in flight, the stamp never disables, and the skeleton renders a "0 PULLED" chip because updatePulled() runs only after loadData() resolves. |
| 2 | Match System / Real World | 2 | Par / No par / Bin / Recorded is hospitality-inventory vocabulary on a cupboard. "Bin: Produce" restates the sticky tag 60px above. The barcode icon renders as a QR cluster. |
| 3 | User Control and Freedom | 2 | pull() -- highest-frequency write, mutates another tab's list -- has no undo. Make staple is one-way from this surface. The baseline editor has no cancel. |
| 4 | Consistency and Standards | 2 | Both write paths and every toast render incumbent iOS from inside this tab. .kb-btn--primary never renders as primary. Same grid slot reads PAR 6 COUNT here, QTY 6 COUNT · BASELINE on Grocery. |
| 5 | Error Prevention | 2 | addPantryItem never checks normalizedName, so Scan/New create duplicate cards joining one baseline. The baseline input silently rewrites 0, -3, abc to 1. |
| 6 | Recognition Rather Than Recall | 2 | The stamp's label is the state, not the verb, so its affordance is unrecognisable by design decision. pulledBtn.hidden = out === 0 removes the primary glance control. No headings, no list roles. |
| 7 | Flexibility and Efficiency | 3 | Swipe accelerator, Enter-to-submit, remembered category/unit, one-tap stamp, debounced search. No bulk restock: 8 items = 8 taps and 8 full rack teardowns. |
| 8 | Aesthetic and Minimalist Design | 3 | Resting rack is handsome and dense. But NO PAR spends the card's only secondary line announcing nothing on ~45% of rows, and the detail restates Name and Bin from 40px above. |
| 9 | Error Recovery | 3 | Best-authored code in the file: mutate() names every failure per item with a working Retry; barcode taxonomy distinguishes unknown/offline/unavailable. But Retry lives in a 6s far-reach pill, and the load-failure notice has role: null, aria-live: null. |
| 10 | Help and Documentation | 1 | Nothing defines Par, nothing hints at swipe, nothing explains that pulling writes to Grocery. The empty state names two actions and ships no button. |
| **Total** | | **23/40** | **Acceptable, low end** |

## Design Specificity Verdict

**Authored, genuinely -- but the world stops at the edge of the rack.**

The visual language could not be worn unchanged by another product: cream stock on a duller board, bordered rotated ink stamps instead of filled pills, uppercase micro-labels on a fixed 56px 22px auto grid, one 2px radius. The render proves the thesis -- the state of a kitchen is readable before a word is parsed.

Earned: the stamp's word-not-colour logic, the verified fixed field track, canonical section order.

Asserted: the punch hole is a 9px stroked circle at the leading edge of a grocery row -- the geometry of an unchecked checkbox -- and does nothing. rotate(-2deg) at 10.5px reads as misalignment, not pressed ink. The board is visible only as 18px stripes between racks. Both write paths and every confirmation leave the world for incumbent blue-accent iOS.

Interaction model is where specificity thins: strip the vocabulary and the row is a standard iOS list row. The point of view lives in the paint, not the mechanics.

### Deterministic scan: clean on files, still near-meaningless

Five invocations. Target and world-kanban.css returned []. `src` returned 17 findings, all advisory:true (none in this tab). B read the binary and established why: contrast and tap-target analysis exist only in the live-browser DOM analyzer, not the file-scan path. A URL scan exited 2 with five undersized-ui-text hits -- all incumbent 10px tab-bar labels, because the detector launches its own profile with an empty IndexedDB and never rendered a single card.

### Rendered measurement

All states reached and captured in both themes: populated rack, expanded card, Make staple editor, swipe-open row, pulled filter, load failure, empty rack, loading skeleton, 200 items scrolled.

Contrast: exactly one AA-normal text failure across the tab -- .kb-bin-count at 3.75:1 in light (dark passes at 4.97). All three stamp variants pass on their own grounds. Token discipline held under measurement.

Two findings only measurement could produce:
- The focus ring on .kb-dock-scan measures 1.00:1 -- --kb-ink on --kb-ink, inset 3px so it cannot escape onto the board. Invisible. Swipe actions 2.42:1.
- Fully swiped open, cardNameVisiblePx: 0 -- the name is entirely off-screen -- while elementFromPoint shows the invisible expand button still occupying the exposed strip.

Performance is a non-issue: a full 200-card renderRacks costs 2.8-17.4ms, zero long tasks. The 150ms search floor is the debounce.

### False positives, named

Decorative borders (.kb-card bottom rule, .kb-dock top, punch ring) fail 1.4.11 as measured but govern nothing identifying -- not real failures. .kb-search (1.22) and .kb-btn (1.60) borders are genuine, being the only thing identifying an input and a button. The 38px search field is likely exempt under 2.5.8. A toast in the load-failure state was B's own global IndexedDB patch. B also corrected six of its own earlier FAIL rows as harness bugs before reporting.

## What's Working

1. **The stamp-not-fill decision.** Three redundant signals (ground shift, 3px inset edge, bordered word): state survives greyscale, every colour-vision type, glare, a half-second glance. All three variants measured passing AA-normal.
2. **mutate() and the barcode failure taxonomy.** Every write wrapped in a per-item plain-language failure with a Retry re-running the exact closure. Every camera dead end distinguished, each offering "add by hand". handingOff/dismissed/lookupAbort prevent a late lookup opening an unasked-for form.
3. **Measured discipline.** 51 .kb-* classes in CSS, 51 in TS, zero orphans either direction. Zero hardcoded colour literals in either rack view. prefers-reduced-motion verified by emulation to cover all three animations.

## Priority Issues

### [P1] An item in an unrecognised category is silently never rendered
renderRacks iterates CATEGORIES rather than the cards, so anything outside the 13-value enum vanishes with no count, no notice, no Other fallback. Found by accident: a scale seed using 'bakery' made 18 of 200 items disappear while the chip read "29 pulled". Reachable in production via JSON import, which export-import.service.ts performs with no category validation. On a product whose success condition is ledger accuracy this is the worst failure shape -- P0 for anyone who uses import. Fix: iterate cards and group; render an Other rack, or coerce on import. -> /impeccable harden

### [P1] .kb-btn--primary has no fill (cascade order) -- found independently by both assessments
Declared at world-kanban.css:378, before .kb-btn at :392, equal specificity, so the later rule resets background, color and border-color. Computed background rgba(0,0,0,0), identical to Edit. .kb-btn--danger sits after .kb-btn and works -- the same file gets it right 14 lines later. The solid-ink fill is the world's only statement of hierarchy and it does not exist in the build; the loudest control in the panel is destructive red DELETE. Fix: move modifiers after .kb-btn or scope as .kb-btn.kb-btn--primary. -> /impeccable polish

### [P1] The stamp is drawn as printed ink, loaded with the primary write, labelled with the opposite of what it does
.kb-stamp is the world's own definition of a printed non-interactive object, wrapped in a borderless button as the primary action. Label is the current state (Stocked) while the effect is the opposite. Three stamps, two grammatical moods, one behaviour. Flush against the ~250px expand target with no boundary; .kb-card:active shifts the whole row's ground so press feedback cannot disambiguate. No undo, no re-entrancy guard. Measured 78x44 -- on the line. The aria-label gives screen-reader users the correct affordance while sighted users get the wrong one. Fix: keep the stamp as state read-out, give the row a separately-grounded action cell labelled with the verb; add undo (toggleOut is idempotent by id); guard re-entry. -> /impeccable shape

### [P1] Every write leaves the world, and the confirmation is the pattern the world replaced
openItemForm and openBarcodeScanner render incumbent iOS appended to document.body, outside .kb-rack-view. showToast renders success as filled #34c759 with white text -- 2.20:1, the exact figure DESIGN.md cites as the failure it replaced -- pinned to the top of the screen. Not the accepted five-tab split; this renders from inside the tab. Functional, not cosmetic: undo for a delete and retry for a failed write both live in that far-reach pill. Fix: skin the shared modal and toast for this world; move the toast above the dock; leave a persistent mark on a card whose write failed; add a normalizedName collision check to addPantryItem. -> /impeccable harden

### [P2] The touch and focus floor, measured
Focus ring 1.00:1 on .kb-dock-scan (invisible), 2.42:1 on swipe actions. Four interactive elements under 44px tall: .kb-pulled (38), .kb-search (38), .kb-inline-btn (32), .kb-baseline-input (36); the Set button is 43.7x32, under on both axes. Three interactive text styles at 10.5px, below the detector's own 11px functional-text floor: stamp label, detail labels, inline buttons. Swiped fully open the card name is off-screen while the expand button still occupies the strip. .kb-bin-count fails contrast at 3.75:1. Fix: ring in --kb-card on filled buttons or offset outward; 44px minimum on all five; 10.5px -> 11px; cap the swipe throw and disable the expand target while open. -> /impeccable audit

## Persona Red Flags

**Casey (one-handed, moving cart)** -- the 2 PULLED filter is top-right, the hardest point for a right thumb, and is the only control for the primary glance question; it is physically absent whenever the pantry is whole, so no habit forms. Pulling: 78px target flush against a 250px one, whole-row press feedback, no undo, toast at the top while the thumb is at the bottom. SCAN is correctly in the thumb zone and opens an incumbent sheet asking for a Unit from a 20-item wheel for a number the product does not track. A call mid-form loses the card: the modal holds no draft.

**Riley (edge cases; the sole user is Riley after six months)** -- the category silent-drop. Duplicate cards from unchecked normalizedName producing two STOCKED stamps for one staple. With 2 PULLED on, typing zzz shows "No cards are pulled" while the pressed red filter 40px above reads "2 PULLED" (emptyText tests pulledOnly before query). Baseline input stores 1 for 0, -3, abc. Make staple is a one-way door. openCardId, pulledOnly and the query are closure-local, so a PWA relaunch drops them.

**Sam (VoiceOver / keyboard / low vision)** -- zero headings, zero roles, zero landmarks for a surface holding 200 rows. .kb-card-main's accessible name is the raw text run ("SpinachNo par", "BananasPar6count") and never announces out/stocked, since state lives on a sibling. Tab order puts each row's two hidden swipe buttons before its own card: 2 of every 4 stops are invisible buttons; at 200 items, 803 buttons and 403 aria attributes. The load-failure notice is announced to nothing. .kb-fields' fixed 56px track will overflow at iOS accessibility text sizes.

## Minor Observations

- RECORDED 1 bunch · Aug 29 and LAST BOUGHT Aug 29 are adjacent rows with the same date.
- The expanded panel drops the pulled card's tint and red edge, so it attaches to the card below.
- Two of five detail rows restate what is already on screen.
- Skeleton rows are 64px; real cards are 69/72/89, so everything shifts on load.
- .kb-rack-view reserves +92px for a ~65px dock: 27px of dead board.
- The dock's filled slot is SCAN on Pantry, RECEIPT on Grocery -- the primary camera position moves between two tabs of one world.
- Grocery dims an in-cart name; Pantry does not dim a pulled one.
- .kb-stamp carries tabular-nums and never contains a numeral.
- 13 sticky bin tags share one top, swapping 13 times with no position indicator.
- Headless Chrome resolves safe-area insets to 0, so the 82px first-card y and 7-rows-above-dock figures differ on a notched device.

## Questions to Consider

1. If depletion is binary by decision, why does the primary add path still collect a Quantity and a Unit from 20 options?
2. The stamp is drawn as printed ink specifically so it does not read as a control, then given the tab's only primary write. Which do you give up -- the material honesty or the one-tap pull? Currently neither.
3. Par 6 answers "how many should we have". Nothing answers "how many do we have", and by your own decision nothing ever will. What is the number for?
4. In the aisle the user is on Grocery; at the cupboard, Pantry. If Pantry is a cupboard instrument, is its camera-first dock solving the other scene's problem?
5. What is on screen the day you reinstall? A dashed box, one sentence, no button, and no route to the typical order.
