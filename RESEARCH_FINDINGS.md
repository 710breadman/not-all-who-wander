# Research Findings

Research is used to check omissions and improve the `Extras` pool. It is not permission to dump every possible camping item into the core checklist.

## Sources reviewed

### REI — Camping Essentials Checklist
REI's 2026 checklist separates core campsite gear, kitchen, clothing, hygiene, sun/bug protection, tools/repair, personal items, and optional extras.

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

### Reddit / r/camping — easily forgotten items
Recurring community suggestions include:
- a dedicated camp can opener
- toilet paper even when a campground advertises bathrooms
- extra batteries
- making checklist updates immediately after discovering a forgotten item

Thread:
https://www.reddit.com/r/camping/comments/xeadup/

### Reddit / r/CampingGear — car camping essentials
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

### Reddit / r/camping — "what would I be stuck without?"
A highly practical car-camping addition is a battery jump pack, because campsite use can accidentally drain a vehicle battery.

Thread:
https://www.reddit.com/r/camping/comments/16uhj39/

### Reddit / r/CampingandHiking — forgotten item discussion
Toilet paper remains one of the most repeated "bring it anyway" items, even at developed campgrounds.

Thread:
https://www.reddit.com/r/CampingandHiking/comments/1r1c0ru/

## Taxonomy conclusions

### Move/keep in core
These are common enough and cleanly categorized:
- can opener -> Gear / Camp Kitchen
- toilet paper -> Hygiene & First Aid / Hygiene
- battery bank -> Gear / Power & Electronics
- jumper pack -> Gear / Survival / Tools
- extra batteries -> Gear / Power & Electronics or attached accessory note
- trash bags -> Gear / Camp Kitchen
- repair tape/cord -> Gear / Survival / Tools

### Keep in Extras or conditional
These depend heavily on trip/campsite:
- camp rug
- tablecloth/clips
- hammock
- binoculars
- field guides
- portable shower
- extension cord
- campsite electrical adapters
- games/toys
- pet gear
- activity-specific equipment

## Product insight from community discussions

The strongest pattern is not a single missing item. It is **dependency forgetting**:
- flashlight without batteries
- food without a way to cook/open it
- tarp without cord/attachment hardware
- coffee without the maker/fuel/water/cup

Future enhancement:
support optional `requires` / dependency links between MasterItems and warn when one item is included but its dependency is omitted.

Do not block v1 on this feature; capture it in `POSSIBLE_ADDITIONS.md`.
