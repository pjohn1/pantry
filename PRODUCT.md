# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user — the person who built it — running it as an installed PWA on their iPhone. There is no second audience: no signup, no onboarding for strangers, no marketing surface.

Two usage scenes, both one-handed on a phone:

1. **At home, in the kitchen.** Standing at an open cupboard or fridge, adding what's there, marking what ran out. Short, interrupted sessions.
2. **In a store aisle.** Working down the grocery list, checking items off, occasionally scanning a barcode. Sometimes on bad signal.

A third, briefer scene: **after shopping**, photographing the receipt so the pantry updates without typing.

## Product Purpose

Keep an accurate ledger of what's actually in the pantry, so the user never re-buys something they already have and never runs out of a staple.

The grocery list is an **output** of that ledger, not a separate list to maintain. Success is a shopping trip where the list was already correct before the user thought about it.

## Positioning

The mechanism is the **typical order** — a declared baseline of what this household always keeps stocked — diffed against live pantry state. Restocking is therefore not remembering; it is subtraction. A generic list app cannot copy this because it has no model of what "normally in stock" means for this kitchen.

Two supporting mechanisms reduce the cost of keeping the ledger true, which is the failure mode that kills every pantry app:

- **Zero-typing restock:** receipt photo → OCR → matched grocery items move to the pantry; barcode scan → product name and category filled in.
- **Everything on-device:** no account to create, nothing to sync, no server that can be down while standing in an aisle.

## Operating Context

- Installed to the iPhone home screen, launched in standalone mode; treated as an appliance, not a website.
- Used in short bursts with one hand, often while holding something else.
- Cooking inspiration arrives as TikTok and Instagram links saved for later.
- Data lives only on the device it was entered on. JSON export/import is the only way data comes back in wholesale; the Claude hand-off is the only other way any of it goes out, and it goes out as a link the user taps.

## Capabilities and Constraints

**Confirmed capabilities**

- Pantry inventory with categories, quantities, units, and an out-of-stock toggle that pushes the item onto the grocery list.
- Grocery list assembled from three sources: `auto` (the things you usually buy, minus what's in the pantry), `out` (marked out of stock), `manual`.
- Typical-order baseline, edited in Settings.
- Saved tab for TikTok/Instagram/image cooking inspiration, tagged by meal.
- **Make a recipe with Claude**, from the Saved tab's add sheet: an options sheet sets servings, the longest the recipe may take, whether measurements come in cups or grams, and which equipment the kitchen has; the app then builds a prompt carrying those plus the in-stock pantry list and opens it in Claude. Claude returns one self-contained HTML file that reads on its own and carries its recipes as embedded JSON; importing it (by file or by paste) saves them as Saved items with an in-app reader. The four options are remembered on the device, so they are set once. The app parses no prose, calls no API and holds no key.
- Barcode scanning for product name and category lookup.
- Receipt photo → pantry population.
- Full JSON export/import.

**Decided 2026-09-07 (from the Pantry-tab critique)**

- **Depletion is binary, not quantitative.** An item is in stock or out; there is no per-item quantity ledger. The row-level quantity stepper is removed. Quantity may still be recorded on an item as reference information, but it is not a tracked, decremented value and must not occupy primary row actions.
- **The typical-order diff must be visible on the pantry row.** The product's mechanism — a declared baseline diffed against live pantry state — is the thing no neighboring product can copy, and it must be legible in the list itself: which items are household staples, and how the current state compares to the baseline. How this is expressed is a design decision; that it is expressed is a product requirement.

**Binding constraints (confirmed by the user)**

- **No accounts, no backend, on-device only.** All data in IndexedDB. A deliberate privacy and simplicity choice, not an unfinished stage.
- **Must work offline.** The core loop has to function in a store with no signal. Only two features may depend on the network — barcode lookup and inspo thumbnails — and each must degrade without breaking. Making a recipe with Claude is not a third: it leaves the app entirely rather than fetching anything, and a recipe already saved reads with no signal at all.
- **Free hosting: GitHub Pages only.** No paid infra or APIs, and no server-side component at all since recipe parsing was removed. Keeps the static build and the `/pantry/` base path in place.
- **iPhone-first, installed to the home screen.** Phone in hand is the design target; desktop is incidental.

**Technical constraints that follow**

- Static build only — no server-side rendering, no runtime secrets, no per-user config.
- Items are joined across stores by a normalized name; matching is presence-based, not quantity-aware.
- Camera features depend on browser APIs (`BarcodeDetector` needs Safari 17+ and degrades with a message).

**Explicitly undecided**

- ~~Whether recipes return in any form.~~ **Decided 2026-09-07:** they return, but only as something handed to the app, never as something the app works out. A "Cook" tab that found recipes from pantry contents shipped in Feb 2026 and was replaced by the Saved/inspo tab in Mar 2026; on 2026-09-07 the user removed the remaining Recipes tab outright — URL parsing, photo OCR, and the Cloudflare Worker. The parsing stays gone. What returned the same day is **Make a recipe with Claude**: the app writes a prompt and reads a file back. It is a hand-off, not a feature that understands food, which is why it costs nothing the removal bought — no scraper, no OCR, no worker, no server.
- ~~Whether saved inspo is meant to be durable.~~ **Decided 2026-09-07:** it is. Saved items are now included in export, import, and clear-all-data.

## Brand Commitments

- The name is **Pantry** — app name, short name, and iOS home-screen title all match, and should stay matched.
- App icons exist at `public/icons/`. There is no wordmark, logo, marketing copy, or written voice guide, and none should be invented as if it existed.

## Evidence on Hand

- The only real content is the user's own pantry data, which lives on their device and is not in the repository. Any screenshot, demo, or fixture has to be authored.
- No users, testimonials, reviews, metrics, download counts, pricing, or press exist. This is a personal tool with one user; none of that may be fabricated for any surface.
- Category, unit, and meal-category vocabularies are real and defined in `src/models/types.ts`. The ingredient synonym and modifier lists in `src/utils/normalize.ts` are real product vocabulary.

## Product Principles

1. **The ledger's accuracy is the product.** Every feature is judged by whether it makes the pantry state more true with less effort. A feature that adds upkeep burden is a net loss even if it looks useful.
2. **Never make the user type what a camera can read.** Receipts and barcodes are inputs; typing is the fallback.
3. **The list is derived, never maintained.** The user curates the typical order and the pantry; the grocery list follows from them.
4. **Aisle-grade reliability.** One hand, bad signal, cold hands, glancing at the screen between shelves. Anything that fails there fails.
5. **Nothing leaves the device unless the user exports it.** No account, no telemetry, no sync as a solution to any problem. There are exactly two exports and each is a button the user presses: the JSON backup, and the Claude hand-off, which puts the in-stock pantry list into a link and opens it. Neither runs on its own, and the Claude one transmits nothing until the user taps send in Claude. Anything added to that prompt is added to what leaves the device. It carries the in-stock pantry list and the four recipe options — servings, maximum time, measurement system, equipment. The out-of-stock list, the usually-buy baseline and the shopping list are deliberately not in it.

## Accessibility & Inclusion

No formal standard was established for this single-user tool, but two real situational needs govern it: **one-handed reach** on a phone (primary actions within thumb range, tap targets that survive a moving cart) and **glanceability** in poor lighting, both a dim kitchen and a bright store aisle, which is why the system honors the OS light/dark setting rather than picking one.
