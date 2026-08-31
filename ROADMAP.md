# Roadmap

## Product direction

Grow the existing local-first camping checklist into a dependable **camping trip companion** without sacrificing the simple packing workflow that already works.

The expansion is intentionally ordered from **easiest / lowest-dependency work to hardest / highest-dependency work**. Build the inexpensive local capabilities first, then device APIs, live public data, mapping/navigation, true offline map distribution, and finally backend/community systems.

## Non-negotiable principles

- **Offline-first:** core trip, checklist, saved-site, safety, and recently cached data must remain useful without service.
- **Local-first privacy:** location history, saved campsites, emergency details, and trip plans stay on-device unless the user explicitly shares or enables sync.
- **Safety data must show freshness:** weather, fire, closure, access, and road information must expose source and last-updated time.
- **No false certainty:** official/crowdsourced conditions can be stale. Clearly label confidence and provenance.
- **Battery/data aware:** GPS polling, map downloads, background refreshes, and media should be controllable.
- **Progressive complexity:** car-camping users should never be forced through backpacking/navigation features they do not need.

---

## Phase 0 — Completed foundation

The repository already has the core required to support the larger product:

- installable React/TypeScript PWA
- IndexedDB persistence and migrations
- trip creation and reusable inventory
- tabbed packing workflow
- profiles / people
- quantity rules
- backup / restore / CSV
- offline application shell
- portable trip sharing snapshots
- responsive mobile/desktop coverage and tests

Keep this foundation stable while expanding.

---

## Phase 1 — Local campsite intelligence
**Ease: Very easy**

Turn a destination from plain text into a useful reusable campsite/site record without requiring any external service.

Build:
- saved **Site Ideas** / wishlist
- campsite profiles with name, coordinates, notes, photos/links, tags, amenities, cost notes, reservation notes, access notes, vehicle suitability, privacy/noise notes, pet notes, water/toilets/fire ring/electricity fields
- personal rating and revisit flag
- `last verified` date
- source/provenance field
- link a trip to a saved site
- duplicate/near-duplicate warning

Why first: pure local data + UI work, immediately useful, and becomes the common data model for maps, weather, GPS, sharing, and community reports later.

---

## Phase 2 — Safety preflight and offline readiness
**Ease: Very easy**

Add useful safety features that do not depend on a live backend.

Build:
- trip preflight screen
- emergency contact card
- destination coordinates / copy-to-clipboard
- planned departure / expected return
- vehicle description / plate notes (optional)
- medical / allergy notes stored locally and hidden by default
- offline-readiness checklist: maps, weather snapshot, reservations/permits, emergency contacts, fuel, water, first aid, power
- one-tap printable/shareable trip itinerary snapshot
- dependency warnings for gear (`stove -> fuel`, `flashlight -> batteries`, etc.)

---

## Phase 3 — GPS basics and waypoints
**Ease: Easy**

Use device/browser location services without building a full navigation engine yet.

Build:
- current location and accuracy
- one-tap `Save this spot`
- campsite / parking / trailhead / water / hazard / custom waypoint types
- latitude/longitude display and copy/share
- distance and bearing to a saved waypoint
- optional breadcrumb sampling with explicit start/stop
- battery-aware location modes
- graceful behavior when permission or GPS is unavailable

Do not require continuous tracking for normal app use.

---

## Phase 4 — Weather and severe alerts
**Ease: Easy–moderate**

Use trip/site coordinates to make weather part of planning instead of a separate app.

Build:
- current conditions + hourly/daily forecast for a trip/site
- expected low/high, precipitation, wind, and hazardous-condition summary
- severe weather watches/warnings/advisories where supported
- cached `last forecast` usable offline with a clear timestamp
- weather-aware packing suggestions that are advisory and reversible
- refresh control and data-age indicator

Preferred U.S. starting point: National Weather Service API because forecasts/alerts are open public data. Keep a provider abstraction so non-U.S. coverage can be added later.

---

## Phase 5 — Basic map and saved-site view
**Ease: Moderate**

Add a map only after the campsite and waypoint models exist.

Build:
- interactive map
- current location
- saved sites and waypoints
- trip destination marker
- search / pan / zoom
- filter markers by type
- open campsite card from a marker
- map/list split view
- map provider abstraction and required attribution

Important: do **not** implement offline downloads against OpenStreetMap's public tile servers. OSM's tile policy prohibits bulk/offline prefetching. Offline regions require an explicitly permitted provider or self-hosted/packageable tiles.

---

## Phase 6 — Official campsite discovery
**Ease: Moderate**

Stop relying only on user-entered sites. Aggregate trustworthy public recreation data into one search experience.

Build:
- official campground/recreation-site ingestion adapters
- normalized campsite record
- search around map / route / destination
- developed vs dispersed / primitive distinctions when source data supports it
- amenity and agency filters
- source links and source freshness
- favorites / save as Site Idea
- deduplication across sources

Initial U.S. data candidates:
- U.S. Forest Service recreation opportunity services
- Bureau of Land Management recreation-site GIS services
- Recreation.gov / RIDB-compatible sources where terms and API access are suitable

The app should retain provenance instead of pretending merged sources are equally complete.

---

## Phase 7 — Fire, access, closure, and public-land intelligence
**Ease: Moderate–hard**

Layer safety and legality information over trip/site planning.

Build provider adapters for:
- active wildfire detections / fire context
- smoke / AQI when a suitable source is selected
- fire restrictions / bans where structured data exists
- public-land / management boundaries
- legal public access data where available
- USFS Motor Vehicle Use Map roads/trails and seasonal vehicle permissions
- closures / alerts from land managers where machine-readable sources exist
- source + last-updated + confidence on every layer

The UI must distinguish:
- **official legal/access status**
- **reported physical condition**
- **unknown / stale information**

Never imply a road is physically passable merely because it is legally open.

---

## Phase 8 — GPX, routes, tracks, and practical navigation
**Ease: Hard**

Add interoperable navigation tools instead of trying to replace dedicated navigation apps all at once.

Build:
- GPX import/export
- route and track models
- track recording with pause/resume
- route/track elevation summary when data is available
- waypoint import/export
- `navigate to` handoff to external maps as a fallback
- off-route / distance-to-destination basics
- track simplification and storage controls
- privacy controls for stored tracks

KML can follow after GPX unless a clear use case requires it sooner.

---

## Phase 9 — True offline map regions
**Ease: Hard / high-risk**

This is a core differentiator, but should be attempted only after the online map and navigation models are stable.

Build:
- explicit `Download for offline` regions
- selectable zoom/detail level
- estimated download/storage size
- progress / pause / resume / delete
- downloaded-region manager
- offline map rendering
- offline saved sites/waypoints/tracks
- stale-map/update indicator
- storage quota handling
- provider/license compliance tests

Architecture decision required before implementation:
- provider-supported offline tiles,
- self-hosted/packageable vector tiles (for example PMTiles-compatible data), or
- a native wrapper if browser/PWA storage and offline limitations become unacceptable.

Do not couple the rest of the app to one tile vendor.

---

## Phase 10 — Offline field data packs
**Ease: Hard**

Make the app useful when the user has no signal for days.

A trip/region download can optionally cache:
- campground/site records
- recent weather snapshot
- fire/access/closure snapshot
- public-land layers
- emergency/ranger reference information
- permits/reservation documents or links saved by the user

Every cached dynamic source must show `downloaded at` and `may be stale` behavior.

---

## Phase 11 — Cloud sync, live group trips, and community reports
**Ease: Very hard**

Only add a backend after the local product is excellent.

Build in stages:
1. opt-in account/sync model
2. encrypted transport and conflict handling
3. live shared trips / item claiming
4. shared campsite lists
5. community check-ins, photos, access notes, cell-signal reports, water reports, road-condition reports
6. moderation, abuse controls, duplicate handling, edit history, trust/verification scores
7. privacy controls for sensitive/hidden campsites and exact locations

Community data should augment official data, never silently overwrite it.

---

## Phase 12 — Advanced differentiators
**Ease: Very hard / speculative**

Candidates after the above platform is stable:
- carrier/crowdsourced cell-coverage intelligence
- satellite messenger integrations where APIs permit
- smartwatch / wearable trip safety surface
- CarPlay / Android Auto companion surface if platform policy permits
- route-aware fuel / water / resupply planning
- permit and reservation deep links / availability integrations
- automatic campsite comparison score with explainable factors
- trip retrospective that learns from forgotten/unused gear
- optional AI trip preflight that checks weather, site amenities, itinerary, and checklist for omissions
- accessibility-focused outdoor planning modes
- native mobile shell only if PWA limitations materially block offline maps, background GPS, or device integrations

AI remains an assistant, not the authority for safety, legality, weather, or navigation.

---

## What makes the product different

The long-term target is not simply `another campground map` or `another checklist`.

The differentiator is one continuous workflow:

**Idea -> Site -> Trip -> Weather/Safety -> Pack -> Navigate -> Camp -> Review -> Improve the next trip**

The existing checklist becomes the foundation rather than a separate feature.