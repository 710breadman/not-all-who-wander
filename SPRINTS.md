# Sprints

## Execution rule

Sprints are intentionally ordered. **SPRINT-09 and later are ranked primarily by ease / dependency risk**, from easiest to hardest. Do not skip ahead just because a later feature sounds more important.

Keep the app runnable at the end of every sprint. Every sprint must update tests and `STATUS.md`.

---

# Completed foundation

The implementation status shows the original product foundation is already substantially complete. Preserve it; do not redo it unless a regression requires repair.

## SPRINT-00 — Bootstrap & Guardrails — COMPLETE
- React + TypeScript + Vite scaffold
- strict TypeScript
- tests
- PWA shell
- persistence abstraction
- seed loader

## SPRINT-01 — Data & Persistence — COMPLETE
- IndexedDB repositories
- schema/versioning
- seed import
- migrations

## SPRINT-02 — Trip Creation & Checklist Generation — COMPLETE
- persistent trip creation
- trip styles
- checklist snapshots
- trip header/progress

## SPRINT-03 — Core Tabbed Packing UI — COMPLETE
- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras
- quantity/status/search/filter/progress flows

## SPRINT-04 — Custom Items & Master Inventory — COMPLETE
- trip-item editing
- master inventory editing/archive
- custom items
- promote to master
- search / aliases

## SPRINT-05 — Backup, Restore & Export — COMPLETE
- JSON backup/restore
- CSV trip export
- validation / round-trip coverage

## SPRINT-06 — Offline PWA & Installation — COMPLETE
- manifest/service worker
- cached shell
- offline-safe startup after initial load

## SPRINT-07 — UX Polish — COMPLETE
- packing mode
- Need-to-Buy workflow
- responsive UI
- accessibility / keyboard coverage

## SPRINT-08 — Trip Presets / Quantity Rules / Profiles — COMPLETE
- deterministic quantity rules
- camping setup levels
- reusable people profiles
- trip details editing
- portable share/import snapshots

---

# Expansion sprints — easiest to hardest

## SPRINT-09 — Saved Site Ideas & Campsite Profiles
**Ease: 1/5 — easiest**

### Goal
Turn campsite ideas into reusable local records that later features can attach to.

### Deliverables
- `Site` / `Campsite` domain model and IndexedDB repository
- Site Ideas / wishlist view
- create/edit/archive site
- name + optional coordinates
- notes
- source URL / provenance
- tags
- personal rating
- `want to visit` / `visited` / `revisit` state
- `last verified` date
- amenities fields:
  - potable water
  - toilets
  - showers
  - fire ring
  - picnic table
  - bear storage
  - electricity
  - cell-service notes
- access fields:
  - road/access notes
  - vehicle suitability
  - trailer/RV notes
  - parking notes
- cost/reservation/permit notes
- link a Trip to a saved Site
- fast `Save as Site Idea` action from trip destination

### Done when
- a site can be created in under a minute without internet
- site survives reload/offline use
- a trip can reference a site without duplicating the whole site record
- archived sites remain referenced by historical trips
- no external API is required

---

## SPRINT-10 — Trip Preflight, Dependencies & Safety Card
**Ease: 1/5**

### Goal
Add useful safety/planning features that work completely offline.

### Deliverables
- pre-trip readiness screen
- expected departure / return
- emergency contact fields
- optional vehicle description / plate note
- local-only medical/allergy note field, hidden by default
- destination coordinates when known
- one-tap copy of coordinates
- printable/shareable itinerary snapshot
- offline-readiness checklist:
  - maps downloaded
  - weather checked
  - permits/reservations saved
  - emergency contact set
  - fuel
  - water
  - first aid
  - power
- item dependency model and warnings
  - stove -> fuel
  - flashlight -> batteries/charger
  - tarp -> cord/stakes
  - canned food -> can opener
  - coffee -> maker/fuel/water/mug
- warnings are advisory, never destructive

### Done when
- all safety/preflight data works offline
- sensitive fields are never shared unless explicitly selected
- dependency warnings are deterministic and dismissible
- itinerary export contains only user-approved fields

---

## SPRINT-11 — GPS Basics & Local Waypoints
**Ease: 2/5**

### Goal
Use browser/device geolocation for practical campsite use without attempting full navigation.

### Deliverables
- permission-aware geolocation service
- current coordinates
- reported accuracy
- `Save this spot`
- waypoint types:
  - campsite
  - parking
  - trailhead
  - water
  - hazard
  - custom
- waypoint name/notes
- distance to waypoint
- basic bearing to waypoint
- copy/share coordinates
- optional low-frequency breadcrumb mode
- explicit start/stop for any continuous sampling
- battery-aware sampling presets

### Done when
- refusing location permission does not break the app
- saved waypoints work offline
- continuous GPS never starts automatically
- coordinates can be copied without a network connection
- tests cover permission/error states through abstractions/mocks

---

## SPRINT-12 — Weather & Severe Weather Alerts
**Ease: 2/5**

### Goal
Attach useful weather intelligence directly to trips and sites.

### Deliverables
- provider abstraction
- U.S. National Weather Service adapter first
- forecast by trip/site coordinates
- current / hourly / daily summary as available
- low/high temperature
- precipitation
- wind
- severe watches/warnings/advisories
- forecast `fetched at` timestamp
- cache latest forecast for offline viewing
- stale-data warning
- manual refresh
- weather-aware checklist suggestions
- suggestions never silently add/remove packed items

### Done when
- trip with coordinates can fetch weather
- last successful forecast remains viewable offline
- stale data is visually obvious
- provider failure does not block trip/checklist use
- API calls are cache-friendly and rate-conscious

---

## SPRINT-13 — Basic Online Map & Saved Markers
**Ease: 2/5**

### Goal
Provide one simple map for current location, trip destinations, sites, and waypoints.

### Deliverables
- map abstraction
- MapLibre-compatible map implementation
- map attribution
- current-location marker
- saved-site markers
- waypoint markers
- trip destination marker
- marker filters
- marker -> details card
- map/list view
- `open external navigation` fallback
- provider configuration isolated from domain logic

### Guardrail
Do not build offline-region downloads against `tile.openstreetmap.org` or OSM's public vector tile servers. Their policies prohibit bulk/offline prefetching.

### Done when
- map failure does not affect local trip data
- all local markers remain available in the list offline
- replacing the tile/style provider does not require rewriting site/waypoint models
- attribution is always visible where required

---

## SPRINT-14 — Official Campsite Discovery
**Ease: 3/5**

### Goal
Find more real camping options without depending solely on user submissions.

### Deliverables
- normalized external `DiscoveredSite` model
- source adapter interface
- first official U.S. adapters:
  - USFS recreation opportunities
  - BLM recreation sites/facilities
- destination/radius search
- map-bounds search
- developed / primitive / dispersed classification only when source supports it
- amenity filters
- agency/source filter
- source freshness / provenance
- open original source
- save discovered result into local Site Ideas
- cross-source dedupe heuristics
- cache recent discovery results

### Done when
- at least two official sources normalize into one UI
- original source remains visible
- uncertain/missing fields stay unknown rather than guessed
- saving a discovered site creates a durable offline local record
- duplicate candidates are surfaced instead of silently merged

---

## SPRINT-15 — Fire, Public Land, Access & Road-Legality Layers
**Ease: 3/5**

### Goal
Surface important safety/access context without pretending it is a guarantee of conditions.

### Deliverables
- generic geospatial layer/provider contract
- wildfire context adapter; NASA FIRMS is an initial candidate for active-fire detections
- BLM public-land/access layers where usable
- USFS Motor Vehicle Use Map roads/trails
- legal vehicle class / seasonal-use attributes where source supplies them
- land-management/agency context
- layer source + fetched-at timestamp
- legend
- layer enable/disable controls
- cache last successful layer response for trip area
- architecture slots for:
  - fire restrictions/bans
  - closures
  - smoke/AQI
  - water-source layers

### Safety wording requirement
The app must distinguish:
- legally designated/open
- physically reported passable
- unknown

A legally open road is **not** automatically labeled safe or passable.

### Done when
- each rendered layer exposes source/freshness
- stale or missing data is explicit
- a layer outage cannot break the base map or trip
- source adapters are independently testable

---

## SPRINT-16 — GPX Import/Export & Route/Track Model
**Ease: 4/5**

### Goal
Make trips interoperable with established outdoor navigation tools.

### Deliverables
- GPX parser
- GPX exporter
- route model
- track model
- waypoint GPX import/export
- imported-file validation
- duplicate handling
- route/track details
- distance summary
- optional elevation fields when supplied
- display GPX route/track on map

### Done when
- representative GPX files round-trip without losing supported geometry
- malformed files fail safely
- imported routes/tracks are available offline
- export does not include private metadata unless explicitly selected

---

## SPRINT-17 — Track Recording & Field Navigation Basics
**Ease: 4/5**

### Goal
Record actual movement and provide useful field-navigation aids while keeping power use under control.

### Deliverables
- start/pause/resume/stop track recording
- elapsed time / distance
- configurable sampling interval
- battery-saving mode
- breadcrumb trail
- distance/bearing to destination/waypoint
- off-route distance where a route exists
- crash-safe periodic persistence
- track simplification
- delete/export controls
- privacy warning before sharing recorded tracks

### Done when
- accidental page/app interruption does not lose the entire track
- recording is never enabled implicitly
- battery-saving mode reduces location sampling
- long tracks do not make the UI unusable

---

## SPRINT-18 — True Offline Map Regions
**Ease: 4/5 — high technical/licensing risk**

### Goal
Let a user deliberately download a trip area for navigation with no signal.

### Architecture gate
Before coding, document and approve one lawful offline-map source strategy:
- provider that explicitly permits offline region downloads,
- self-hosted/packageable vector tiles / PMTiles-style archives,
- or a native wrapper if browser/PWA limitations are unacceptable.

Do not use OSM community tile servers for offline bulk downloads.

### Deliverables
- select region
- select detail/zoom level
- size estimate
- download progress
- pause/resume/cancel
- downloaded-region library
- delete region
- storage quota/error handling
- offline rendering
- update/staleness metadata
- integration with saved sites/waypoints/routes

### Done when
- downloaded region renders in airplane-mode testing
- incomplete download cannot masquerade as complete
- storage exhaustion fails safely
- deleting a map region does not delete trip/site/waypoint data
- license/provider requirements are covered by tests/docs

---

## SPRINT-19 — Offline Trip Data Packs
**Ease: 4/5**

### Goal
Make `download this trip` capture more than map tiles.

### Deliverables
A trip/region pack can include:
- map region
- official campsite records
- saved Site Ideas
- waypoints/routes
- latest weather snapshot
- latest fire/access/closure layers
- saved permits/reservation references
- emergency reference information
- pack size estimate
- individual component toggles
- `downloaded at` / stale indicators

### Done when
- one action can prepare a trip for offline use
- dynamic data is never shown without freshness information
- user can update only stale components
- deleting a pack does not destroy source trip data

---

## SPRINT-20 — Cloud Sync & Live Shared Trips
**Ease: 5/5**

### Goal
Add optional multi-device continuity only after local-first behavior is stable.

### Deliverables
- backend/account architecture decision
- opt-in authentication
- sync protocol
- conflict handling
- encrypted transport
- multi-device trip/site/profile sync
- live shared trip
- item assignment/claiming
- permission model
- local-first queue/retry
- account deletion/export behavior

### Done when
- app still works without an account
- offline edits sync without silent data loss
- conflicts are deterministic/recoverable
- user can disable sync and retain local data

---

## SPRINT-21 — Community Campsite Intelligence & Moderation
**Ease: 5/5**

### Goal
Build a trustworthy crowdsourced layer rather than an unmoderated pin dump.

### Deliverables
- check-ins
- recent-condition reports
- photos
- road/access reports
- cell-service reports by carrier
- water availability/reliability reports
- noise/crowding/privacy notes
- `last verified` and report date everywhere
- report provenance
- duplicate-site workflow
- edit history
- moderation/report-abuse tools
- trust/confidence model
- sensitive-site location controls
- community data visually separated from official data

### Done when
- community reports never overwrite official facts silently
- stale reports are visually de-emphasized
- abusive/incorrect content can be reported/moderated
- exact sensitive locations can be withheld or generalized

---

## SPRINT-22 — Advanced Integrations & Smart Trip Review
**Ease: 5/5 / optional**

### Candidates
Implement only after separate design review:
- carrier/crowdsourced cell-coverage overlays
- satellite messenger integration
- smartwatch/wearable safety surface
- CarPlay / Android Auto companion
- route-aware fuel/water/resupply planning
- reservation/permit availability integrations
- road-condition feeds
- trip retrospective that learns from forgotten/unused items
- automatic campsite comparison with explainable scoring
- optional AI preflight reviewing weather + site + itinerary + checklist
- native mobile shell if required for background GPS/offline-map reliability

### Rules
- AI cannot be the source of truth for legality, weather, fire, emergency, or navigation information.
- Safety-critical data must retain original source and timestamp.
- Every integration must degrade gracefully when offline/unavailable.
