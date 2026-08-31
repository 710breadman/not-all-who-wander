# Implementation Status

Last updated: 2026-08-31

## Current sprint

**SPRINT-20 — Cloud Sync & Live Shared Trips**

Sprint 19 is complete. Sprint 20 will use Firebase Authentication and Cloud Firestore for optional sync and live shared trips. Product decisions still needed before implementation: sign-in methods, shared-trip roles/invites, conflict behavior, and the exact private-data sync boundary.

Deployment housekeeping remains:
- Enable GitHub Pages: Settings -> Pages -> Source -> GitHub Actions.
- Expected deployed URL: `https://710breadman.github.io/not-all-who-wander/`

## Completed

- React + TypeScript + Vite application scaffold
- strict TypeScript configuration
- ESLint and Vitest setup
- responsive application shell
- installable PWA manifest/service-worker build setup
- replaceable persistence abstraction with in-memory implementation
- validated seed-data loader used by the application shell
- Playwright desktop and phone smoke coverage
- IndexedDB MasterItem, Trip, and TripItem repositories with explicit schema migration
- one-time seed import that preserves later user edits
- persistent trip creation with style-specific checklist snapshots
- trip tabs, status control, quantity stepper, search, remaining/Need-to-Buy filters, and progress
- custom trip items (Extras by default) and promotion to the master inventory
- camper/RV, tent-camping, and backpacking setup levels with an inline category guide
- master-inventory add, edit, archive, category filtering, and alias-aware search
- JSON backup export, validated destructive restore, and CSV trip export
- deterministic fixed, per-person, per-day, and per-person-per-day quantity-rule engine
- packing mode and cross-tab Need-to-Buy shopping workflow
- offline browser coverage after a successful initial load
- trip-item editing for name, category, section, quantity, unit, status, and notes
- section-grouped checklist display with per-section progress
- database-backed backup/restore round-trip test
- direct four-state checklist markers: green packed, red buy, yellow pack, gray skip
- collapsible item sections, stable checklist heading, editable sections, and quick custom-item creation
- no-password people profiles with reusable personal item lists and per-person item ownership
- editable trip name, destination, address, dates, notes, people, and camper count
- local trip sorting and portable share/import files for sending a trip to another app user
- GitHub Pages workflow for a free, installable web distribution
- expanded post-v1 roadmap researched and ordered by implementation ease
- versioned `Site` records with offline site-idea creation, edit, archive, amenities, access, provenance, ratings, and verification details
- trip-to-site links that retain archived sites for historical trips
- one-tap save of a trip destination as a local site idea
- site-inclusive backup and restore coverage
- offline trip preflight readiness list, emergency and vehicle planning details, and private local medical/allergy note
- opt-in itinerary copy/print snapshot that excludes medical notes
- deterministic and dismissible checklist dependency reminders
- permission-aware current-coordinate lookup, local named waypoints, copy/share coordinates, and offline distance/bearing calculations
- explicit no-background-recording GPS behavior; location requests occur only from a user action
- waypoint-inclusive backup and restore coverage
- cache-first NWS forecast and active-alert adapter using documented point discovery and forecast endpoints
- offline-visible weather snapshot, stale-data warning, manual refresh, and weather-aware suggestions that never alter a checklist
- MapLibre-compatible map with visible attribution, lazy-loaded map code, current location opt-in, saved site/waypoint/trip markers, marker details, and external navigation fallback
- official USFS and BLM ArcGIS campsite discovery adapters with source provenance, freshness, duplicate-candidate surfacing, and durable save-to-local Site Ideas
- cached safety/access layer contracts with independent NASA FIRMS, BLM, and USFS providers; source/freshness/legend controls; and explicit legal-designation, physical-passability, and unknown states
- validated GPX route, track, and waypoint import/export with duplicate waypoint handling, local geometry persistence, backup/restore coverage, distance/elevation summaries, and map rendering
- explicitly started track recording with balanced and battery-saver sampling, crash-safe local persistence, elapsed/distance readouts, pause/resume/stop, and simplified saved tracks
- active breadcrumb rendering, destination/waypoint distance and bearing, nearest-route distance, per-track deletion, and privacy confirmation before recorded-track export
- licensed raster PMTiles offline-region library with region/zoom selection, capacity estimate, resumable download progress, pause/delete controls, quota checks, freshness metadata, and separate binary storage
- browser-validated PMTiles v3 raster archives rendered through MapLibre’s local PMTiles protocol; incomplete, invalid, or unlicensed downloads never appear ready
- independently stored offline trip packs with one-action preparation, component toggles, PMTiles map references, local site/route/waypoint snapshots, weather/context freshness, permit references, and medical-note exclusion
- pack estimates, stale-component update controls, and safe pack deletion that preserves the source trip and local records
- Android Capacitor package with bundled offline assets, native approximate-location handling, disabled device backup, and cleartext-network blocking
- signed/reduced Android release pipeline that fails closed without an untracked signing key, plus GitHub debug-APK and Android-lint verification

## Verification

Last recorded verification:
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — 44 passed
- `npm run build` — passed; manifest and service worker generated
- `npm run test:e2e` — 8 passed across desktop Chromium and Pixel 5 profiles
- `npm run android:debug` — passed against Android API 36 with JDK 21
- `:app:lintDebug` — passed; debug APK manifest is limited to Internet, network state, and approximate foreground location
- signed release verification — passed with R8/resource shrinking and APK v2/v3 signatures using a discarded test key

Sprint 09 through Sprint 19 application changes on 2026-08-31 passed all gates.

## Ordered next work

1. SPRINT-20 — Cloud Sync & Live Shared Trips
2. SPRINT-21 — Community Campsite Intelligence & Moderation
3. SPRINT-22 — Advanced Integrations & Smart Trip Review

See `SPRINTS.md` for deliverables and acceptance criteria.
