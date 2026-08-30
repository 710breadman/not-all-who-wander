# Acceptance Tests

These are product-level checks, not a substitute for unit tests.

## A-001 — App boot
Given a fresh install,
when the app is opened,
then it loads without requiring an account.

## A-002 — Seed taxonomy
Given seed data,
when the master inventory is viewed,
then the primary categories are:
- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras

## A-003 — Clarified names
Seed data must:
- contain `Propane Torch`
- contain `Battery Bank`
- contain a handheld gaming device entry
- treat gas as gasoline where used
- contain Mayonnaise, Ketchup, BBQ Sauce, Hot Sauce
- not contain a generic `Sauce` item

## A-004 — Trip creation
Given no existing trips,
when a valid trip name and camper count are entered,
then a trip is created and persists after reload.

## A-005 — Trip snapshot
Given a created trip,
when a linked MasterItem is renamed later,
then the existing TripItem name does not silently change.

## A-006 — Status
Given a trip item,
when status is changed to Packed,
then the status remains Packed after reload.

## A-007 — Need to Buy
Given items across multiple tabs,
when several are marked Need to Buy,
then the Need-to-Buy filter/view returns all relevant items.

## A-008 — Quantity
Given a trip item quantity of 1,
when plus is pressed twice,
then the quantity is 3 and persists.

## A-009 — Not Needed
Given an included trip item,
when marked Not Needed,
then it is excluded from "remaining to pack" progress.

## A-010 — Custom item
Given a trip,
when a custom item is added without choosing a category,
then it defaults to Extras.

## A-011 — Promotion
Given a custom Extras item,
when Promote to Master is chosen,
then the item becomes available for future trip generation.

## A-012 — Search
Given an item with an alias,
when the alias is searched,
then the item can be found in Master Inventory.

## A-013 — Backup
Given several trips and user-created master items,
when JSON backup is exported and restored into a fresh database,
then representative records and statuses are restored.

## A-014 — Offline
Given the app has previously loaded successfully,
when network access is removed,
then the installed PWA opens and allows packing updates.

## A-015 — Mobile layout
At a narrow phone viewport,
the user can:
- switch tabs
- change status
- change quantity
- add an item
without horizontal scrolling.

## A-016 — Backpacking orientation
Given Light Backpacking trip style,
when a trip is generated,
then car-only comfort/electronics items tagged as car-only are excluded by default.

## A-017 — Data integrity
No physical seed item appears as duplicate active MasterItems solely because it could conceptually belong to two categories.
