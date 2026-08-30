# Camping Checklist

A responsive, local-first camping planning and packing PWA. Implementation is in progress; the original product handoff remains in this repository as the source of truth.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```powershell
npm install
npm run dev
```

Vite prints the local development URL. Open it in a modern browser.

## Verify

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build locally.

## Architecture

The source is split into UI, domain models, application services, and data boundaries. UI code does not know the storage implementation. Versioned IndexedDB repositories persist the master inventory, trips, and trip checklist snapshots. The canonical seed remains at `data/checklist_seed.json` and is parsed through `src/data/seedLoader.ts`.

The app currently supports reusable inventory editing and alias search, camper/tent/backpacking setup levels, local JSON backup/restore, and CSV checklist export.

## Product handoff

This repository began as the implementation handoff for the Camping checklist project.

## Product direction

Build a **responsive, installable web app / PWA** for camping planning and packing. It should work well on Windows and phones, remain useful offline, and be much easier to maintain than a spreadsheet.

Google Sheets is **not** the primary product. Import/export to CSV/JSON can be added, and a Sheets integration can be considered later.

## Primary use

- Mainly **car camping**
- Still useful for **light backpacking**
- Fast trip setup
- Reusable master inventory
- Clean packing checklist
- Easy quantity changes
- Minimal friction on a phone at the campsite

## Start here

Codex should read these files in this order:

1. `CODEX_START_HERE.md`
2. `PROJECT_SPEC.md`
3. `DECISIONS.md`
4. `CHECKLIST_TAXONOMY.md`
5. `DATA_MODEL.md`
6. `UI_UX_SPEC.md`
7. `SPRINTS.md`
8. `ACCEPTANCE_TESTS.md`
9. `codex/MASTER_PROMPT.md`
10. `codex/TASK_ORDER.md`

Seed content is in `data/checklist_seed.json`.

## Non-negotiable product shape

Main checklist tabs:

- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras

`Extras` is intentionally the holding area for useful ideas that have not yet earned a permanent place in the core taxonomy.

## Important clarified item meanings

- `torch` = propane torch
- `battery` = battery bank / portable power bank
- `ally` = handheld gaming device
- `gas` = gasoline
- generic `sauce` must be split into:
  - mayonnaise
  - ketchup
  - BBQ sauce
  - hot sauce

## Design target

Think **shopping-list simplicity + campsite practicality**, not project-management software.

The user should be able to open a trip and immediately understand:
- what is needed
- what is packed
- what still needs to be bought
- where each item belongs
