# Decisions

This file distinguishes confirmed direction from implementation assumptions.

## Confirmed product decisions

### D-001 — Main organization uses tabs
Primary checklist categories are tabs, not separate spreadsheet-style sections on one page.

### D-002 — Food is a tab
Food is organized into sections such as breakfast, lunch, dinner, snacks, drinks, condiments, and staples.

### D-003 — Gear is a tab
Gear includes at least:
- Shelter & Sleep
- Camp Kitchen
- Survival / Tools

Additional gear sections may be used where they reduce misclassification.

### D-004 — Clothes is a tab
Clothing remains separate from general gear.

### D-005 — Hygiene and First Aid are combined
Treat them as one tab with internal sections.

### D-006 — Extras is a tab
Unconfirmed or optional additions belong here instead of polluting the core list.

### D-007 — Item meaning clarifications
- torch = propane torch
- battery = battery bank
- ally = handheld gaming device
- gas = gasoline
- sauce = split into mayo, ketchup, BBQ sauce, hot sauce

### D-008 — Usage profile
Optimize for car camping while retaining some backpacking orientation.

### D-009 — Research is allowed to inform additions
Camping checklists, outdoor guidance, forums, and community discussions can inform `Extras` and taxonomy review.

## Implementation decisions for this handoff

### D-010 — Web/PWA over spreadsheet as the main product
Use a responsive installable web app as the primary experience. A spreadsheet can be an interoperability/export target, not the application model.

### D-011 — Local-first before sync
IndexedDB/local storage is sufficient for the first complete version. Build backup/restore before cloud sync.

### D-012 — One canonical primary category per item
Avoid duplicate checklist items across tabs. Use tags for secondary relationships.

### D-013 — Trip item snapshots
A trip gets a snapshot/copy of master inventory items so editing a later master item does not unexpectedly rewrite completed trip history.

### D-014 — Extras are reviewable
Custom and research-suggested items can stay in Extras until deliberately promoted.

### D-015 — React/Vite baseline
The application uses React, strict TypeScript, and Vite. Vitest covers unit behavior, Playwright covers critical browser flows, and `vite-plugin-pwa` builds the installable shell. Persistence remains behind an application-owned interface so Sprint 01 can add IndexedDB without coupling it to UI components.

### D-016 — Camping setup levels
Trip setup offers Camper / RV, Tent camping, and Backpacking levels. Camper and tent use the complete car-camping inventory; Backpacking uses the existing lightweight seed filter. Every trip remains editable after generation.
