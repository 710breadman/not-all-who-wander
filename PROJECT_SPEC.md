# Project Specification

## 1. Goal

Create a camping planning and packing app that replaces a manually maintained checklist/spreadsheet with a cleaner, faster, reusable system **and grows into a local-first camping trip companion**.

The original checklist product remains the foundation. The long-term workflow is:

**Idea -> Site -> Trip -> Weather/Safety -> Pack -> Navigate -> Camp -> Review -> Improve the next trip**

The product should reduce common failures such as:

1. forgetting an item,
2. bringing the wrong quantity,
3. having a checklist that is so cluttered it becomes annoying to use,
4. losing critical trip/site information when connectivity disappears,
5. bouncing among multiple apps and government sites for campsite/access information,
6. arriving without having checked weather, fire, access, permits, water, fuel, or other readiness concerns.

Implementation order is defined in `SPRINTS.md`. Post-v1 sprints are intentionally ordered from easiest/lowest-dependency work to hardest/highest-dependency work.

## 2. Product principles

### Local-first
The app must remain useful without internet service.

Trip/checklist data, saved Site Ideas, waypoints, safety/preflight information, and downloaded/cached offline data belong locally first. Cloud sync is optional future functionality, not a dependency for basic use.

### Privacy-first location behavior
Saved sites, tracks, medical notes, trip itineraries, and location history remain local unless the user explicitly chooses to share/sync them.

### Reusable
The master inventory survives across trips. A trip is a generated/edited snapshot, not the only copy of the data.

Saved campsites/sites should likewise be reusable across trips.

### Fast
Common packing and field actions should require one tap where practical.

### Flexible
The structure should work for car camping first, but allow lighter backpacking-oriented trips and later overlanding/dispersed-camping features.

### Clear
Items belong in one primary place. Cross-cutting concepts should use tags rather than duplicate entries.

Official facts, crowdsourced reports, and personal notes must remain distinguishable.

### Honest about stale data
Weather, fire, closure, access, road, water, and community-condition data can become stale. Dynamic information must retain source and freshness metadata.

### Battery/data aware
Continuous GPS, background refresh, downloads, and media should be explicit and controllable.

## 3. Main navigation

### Home / Trips
Shows:
- active trip
- upcoming/recent trips
- create trip
- Site Ideas / saved campsites
- master inventory
- settings/import/export

### Within a trip
The packing workflow retains these primary tabs:

1. Food
2. Gear
3. Clothes
4. Hygiene & First Aid
5. Extras

A compact All Items view may exist as a filter, but it should not replace the tabs.

As expansion sprints land, a trip may also expose dedicated surfaces for:
- Overview / Preflight
- Site
- Weather
- Map
- Route / Waypoints

Do not overcrowd the packing tabs with map/navigation controls.

## 4. Trip setup

Minimum fields:
- trip name
- destination/location text
- dates
- number of campers
- trip style:
  - Car Camping
  - Light Backpacking
  - Custom
- optional notes

Useful derived value:
- trip nights

Expansion-ready fields:
- linked saved Site
- destination coordinates
- adults
- children
- pets
- expected low/high temperature
- rain probability
- campsite amenities
- expected return
- reservation/permit references

## 5. Checklist item behavior

Each trip item supports:
- name
- category
- section
- quantity
- unit
- status
- notes
- optional tags
- source/master-item link
- custom item flag

Minimum statuses:
- Not Packed
- Packed
- Need to Buy
- Not Needed

Recommended UI:
- left-side status control/check
- item name
- quantity stepper
- overflow/edit action

Future item relationships may include advisory dependencies such as:
- stove -> fuel
- flashlight -> batteries/charger
- tarp -> cord/stakes

Dependency warnings must never silently alter a trip.

## 6. Master inventory

The master inventory is the reusable source list.

The user can:
- add an item
- edit an item
- archive an item
- choose default quantity
- set default category/section
- set default inclusion by trip style
- search/filter
- restore seed defaults without destroying custom data

## 7. Quantity model

Support:
- fixed
- per person
- per day
- per person per day

Examples:
- sleeping bag: 1 per person
- water: quantity can depend on people x days
- tent: fixed per trip

Manual override must always be available and must not be silently replaced.

## 8. Packing workflow

The high-value workflow is:

1. Create trip.
2. App copies relevant master items into the trip.
3. User adjusts quantities / removes irrelevant items.
4. User marks `Need to Buy` while preparing.
5. During packing, user marks `Packed`.
6. Progress is visible globally and per tab.
7. At the end of the trip, custom additions can optionally be promoted into the master inventory.

Expansion should add context around this workflow rather than replace it.

## 9. Search and filters

Minimum:
- search by item name
- filter by status
- filter current tab/section
- show only remaining
- show only Need to Buy

Supported/desired:
- search aliases
- tag filters
- backpacking compatibility filter
- site search/filter
- map marker filters
- official vs personal/community source filters

## 10. Offline / installability

The app should:
- be installable as a PWA
- load after prior installation without network
- persist trip/checklist/site/waypoint data locally
- avoid requiring login for core use

Later offline work adds:
- downloaded map regions
- official campsite records for a trip area
- cached weather snapshot
- cached fire/access/closure layers
- routes/tracks/waypoints
- saved permit/reservation references

Dynamic cached data must show when it was downloaded/fetched and may be stale.

## 11. Import/export and interoperability

Current/core:
- JSON backup/restore
- CSV trip checklist export
- portable trip share/import snapshots

Later:
- GPX import/export
- optional CSV import
- Google Sheets bridge if still useful
- cloud sync

Interoperability is preferred over prematurely replacing specialist navigation apps.

## 12. Site Ideas / campsite model

A reusable saved Site should be able to hold:
- name
- coordinates
- notes
- source/provenance
- source URL
- tags
- personal rating
- visit/revisit state
- last verified date
- amenities
- access/road notes
- vehicle/RV/trailer suitability
- cost notes
- reservation/permit notes
- cell-service notes
- optional photos/links

Personal Site Ideas are private/local by default.

Official, community, and personal information must not be silently conflated.

## 13. Safety and field behavior

The app may support:
- expected return
- emergency contacts
- optional vehicle notes
- hidden local medical/allergy notes
- one-tap coordinates
- pre-trip readiness checks
- weather/severe-alert context
- fire/access/closure context

The app must not imply that:
- a legally open road is physically passable,
- an old condition report is current,
- lack of a fire alert means an area is safe,
- crowdsourced water information means water is potable.

## 14. Mapping/navigation direction

Progress in stages:
1. GPS basics / saved waypoints
2. online map + local markers
3. official campsite discovery
4. public-land/fire/access layers
5. GPX/routes/tracks
6. track recording/navigation basics
7. lawful true offline map regions
8. offline trip data packs

Map providers must be abstracted.

Do not use OpenStreetMap community tile servers as a bulk/offline download backend. Offline maps require a provider/license that explicitly permits it or a compliant self-hosted/packageable strategy.

## 15. Cloud/community direction

Cloud is optional and late.

If added, the architecture must preserve local-first behavior and support:
- opt-in accounts/sync
- deterministic conflict handling
- live shared trips
- shared Site lists
- later community check-ins/photos/conditions
- moderation and trust/provenance
- privacy controls for sensitive locations

Community reports augment official data; they do not silently overwrite it.

## 16. Out of scope for the original core v1

The original v1 was not blocked on:
- user accounts
- social sharing
- cloud sync
- maps APIs
- weather APIs
- campsite reservation APIs
- barcode scanning
- AI recommendations
- automatic grocery ordering

That rule remains historically valid: the local checklist foundation came first. Several of those capabilities are now deliberately scheduled as **post-v1 expansion sprints** in `SPRINTS.md`.

## 17. AI rule

AI may later help with:
- checklist omission review
- trip/site comparison
- summarizing already-fetched weather or campsite reports
- post-trip learning

AI must never be treated as the authoritative source for:
- weather
- wildfire status
- legal access
- closures
- permits
- emergency information
- GPS/navigation position
