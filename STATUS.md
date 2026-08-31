# Implementation Status

Last updated: 2026-08-31

## Current sprint

**SPRINT-09 — Saved Site Ideas & Campsite Profiles**

This is the first post-v1 expansion sprint because it is the easiest high-value addition and creates the shared data model required by later GPS, weather, maps, campsite discovery, offline packs, and community features.

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

## Verification

Last recorded verification:
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm test` — 16 passed
- `npm run build` — passed; manifest and service worker generated
- `npm run test:e2e` — 6 passed across desktop Chromium and Pixel 5 profiles

Documentation-only roadmap changes on 2026-08-31 did not modify application code.

## Ordered next work

1. SPRINT-09 — Saved Site Ideas & Campsite Profiles
2. SPRINT-10 — Trip Preflight, Dependencies & Safety Card
3. SPRINT-11 — GPS Basics & Local Waypoints
4. SPRINT-12 — Weather & Severe Weather Alerts
5. SPRINT-13 — Basic Online Map & Saved Markers
6. SPRINT-14 — Official Campsite Discovery
7. SPRINT-15 — Fire, Public Land, Access & Road-Legality Layers
8. SPRINT-16 — GPX Import/Export & Route/Track Model
9. SPRINT-17 — Track Recording & Field Navigation Basics
10. SPRINT-18 — True Offline Map Regions
11. SPRINT-19 — Offline Trip Data Packs
12. SPRINT-20 — Cloud Sync & Live Shared Trips
13. SPRINT-21 — Community Campsite Intelligence & Moderation
14. SPRINT-22 — Advanced Integrations & Smart Trip Review

See `SPRINTS.md` for deliverables and acceptance criteria.