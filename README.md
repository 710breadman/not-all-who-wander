# Not All Who Wander

A responsive, local-first camping PWA that began as a packing/checklist replacement and is now expanding toward a full camping trip companion.

Long-term workflow:

**Idea -> Site -> Trip -> Weather/Safety -> Pack -> Navigate -> Camp -> Review -> Improve the next trip**

The expansion is intentionally staged from easiest to hardest so the current simple, reliable checklist is never sacrificed for ambitious integrations.

## Current capabilities

The app currently supports:
- reusable camping inventory
- car-camping / tent / backpacking setup levels
- trip creation and editing
- five-tab packing checklist
- quantities and packing statuses
- reusable people profiles
- Need-to-Buy workflow
- local JSON backup/restore
- CSV checklist export
- portable trip share/import snapshots
- installable/offline PWA shell
- desktop and phone automated coverage

See `STATUS.md` for the exact implementation state.

## Expansion direction

The ordered post-v1 roadmap adds, in increasing implementation difficulty:

1. saved Site Ideas and campsite profiles
2. trip preflight, safety, and gear-dependency checks
3. GPS basics and saved waypoints
4. weather and severe alerts
5. basic map and saved markers
6. official campground discovery
7. wildfire, public-land, access, and MVUM road layers
8. GPX routes/tracks
9. track recording and field-navigation basics
10. true offline map-region downloads
11. offline trip data packs
12. optional cloud sync and live shared trips
13. moderated community campsite intelligence
14. advanced device/integration and smart-trip features

See `ROADMAP.md` for product strategy and `SPRINTS.md` for implementation-ready deliverables and acceptance criteria.

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

New camping features should continue this separation: Site, waypoint, weather, map, external-data, and sync providers should be replaceable rather than embedded directly in UI components.

## Product principles

- **Local-first:** the useful core should work without service.
- **Privacy-first location data:** saved sites, tracks, medical notes, and itineraries stay local unless explicitly shared.
- **Simple first:** common packing and campsite actions should stay fast on a phone.
- **Source-aware:** weather, fire, access, closures, and community reports must expose provenance and freshness.
- **Battery/data aware:** GPS and large downloads are explicit and controllable.
- **Interoperable:** GPX and external-navigation handoff come before trying to replace specialist navigation tools completely.

## Primary use

- Mainly **car camping**
- Useful for **tent camping, dispersed camping, overlanding-oriented planning, and light backpacking**
- Fast trip setup
- Reusable master inventory
- Clean packing checklist
- Saved campsite/site ideas
- Offline usefulness at the campsite
- Increasingly strong trip, safety, mapping, and navigation support as later sprints land

Google Sheets is **not** the primary product. Import/export can exist as interoperability, but the app remains the source experience.

## Start here

Codex should read these files in this order:

1. `CODEX_START_HERE.md`
2. `PROJECT_SPEC.md`
3. `STATUS.md`
4. `ROADMAP.md`
5. `SPRINTS.md`
6. `DECISIONS.md`
7. `CHECKLIST_TAXONOMY.md`
8. `DATA_MODEL.md`
9. `UI_UX_SPEC.md`
10. `ACCEPTANCE_TESTS.md`
11. `RESEARCH_FINDINGS.md`
12. `codex/MASTER_PROMPT.md`
13. `codex/TASK_ORDER.md`

Seed content is in `data/checklist_seed.json`.

## Non-negotiable packing shape

Main checklist tabs remain:

- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras

`Extras` remains the holding area for useful packing ideas that have not earned a permanent place in the core taxonomy.

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

Keep **shopping-list simplicity + campsite practicality** even as capabilities expand.

The user should be able to open a trip and immediately understand:
- where they are going
- what they need
- what is packed
- what still needs to be bought
- what site/weather/safety information is relevant
- what information is available offline
- when dynamic information was last updated
