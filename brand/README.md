# Path A Logical (PAL) — Production Brand Asset Pack

Canonical full brand: **Path A Logical**  
Compact/app identity: **PAL**

## Included

- Editable SVG source marks and wordmark lockup
- Canonical brand/token definitions
- Android adaptive-icon implementation notes
- Locked checklist semantic colors

## Typography

- Display/headings: **Lora SemiBold**
- UI/body: **Inter**
- Script accent: **Caveat Regular**

Font binaries are intentionally not committed here. During implementation, use appropriately licensed copies from their official source and bundle them locally so the offline-first app does not depend on a network font request.

The script font is an accent only. Do not use it for controls, body copy, warnings, dense data, maps, or long paragraphs.

## Checklist status colors — permanent

- Green `#2F7D4A` = Complete
- Red `#C94A3A` = Missing
- Yellow `#D9A321` = Partial / Maybe
- Gray `#8A8D85` = Not needed

Never communicate state by color alone; pair with icon/shape/text.

## Production note

The SVG sources here are deliberately simpler than the concept-board illustration so they remain legible at small sizes. Use `brand/tokens/brand-tokens.css` and `brand/tokens/brand-tokens.json` as the implementation source of truth.

Before public release, run final trademark/name/logo-similarity clearance.
