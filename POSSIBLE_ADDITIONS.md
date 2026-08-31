# Possible Additions

This file now contains ideas that are **not yet committed implementation work**. Features promoted into the ordered sprint plan belong in `SPRINTS.md`, not here.

## Promoted into the roadmap

The following were previously optional ideas and are now committed future work:
- item dependency warnings
- campsite amenities / Site Ideas
- weather-aware suggestions
- GPS / saved waypoints
- maps
- official campsite discovery
- fire/public-land/access layers
- GPX/routes/tracks
- true offline map regions
- offline trip packs
- shared trips / cloud sync
- community campsite condition reports

See `ROADMAP.md` and `SPRINTS.md` for order and acceptance criteria.

---

## High-value candidates after the ordered roadmap

### Trip retrospective learning
After a trip:
- What did you forget?
- What did you bring but never use?
- What ran out?
- What broke?
- Which campsite/site notes changed?
- Add forgotten item to master list?
- lower default priority of unused item?
- update Site `last verified`?

Keep the learning explainable and user-controlled.

### Loadout / bin tracking
Mark an item as permanently stored in:
- kitchen bin
- vehicle kit
- first-aid kit
- sleep tote
- backpack

The app can then say `verify kitchen bin is loaded` while still allowing the user to inspect sub-items.

### Weight tracking
Useful mainly for backpacking:
- item weight
- worn / carried / consumable
- total base weight
- per-person distribution

Do not clutter car-camping UI unless backpacking mode is active.

### Campsite comparison
Compare saved Site Ideas on explainable factors:
- drive time/distance
- cost
- amenities
- privacy/noise
- access difficulty
- vehicle/trailer suitability
- forecast
- fire/access/closure context
- recent verification
- user rating

Never hide the raw factors behind a single unexplained score.

### Reservation / permit integrations
Potential:
- deep links first
- saved reservation numbers/docs
- availability lookup where API/terms permit
- permit reminders

Avoid brittle scraping of reservation websites.

### Cell-coverage intelligence
Potential progression:
1. personal carrier/service notes on Site
2. community carrier reports
3. licensed/official coverage overlays if a suitable provider exists

### Water-source intelligence
Potential:
- saved local water waypoints
- source type
- treatment required
- seasonal/reliability notes
- last verified
- community reports later

Never label natural water as safe to drink solely from a crowdsourced report.

### Road-condition intelligence
Potential:
- user notes
- recent community condition reports
- closures
- seasonal access
- snow/mud/washout notes

Keep road **legal status** separate from **physical passability**.

### Gear maintenance reminders
Examples:
- recharge battery banks
- inspect first-aid expiration dates
- refill propane
- waterproof tent/rainfly
- inspect tires/spare
- service stove

### Photo attached to gear item
Useful for:
- identifying which item/version to pack
- bin/storage location
- replacement shopping

### QR codes for storage bins
Could open a bin/loadout record or mark the bin loaded.

### Barcode scanning
Possible for food/consumables or inventory entry, but not valuable enough to precede camping/navigation features.

---

## Advanced device/platform integrations

Only pursue after a separate feasibility review:
- Garmin / satellite messenger integration
- smartwatch trip status
- CarPlay / Android Auto companion
- native mobile wrapper
- background geofenced reminders
- camera-based campsite/gear capture

These may require native APIs, platform approvals, vendor APIs, or ongoing service costs.

---

## AI candidates

AI should remain optional and advisory.

Potential uses:
- checklist omission review
- summarize recent campsite reports
- compare Site Ideas using user-selected priorities
- turn natural-language trip plans into draft trip fields
- summarize weather/hazard data already fetched from authoritative sources
- suggest post-trip checklist improvements

Do **not** use AI as the source of truth for:
- weather
- fire status
- legal access
- road closures
- permits
- emergency guidance
- navigation position

---

## Ideas intentionally kept low priority

- grocery ordering integrations
- social feed / follower system
- gamification / badges
- public popularity leaderboards for hidden sites
- automatic public sharing of exact campsite coordinates
- ad-driven recommendation feeds

These add complexity or work against the local-first, low-friction camping goal.