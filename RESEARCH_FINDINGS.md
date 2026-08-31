# Research Findings

Research is used to check omissions, prioritize product work, and identify trustworthy data sources. Community comments are signals, not requirements by themselves.

Research refresh: **2026-08-31**

---

# 1. Original checklist research

## REI — Camping Essentials Checklist
REI's checklist separates core campsite gear, kitchen, clothing, hygiene, sun/bug protection, tools/repair, personal items, and optional extras.

Useful confirmation for this project:
- tent + footprint + stakes
- sleep system
- headlamps/flashlights and spare batteries
- chairs/table
- stove/fuel
- can/bottle opener
- cooler
- wash bins
- trash bags
- portable power
- tools/repair supplies
- hygiene
- sun and bug protection

Source:
https://www.rei.com/learn/expert-advice/family-camping-checklist.html

## Reddit / r/camping — easily forgotten items
Recurring suggestions include:
- dedicated camp can opener
- toilet paper even when a campground advertises bathrooms
- extra batteries
- updating the checklist immediately after discovering a forgotten item

Thread:
https://www.reddit.com/r/camping/comments/xeadup/

## Reddit / r/CampingGear — car camping essentials
Community responses reinforce the minimum useful car-camping stack:
- shelter/sleep system
- lighting
- stove/cookware when cooking
- cooler
- chairs
- pillows
- fire-related tools where permitted

Thread:
https://www.reddit.com/r/CampingGear/comments/16kepiv/

## Reddit / r/camping — vehicle battery risk
A practical car-camping addition is a battery jump pack because campsite use can accidentally drain a vehicle battery.

Thread:
https://www.reddit.com/r/camping/comments/16uhj39/

## Reddit / r/CampingandHiking — forgotten item discussion
Toilet paper remains a repeated `bring it anyway` item, even at developed campgrounds.

Thread:
https://www.reddit.com/r/CampingandHiking/comments/1r1c0ru/

## Checklist product insight — dependency forgetting

The strongest pattern is not a single missing item. It is **dependency forgetting**:
- flashlight without batteries
- food without a way to cook/open it
- tarp without cord/attachment hardware
- coffee without maker/fuel/water/cup

This is promoted into the roadmap as a trip-preflight dependency system.

---

# 2. Camping-app / forum research

## Strong demand signals

### A. Offline access must include saved places, not only the application shell
A recurring frustration is losing access to favorites/site information exactly where connectivity disappears. One overlanding discussion specifically calls out offline campsite database + favorites, free/dispersed camping, reviews, and photos as key requirements.

Thread:
https://www.reddit.com/r/overlanding/comments/ni8vx9/thedyrt_unusable/

Roadmap implication:
- Site Ideas and saved campsite profiles must be durable local data first.
- Later offline trip packs should include site records and field data, not merely map tiles.

Demand: **strong**

### B. Users do not want to cross-reference several apps and government websites
A recent overlanding discussion describes the burden of bouncing among sources while planning and the value of consolidating official campground/dispersed data.

Thread:
https://www.reddit.com/r/overlanding/comments/1nr5fbm/the_camping_apps_everyone_uses_are_missing_most/

Roadmap implication:
- normalize official campsite sources into one discovery UI
- preserve original agency/source links and provenance
- support both developed and dispersed/primitive opportunities where source data allows

Demand: **strong**

### C. Public-land access and legal road information are major planning gaps
Forum discussion around dispersed camping repeatedly turns into questions such as:
- which land is public
- where legal access exists
- what roads are designated
- how long/where camping is allowed
- whether a route crosses private land

A 2025–2026 community-built camping app update also reported strong engagement around USFS MVUM road layers and recent site check-ins.

Threads:
https://www.reddit.com/r/overlanding/comments/1nr5fbm/the_camping_apps_everyone_uses_are_missing_most/
https://www.reddit.com/r/overlanding/comments/1pzruyh/update_the_camping_app_you_helped_beta_test_just/

Roadmap implication:
- public-land/access and MVUM layers belong in the product
- legal access and physical road condition must be modeled separately

Demand: **strong**

### D. One planning surface is valuable, but no single current tool satisfies every job
Recent overlanding discussion describes using one map as a consolidation layer while still using separate sources to discover trails, destinations, campgrounds, and specialized points of interest.

Thread:
https://www.reddit.com/r/overlanding/comments/1vqw87d/offroad_mapping/

Roadmap implication:
- the app should become a trip hub, not attempt to replace every specialist tool immediately
- GPX interoperability and `open in external navigation` are valuable before full navigation replacement

Demand: **strong**

## Moderate demand signals

### E. Weather and wildfire context are expected planning layers
Community-built outdoor apps commonly highlight offline maps plus public-land/wildfire layers, and campers often combine mapping apps with dedicated weather tools.

Threads:
https://www.reddit.com/r/overlanding/comments/1ibq1dh/
https://www.reddit.com/r/overlanding/comments/182u93t/

Roadmap implication:
- weather should attach directly to a trip/site
- hazards should be optional map layers with timestamps
- cached last-known information is useful offline, but must be labeled stale

Demand: **moderate to strong**

### F. Recent photos and condition reports help judge whether a campsite is actually usable
The community repeatedly values photos, check-ins, access notes, and recent conditions rather than static ratings alone.

Roadmap implication:
- local Site profiles should include `last verified`
- community reports later need explicit dates and confidence/provenance

Demand: **moderate to strong**

### G. Cell-service knowledge matters because it changes planning and safety expectations
Cell coverage is frequently discussed in overlanding/camping tools, but reliable carrier data and crowdsourced validation introduce data/licensing/backend complexity.

Roadmap implication:
- support a simple local `cell-service notes` field early
- defer carrier/crowdsourced coverage overlays until community/backend infrastructure exists

Demand: **moderate**

---

# 3. Community disagreement worth designing around

## Hidden sites vs crowdsourcing
Some campers strongly support sharing dispersed/hidden sites; others oppose publishing exact coordinates because it can increase crowding, damage, trash, and loss of low-impact locations.

The product should not assume `more public pins = better`.

Design response:
- official sites may be shown normally
- personal Site Ideas remain private/local by default
- future community submissions need privacy controls
- allow generalized/approximate locations for sensitive sites
- do not expose a private saved location through sync/community features without explicit user intent

---

# 4. Official/public data sources worth building around

## National Weather Service API
Use case:
- forecasts
- observations
- watches/warnings/advisories

Official documentation:
https://www.weather.gov/documentation/services-web-API
https://www.weather.gov/documentation/services-web-alerts

Notes:
- open public U.S. government data
- cache-friendly design
- reasonable rate limits still apply
- use a provider abstraction for future non-U.S. support

Roadmap fit: **SPRINT-12**

## NASA FIRMS
Use case:
- active fire detections / wildfire context

Official documentation:
https://firms.modaps.eosdis.nasa.gov/web-services

Notes:
- useful hazard context
- does not by itself mean a campsite is closed or unsafe
- must be paired with clear source/time semantics

Roadmap fit: **SPRINT-15**

## U.S. Forest Service recreation opportunities
Use case:
- recreation-site discovery
- campground/recreation metadata

Service:
https://apps.fs.usda.gov/ArcX/rest/services/EDW/EDW_RecreationOpportunities_01/MapServer

Notes:
- public-use recreation data
- source reports nightly refresh from Forest Service recreation systems
- preserve agency provenance and source links

Roadmap fit: **SPRINT-14**

## U.S. Forest Service Motor Vehicle Use Map data
Use case:
- legal motorized routes
- vehicle types
- seasons of use

Road service example:
https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_02/MapServer/4

Trail service example:
https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer/5

Critical interpretation rule:
MVUM legality/season data is **not** a guarantee that current physical conditions are passable.

Roadmap fit: **SPRINT-15**

## Bureau of Land Management recreation data
Use case:
- BLM recreation sites/facilities
- camping/recreation discovery

Services:
https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation/MapServer
https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_Recreation_Sites_Facilities/MapServer

Roadmap fit: **SPRINT-14**

## Bureau of Land Management public-land access data
Use case:
- legal public access context to BLM-managed lands

Official page:
https://www.blm.gov/programs/recreation/recreation-programs/travel-and-transportation/public-lands-access-data

Related MAPLand service:
https://gis.blm.gov/arcgis/rest/services/recreation/BLM_Natl_MAPLand/MapServer

Roadmap fit: **SPRINT-15**

---

# 5. Mapping architecture finding

## OpenStreetMap data is useful; public OSM tile servers are not an offline-map backend
OpenStreetMap's current raster and vector tile usage policies prohibit bulk downloading/prefetching for offline use.

Policies:
https://operations.osmfoundation.org/policies/tiles/
https://operations.osmfoundation.org/policies/vector/

Therefore:
- OSM-derived data/styles can still be part of the mapping stack
- do not build a `download this region` feature against OSM community tile servers
- true offline regions require a provider that permits offline use, self-hosted/packageable vector tiles, or another compliant distribution strategy

Roadmap fit:
- basic provider-independent map first
- true offline region architecture much later

---

# 6. Product conclusions

## Promote into committed roadmap
- Site Ideas / campsite profiles
- campsite amenities/access notes
- dependency-aware trip preflight
- emergency/offline readiness card
- GPS location + saved waypoints
- weather + severe alerts
- map/list view
- official campground discovery
- public-land/access/MVUM layers
- fire/hazard context
- GPX interoperability
- track recording
- true offline map regions
- offline trip data packs
- optional cloud sync/shared trips
- moderated community condition reports

## Keep advanced / conditional
- live reservation availability
- permit automation
- carrier cell-coverage overlays
- satellite messenger integrations
- smartwatch / CarPlay / Android Auto
- road-condition aggregation
- AI trip review
- native shell

These can be valuable, but should not delay the easier core expansion.