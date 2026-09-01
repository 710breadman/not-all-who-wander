# PAL brand implementation handoff

This file turns the approved brand workshop into implementation tasks for Codex.

## Source of truth

Use these in this order:

1. `BRAND_WORKSHOP.md` — approved brand decisions
2. `BRAND_TYPOGRAPHY.md` — typography rules
3. `brand/tokens/brand-tokens.json` — machine-readable values
4. `brand/tokens/brand-tokens.css` — web CSS variables
5. `brand/assets/` — canonical scalable logo/icon sources

Do not redesign the brand while implementing it.

## Web / PWA

- Import `brand/tokens/brand-tokens.css` once at the app root.
- Use `--pal-font-ui` for normal UI text.
- Use `--pal-font-display` for deliberate display/headline moments only.
- Use `--pal-font-script` only for short decorative accents; never use it in controls, body copy, warnings, maps, dense data, or accessibility-critical content.
- Replace legacy PWA icon files with exports rendered from `brand/assets/pal-app-icon.svg`.
- Replace legacy favicon assets with exports rendered from `brand/assets/pal-favicon.svg`.
- Keep the full wordmark out of tiny UI placements; use PAL or the mark instead.

## Android

- Render the approved PAL icon into Android launcher densities from `brand/assets/pal-app-icon.svg`.
- Use Evergreen `#24452F` as the adaptive background.
- Use a transparent foreground export based on the PAL mark/icon, keeping essential content inside the adaptive safe zone.
- `brand/android/` contains reference XML; do not point production resources at missing files.
- Verify circle, squircle, rounded-square, and other adaptive masks before release.

## Checklist status system — non-negotiable

Preserve these semantic statuses everywhere checklists appear:

- Complete: `#2F7D4A`
- Missing: `#C94A3A`
- Partial / Maybe: `#D9A321`
- Not needed: `#8A8D85`

Every status must have a non-color cue such as an icon, ring/fill treatment, and accessible label.

Keep checklist-status semantics separate from hazard/emergency colors.

## Acceptance checks

Before calling the branding implementation complete:

- [ ] App identifies itself as **Path A Logical** on first/public exposure.
- [ ] Compact identity uses **PAL**.
- [ ] No remaining user-facing **Over Yonder** name.
- [ ] No accidental `Path A Logic` spelling; canonical name is **Path A Logical**.
- [ ] Field Guide color tokens are used instead of ad-hoc near-duplicates for new brand work.
- [ ] Green/red/yellow/gray checklist statuses remain available and understandable without color alone.
- [ ] Light and dark modes retain adequate contrast.
- [ ] Script font appears only in short decorative accents.
- [ ] PAL icon is legible at 48 px and simplified favicon is legible at 16 px.
- [ ] PWA icons, favicon, and Android launcher icons are regenerated from canonical sources.
- [ ] No font depends on a live network request for offline use.

## Release gate

Brand implementation does not constitute legal clearance. Trademark, app-store name, domain/handle, and logo-similarity checks remain required before public release.
