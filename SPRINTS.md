# Sprints

Sprints are intentionally ordered. Do not skip forward to integrations.

---

## SPRINT-00 — Bootstrap & Guardrails

### Goal
Create a clean, runnable project and lock in the handoff requirements.

### Deliverables
- app scaffold
- TypeScript strict mode
- test setup
- PWA shell
- persistence abstraction
- seed-data loader
- `STATUS.md`
- project README for running/building/testing

### Done when
- dev server runs
- production build succeeds
- unit test command succeeds
- app shell opens on mobile and desktop sizes
- seed data can be loaded through application code

---

## SPRINT-01 — Data & Persistence

### Goal
Implement the canonical data model and durable local persistence.

### Deliverables
- MasterItem repository
- Trip repository
- TripItem repository
- IndexedDB schema/versioning
- seed import
- migration harness
- repository tests

### Done when
- reload does not lose data
- seed data imports once without duplicating
- master and trip data can be independently queried
- migration version is explicit

---

## SPRINT-02 — Trip Creation & Checklist Generation

### Goal
A user can create a trip and get a usable checklist.

### Deliverables
- New Trip flow
- trip name
- optional destination
- dates
- camper count
- trip style
- copy relevant MasterItems into TripItems
- trip home/header/progress

### Done when
- new trip persists
- generated list uses snapshots
- car camping is the default
- light-backpacking filter works
- changing master data later does not mutate existing trip rows

---

## SPRINT-03 — Core Tabbed Packing UI

### Goal
Deliver the main product workflow.

### Deliverables
- Food tab
- Gear tab
- Clothes tab
- Hygiene & First Aid tab
- Extras tab
- section grouping
- status changes
- quantity stepper
- search
- filters
- progress

### Done when
- every seed item appears in exactly one primary category
- status persists after reload
- quantity persists after reload
- Remaining filter works
- Need-to-Buy filter works
- no generic `sauce` item exists

---

## SPRINT-04 — Custom Items & Master Inventory

### Goal
Let the checklist evolve without becoming disorganized.

### Deliverables
- add/edit trip item
- add/edit/archive MasterItem
- Extras default for uncategorized custom additions
- Promote to Master action
- inventory search/filter
- category/section picker
- alias support in search

### Done when
- custom trip item can be created in seconds
- promotion produces one MasterItem
- archive hides a MasterItem from new trips without deleting history
- duplicate promotion is prevented or clearly warned

---

## SPRINT-05 — Backup, Restore & Export

### Goal
Make local-first data safe and portable.

### Deliverables
- JSON full backup
- JSON restore with schema validation
- CSV trip export
- backup version metadata
- destructive-restore confirmation
- automated round-trip tests

### Done when
- export -> fresh database -> import recreates representative data
- invalid backup is rejected safely
- CSV is readable in Excel/Sheets

---

## SPRINT-06 — Offline PWA & Installation

### Goal
Make the app dependable at a campsite.

### Deliverables
- installable manifest
- service worker
- cached application shell
- offline-safe startup
- offline indicator only when useful
- update handling

### Done when
- installed app launches without network after a prior successful load
- checklist operations still work offline
- reconnect does not reset local data

---

## SPRINT-07 — UX Polish

### Goal
Make packing faster than using a spreadsheet.

### Deliverables
- Packing Mode
- cross-tab Need-to-Buy shopping view
- better empty states
- responsive inventory editing
- keyboard support
- accessibility pass
- visual progress polish

### Done when
- common status change is one tap
- all primary actions work at narrow phone width
- no horizontal scrolling is required for normal packing
- keyboard-only navigation can complete core flows

---

## SPRINT-08 — Trip Presets / Quantity Rules

### Goal
Reduce repetitive setup while keeping rules understandable.

### Deliverables
- fixed/per-person rule support
- optional per-day rules
- preset by trip style
- clear generated-quantity explanation
- manual override always available

### Done when
- rule-generated quantities are deterministic
- user override is never silently replaced
- basic fixed-quantity behavior remains valid

---

## SPRINT-09 — Optional Integrations

### Goal
Add integrations only after core quality is proven.

Candidates:
- Google Sheets import/export
- weather suggestions
- map/location autocomplete
- cloud synchronization

Each candidate requires its own design/acceptance criteria before implementation.
