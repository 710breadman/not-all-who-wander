# Decisions

This file distinguishes confirmed direction from implementation assumptions.

## Confirmed product decisions

### D-001 — Main organization uses tabs
Primary checklist categories are tabs, not separate spreadsheet-style sections on one page.

### D-002 — Food is a tab
Food is organized into sections such as breakfast, lunch, dinner, snacks, drinks, condiments, and staples.

### D-003 — Gear is a tab
Gear includes at least:
- Shelter & Sleep
- Camp Kitchen
- Survival / Tools

Additional gear sections may be used where they reduce misclassification.

### D-004 — Clothes is a tab
Clothing remains separate from general gear.

### D-005 — Hygiene and First Aid are combined
Treat them as one tab with internal sections.

### D-006 — Extras is a tab
Unconfirmed or optional additions belong here instead of polluting the core list.

### D-007 — Item meaning clarifications
- torch = propane torch
- battery = battery bank
- ally = handheld gaming device
- gas = gasoline
- sauce = split into mayo, ketchup, BBQ sauce, hot sauce

### D-008 — Usage profile
Optimize for car camping while retaining some backpacking orientation.

### D-009 — Research is allowed to inform additions
Camping checklists, outdoor guidance, forums, and community discussions can inform `Extras` and taxonomy review.

## Implementation decisions for this handoff

### D-010 — Web/PWA over spreadsheet as the main product
Use a responsive installable web app as the primary experience. A spreadsheet can be an interoperability/export target, not the application model.

### D-011 — Local-first before sync
IndexedDB/local storage is sufficient for the first complete version. Build backup/restore before cloud sync.

### D-012 — One canonical primary category per item
Avoid duplicate checklist items across tabs. Use tags for secondary relationships.

### D-013 — Trip item snapshots
A trip gets a snapshot/copy of master inventory items so editing a later master item does not unexpectedly rewrite completed trip history.

### D-014 — Extras are reviewable
Custom and research-suggested items can stay in Extras until deliberately promoted.

### D-015 — React/Vite baseline
The application uses React, strict TypeScript, and Vite. Vitest covers unit behavior, Playwright covers critical browser flows, and `vite-plugin-pwa` builds the installable shell. Persistence remains behind an application-owned interface so Sprint 01 can add IndexedDB without coupling it to UI components.

### D-016 — Camping setup levels
Trip setup offers Camper / RV, Tent camping, and Backpacking levels. Camper and tent use the complete car-camping inventory; Backpacking uses the existing lightweight seed filter. Every trip remains editable after generation.

### D-017 — Offline maps use licensed raster PMTiles archives
Sprint 18 uses a user-supplied or self-hosted HTTPS raster PMTiles v3 archive. The user must explicitly confirm that their archive license permits offline downloading before the app stores it. The archive is downloaded into its own IndexedDB store with pause/resume/delete status; only a fully validated archive can render as an offline base map. The app never bulk-downloads public OpenStreetMap community tiles, and it does not bundle provider keys or a proprietary source.

PMTiles is a single-file tile archive designed for range access and MapLibre integration. Because browser PWA storage and provider licensing vary, an incomplete or invalid archive remains paused/failed rather than being labelled as ready. Offline archives are deliberately excluded from JSON backup exports because binary map data can be large and its license may prohibit redistribution.

### D-018 — Android is a signed, local-first Capacitor package
The Android app packages the same local-first web assets with Capacitor. It uses relative asset paths and HTTPS local origin support; disables Android device backups; blocks cleartext traffic; and requests approximate foreground location only on demand. Release builds use R8/resource shrinking and cannot run without a complete untracked signing configuration. GitHub verifies a debug APK and Android lint; real release keys remain outside the repository.

### D-019 — Firebase is the Sprint 20 sync backend
Optional accounts, cloud sync, and live shared trips will use Firebase Authentication and Cloud Firestore. The existing IndexedDB application remains the offline-first source of immediate UI behavior. Firebase implementation must not begin until the user chooses sign-in methods, sharing roles/invites, deterministic conflict behavior, and which private data is excluded from cloud sync.

### D-020 — Path A Logical is the confirmed customer-facing brand
The app’s customer-facing name is **Path A Logical**. Public web, PWA, and Android display metadata use this name. The existing Android application ID, IndexedDB database name, backup formats, and repository identifiers remain unchanged so existing local data and future app updates remain compatible.
