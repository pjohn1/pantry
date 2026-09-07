# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # tsc (typecheck, noEmit) + vite build -> dist/
npm run preview    # serve the built dist/
npx tsc --noEmit   # typecheck only
```

There is no test suite and no linter. `npm run build` is the only verification gate — and `tsconfig.json` sets `strict`, `noUnusedLocals`, and `noUnusedParameters`, so a leftover import or parameter fails the build.

The Cloudflare Worker in `worker/` is a separate npm project with its own deps:

```bash
cd worker && npm install
npm run dev        # wrangler dev
npm run deploy     # wrangler deploy
```

## Deployment

- **Frontend**: `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`. Because it is served from a subpath, `vite.config.ts` sets `base: '/pantry/'`, and `index.html` / `public/manifest.json` hardcode `/pantry/` in their icon, manifest, and `start_url` paths. Changing the base means changing all three.
- **Worker**: deployed manually with `wrangler deploy`. Its public URL is hardcoded as `RECIPE_PROXY_URL` in `src/services/recipe.service.ts` — it must match the deployed worker or recipe URL fetching silently fails.

## Architecture

A dependency-free, offline-first PWA (Vite + TypeScript, no UI framework) for tracking pantry stock, generating a grocery list, and parsing recipes. All user data lives in IndexedDB on device; there is no backend account or sync.

**Three layers, strictly one-directional:**

1. `src/db/` — IndexedDB access via `idb`. `database.ts` owns `DB_VERSION` and the single `upgrade()` callback; `schema.ts` types the stores.
2. `src/services/` — all business logic and the only code that touches the DB. Each store has a service (`pantry`, `grocery`, `typical-order`, `recipe`, `inspo`) plus cross-cutting ones (`ingredient-matcher`, `receipt`, `ocr`, `barcode`, `export-import`).
3. `src/components/` — views build DOM imperatively with the `el()` helper from `src/utils/dom.ts`. Views never import from `src/db/`.

**Routing**: hash-based, in `src/router.ts`. `app-shell.ts` registers one factory per tab (`pantry`, `grocery`, `recipes`, `inspo`, `settings`). On every `hashchange` the router wipes the content element and calls the factory again — **views are fully recreated, never reused**, so all view state is local and transient. Load data inside the factory, not in module scope.

**Cross-view updates**: the tiny pub-sub in `src/utils/events.ts`. Only one event exists today, `grocery-count`, emitted by services after any grocery mutation so the tab bar badge stays current. Any service that mutates `groceryList` must emit it.

### Data model and the `normalizedName` join key

`src/models/types.ts` is the single source of truth for entities, `CATEGORIES`, `CATEGORY_LABELS`, and `UNITS` (the item form and filter pills are generated from these arrays).

Items are matched across stores by `normalizedName`, produced by `normalizeIngredientName()` in `src/utils/normalize.ts` (lowercase, strip parentheticals/punctuation, strip cooking modifiers, depluralize each word, then apply a British→American synonym map). **Every write path must set `normalizedName` through that function** — the pantry/grocery/recipe services do this on both add and update. Matching is presence-based, not quantity-aware: an ingredient counts as in-stock if its `normalizedName` exists in `pantryItems` at all.

`src/utils/parse-ingredient.ts` turns a free-text ingredient line ("1 ½ cups all-purpose flour") into quantity + unit + name, handling unicode fractions and unit aliases.

### The pantry ⇄ grocery loop

This is the core behavior and it spans several services:

- `typicalOrder` (edited in Settings) is the recurring shopping baseline. `regenerateGroceryList()` **clears the whole `groceryList` store**, re-derives `source: 'auto'` items for typical-order entries absent from the pantry, and re-inserts the preserved `manual` / `recipe` / `out` items with their `checked` state. Anything not carrying one of those three sources is destroyed by a refresh.
- `toggleOut()` (pantry) flips `isOut` and creates or deletes a matching `source: 'out'` grocery item linked by `sourcePantryId`.
- `purchaseGroceryItem()` and `processReceiptAgainstGroceryList()` both funnel through `addPantryItemFromPurchase()`, which updates an existing pantry row by `normalizedName` (clearing `isOut`, stamping `purchaseDate`) or inserts a new one, then removes the grocery row.
- Recipes: `matchIngredientsAgainstPantry()` annotates each ingredient with `inPantry`; `addMissingToGroceryList()` inserts the misses as `source: 'recipe'` with `sourceRecipeId`.

### External integrations

- **Recipe URLs** → the Cloudflare Worker (`worker/src/index.ts`) fetches the page server-side (browser CORS makes this impossible client-side) and extracts JSON-LD `@type: Recipe` blocks, including the WordPress `@graph` shape. It only ever returns `recipeIngredient` strings; pages without structured data return 404 by design.
- **Receipt / recipe photos** → `tesseract.js` OCR in `ocr.service.ts` (one lazily created worker, reused). `receipt.service.ts` then strips prices/SKUs, drops non-item lines via `RECEIPT_SKIP_PATTERNS`, and fuzzy-matches the survivors against the grocery list.
- **Barcodes** → the browser `BarcodeDetector` API (declared locally in `barcode-scanner.ts` because it is absent from TS's DOM lib; feature-detected, with an unsupported-browser fallback), then Open Food Facts for the product name and a category mapped through `CATEGORY_MAP`.
- **Inspo links** → TikTok/Instagram oEmbed for thumbnails; pasted images are canvas-resized to a 600px JPEG data URL and stored inline in IndexedDB.

## Conventions and gotchas

- **Schema changes**: bump `DB_VERSION` in `src/db/database.ts` and add a new `if (oldVersion < N) { ... }` block — never edit an existing block, since already-installed PWAs replay only the newer ones. Add the store to `PantryDB` in `schema.ts` too.
- **`export-import.service.ts` covers only `pantryItems`, `typicalOrder`, `groceryList`, and `recipes`** — `inspoItems` is missing from export, import, and `clearAllData()`. New stores need adding here explicitly.
- **idb transactions auto-close on await of anything outside them.** Read with `db.getAll()` first, then open a `readwrite` transaction for the writes (see `addMissingToGroceryList` for the pattern). Mixing a `db.get()` into an open transaction will throw `TransactionInactiveError`.
- **Styling** is four global stylesheets imported by `src/main.ts` in order: `variables.css` (design tokens), `reset.css`, `layout.css`, `components.css`. No CSS modules, no scoping — class names are the contract between a view and `components.css`. Use the `--color-*`, `--radius-*`, `--spacing-*` tokens.
- **Dark mode is `prefers-color-scheme` only** — tokens are redefined in a media query in `variables.css`. There is no theme toggle, so avoid hardcoded colors in TS (the meal-category and platform accent colors in `recipes-view.ts` / `inspo-view.ts` are the existing exceptions).
- **iOS-first layout**: `100dvh` shell with a fixed bottom tab bar; respect `--safe-area-top` / `--safe-area-bottom` on anything pinned to a screen edge.
- Icons are inline SVG path strings passed to `svgIcon()` (24×24 viewBox, `currentColor` stroke) — no icon library.
- Destructive actions use `showToast(msg, type, onUndo)` with an undo callback and a matching `restore*` service function, rather than a confirm dialog.
