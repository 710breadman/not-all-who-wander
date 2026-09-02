# Path A Logical

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
- fast trip meal planning with Quick Add and reusable saved meals
- consolidated offline grocery states, prep notes, and explicit cooking-gear suggestions
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

## Optional Firebase sign-in and cloud backup

Path A Logical works without an account. To enable the optional Google popup and
email/password accounts, create a Firebase web app, enable **Google** and
**Email/Password** in Firebase Authentication, create a Firestore database on
the Spark plan, and add the development and deployed domains to Firebase's
Authorized domains list. Copy `.env.example` to
`.env.local` and fill in the four Firebase web configuration values.
Use `http://localhost:...` for local Google sign-in; Firebase treats
`127.0.0.1` as a different domain and rejects it unless it is separately
authorized. The included **Open PAL PC Site** launcher uses `localhost`.

For GitHub Pages, add the same four values as repository variables named
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
`VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Also add
`710breadman.github.io` to Firebase Authentication's Authorized domains. The
Pages workflow injects those public client identifiers during its build.

The Firebase configuration values identify the public web app; do not put a
service-account key or any admin credential in the browser. Sign-in creates or
matches a local profile by email. In **Backup & restore**, the user can
explicitly enable the currently approved cloud scope: master inventory only.
Trips, sites, coordinates, tracks, medical/emergency notes, maps, caches, and
profile credentials remain local. Run `npm run test:firebase-rules` to test the
Firestore rules contract against the emulator. Add the optional App Check site
key only after monitoring device traffic; enforcement is a Firebase-console
release step.

JSON backups include inventory, trips, checklist items, meal plans, saved meals,
groceries, profiles, sites, waypoints, weather snapshots, and routes. Downloaded PMTiles archives and
prepared offline packs are intentionally device-local and are not included.
Restoring a backup clears old cloud queue metadata and leaves cloud backup off
until the user explicitly enables it again.

## Verify

```powershell
npm run lint
npm run typecheck
npm test
npm run test:firebase-rules
npm run test:firebase-integration
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build locally.

After publishing the Firestore rules, run the guarded live Firebase check from
PowerShell. It creates a temporary account and inventory record, confirms an
owner can read and write it, confirms signed-out access is denied, then removes
the temporary data.

```powershell
$env:FIREBASE_LIVE_SMOKE = "confirm"; npm run test:firebase-live
```

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
