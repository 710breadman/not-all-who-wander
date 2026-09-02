# UI / UX Specification

## Overall feel

The app should feel like a clean consumer checklist/shopping app, not a spreadsheet or admin dashboard.

Priorities:
- large tap targets
- minimal typing
- quick scanning
- low visual clutter
- obvious progress
- phone-first packing experience
- comfortable desktop inventory editing

## Home

### Header
- Camping
- settings / backup

### Active trip card
- trip name
- destination
- dates
- overall packed progress
- Continue Packing

### Trips
- New Trip
- recent/upcoming trips
- archive completed trip

### Master Inventory
A clear entry point, not buried in Settings.

## Trip screen

### Top area
- back
- trip name
- overall progress
- search
- one trip-actions burger menu for secondary tools

The burger menu groups checklist actions, planning and conditions, offline and
navigation tools, and sharing/export. Packing mode, weather, maps, waypoints,
safety, GPX, offline tools, and other secondary actions belong here so the
checklist remains the visual focus on a phone. The menu must fit the viewport,
scroll when needed, and close after a selection, an outside tap, or Escape.

### Meals

The trip menu opens a focused `Plan | Groceries | Meals` workspace. Plan leads
with trip day and meal slot, and always offers plain-text Quick Add. Saved-meal
details stay behind More details. Shortened trips keep out-of-range meals under
Extra days. Grocery rebuilds preserve user states and overrides. Missing cooking
gear is advisory and enters the checklist only after the user taps Add missing
gear. Plan and grocery views use a clean print layout with controls hidden.

### Tab bar
Scrollable if necessary:
- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras

Do not make the user open nested menus just to switch core categories.

### Section header
Shows:
- section name
- packed / applicable count
- collapse/expand

### Item row
Preferred layout:

```text
[status] Item name                  [-] 2 [+]
         optional small note/unit       [...]
```

Status must be visually obvious.

### Quick filters
- Remaining
- Need to Buy
- Packed
- All

### Add
Add Item is the first action in the trip burger menu.

## Packing mode

A simplified packing mode is desirable:
- hides most editing controls
- emphasizes Remaining items
- very large checkbox/status target
- progress always visible

Can be delivered after core list functionality.

## Need-to-buy view

Treat `Need to Buy` as a useful workflow, not just a color.

A filter should produce a shopping list across every tab.

## Quantity

Use:
- minus button
- quantity
- plus button

Direct numeric editing may be available from Edit.

Avoid forcing a modal for a one-step quantity adjustment.

## Master inventory screen

Desktop:
- denser searchable list
- category/section filters
- bulk archive optional later

Phone:
- cards/rows
- search
- filter chips

## Empty states

Examples:
- No items remaining in this section
- No Need-to-Buy items
- No trips yet

Each empty state should offer one obvious action.

## Accessibility

- semantic buttons
- keyboard usable
- visible focus
- adequate contrast
- labels not conveyed by color alone
- status controls accessible to screen readers

## Responsive breakpoints

Do not design separate applications.

Phone:
- bottom or top tab navigation
- single-column lists

Desktop:
- centered wide app shell
- more room for inventory controls
- optionally persistent trip sidebar if it genuinely helps

## Avoid

- spreadsheet grids on the main packing screen
- deeply nested navigation
- tiny checkboxes
- excessive animations
- forced accounts
- card-within-card visual clutter
