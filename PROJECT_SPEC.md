# Project Specification

## 1. Goal

Create a camping planning and packing app that replaces a manually maintained checklist/spreadsheet with a cleaner, faster, reusable system.

The product should reduce three common failures:

1. forgetting an item,
2. bringing the wrong quantity,
3. having a checklist that is so cluttered it becomes annoying to use.

## 2. Product principles

### Local-first
The app must remain useful without internet service.

### Reusable
The master inventory survives across trips. A trip is a generated/edited snapshot, not the only copy of the data.

### Fast
Common packing actions should require one tap.

### Flexible
The structure should work for car camping first, but allow lighter backpacking-oriented trips.

### Clear
Items belong in one primary place. Cross-cutting concepts should use tags rather than duplicate entries.

## 3. Main navigation

### Home / Trips
Shows:
- active trip
- upcoming/recent trips
- create trip
- master inventory
- settings/import/export

### Within a trip
Use the following primary tabs:

1. Food
2. Gear
3. Clothes
4. Hygiene & First Aid
5. Extras

A compact All Items view may exist as a filter, but it should not replace the tabs.

## 4. Trip setup

Minimum fields:
- trip name
- destination/location text
- start date
- end date
- number of campers
- trip style:
  - Car Camping
  - Light Backpacking
  - Custom
- optional notes

Useful derived value:
- trip nights

Future-ready fields:
- adults
- children
- pets
- expected low/high temperature
- rain probability
- campsite amenities

Do not require future-ready fields in v1.

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

At minimum, support fixed quantities.

Data model should also be capable of future rule-based defaults:
- per person
- per day
- per trip

Example:
- sleeping bag: 1 per person
- water: quantity can later depend on people × days
- tent: fixed per trip

Do not overbuild the rules engine in v1.

## 8. Packing workflow

The high-value workflow is:

1. Create trip.
2. App copies relevant master items into the trip.
3. User adjusts quantities / removes irrelevant items.
4. User marks `Need to Buy` while preparing.
5. During packing, user marks `Packed`.
6. Progress is visible globally and per tab.
7. At the end of the trip, custom additions can optionally be promoted into the master inventory.

## 9. Search and filters

Minimum:
- search by item name
- filter by status
- filter current tab/section
- show only remaining
- show only Need to Buy

Nice-to-have:
- search aliases
- tag filters
- backpacking compatibility filter

## 10. Offline / installability

The app should:
- be installable as a PWA
- load after prior installation without network
- persist trip/checklist data locally
- avoid requiring login for v1

## 11. Import/export

v1:
- JSON backup/restore
- CSV export of a trip checklist

Later:
- CSV import
- Google Sheets bridge
- cloud sync

## 12. Out of scope for core v1

Do not block v1 on:
- user accounts
- social sharing
- cloud sync
- maps APIs
- weather APIs
- campsite reservation APIs
- barcode scanning
- AI recommendations
- automatic grocery ordering

These belong in later sprints / Extras.
