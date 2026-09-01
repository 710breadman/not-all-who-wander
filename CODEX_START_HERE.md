# Codex — Start Here

## Mission

Turn this handoff into a working, polished **Path A Logical (PAL)** camping PWA without redesigning the requirements or approved brand from scratch.

## Read first

Before coding, read:

1. `PROJECT_SPEC.md`
2. `ROADMAP.md`
3. `SPRINTS.md`
4. `BRAND_WORKSHOP.md`
5. `BRAND_TYPOGRAPHY.md`
6. `brand/IMPLEMENTATION.md`
7. `brand/tokens/brand-tokens.json`

## Execution rules

1. Read the handoff before coding.
2. Implement sprints in numeric order.
3. Keep the app runnable at the end of every sprint.
4. Prefer simple, durable architecture over clever architecture.
5. Preserve the checklist taxonomy unless a change is clearly necessary.
6. Preserve the locked green/red/yellow/gray checklist visual-status system.
7. Treat **Path A Logical** as the full brand name and **PAL** as the compact/app identity.
8. Do not redesign approved colors, typography, logo direction, or voice while implementing them.
9. If a requirement is ambiguous, choose the least-complex behavior that preserves future extensibility and document the choice.
10. Do not promote items from `Extras` into core categories without a documented reason.
11. Do not add a cloud backend until the local-first product is solid.
12. Add tests with each behavior instead of postponing testing.
13. Update project documentation as implementation changes.

## Brand implementation source of truth

- `brand/tokens/brand-tokens.css` — canonical CSS variables
- `brand/tokens/brand-tokens.json` — machine-readable tokens
- `brand/assets/` — scalable logo/icon sources
- `brand/IMPLEMENTATION.md` — implementation and acceptance checklist

Do not use **Path A Logic** or **Over Yonder** in user-facing copy. Canonical spelling is **Path A Logical**.

## Default technical direction

Use a modern TypeScript web stack suitable for a PWA. If the repository is empty, preferred default:

- React
- TypeScript
- Vite
- IndexedDB for local persistent app data
- a small state-management layer only if actually useful
- installable PWA manifest/service worker
- responsive CSS without an oversized component framework
- Vitest for unit tests
- Playwright for critical end-to-end flows

Alternatives are allowed only when they clearly reduce complexity.

## First implementation milestone

A user can:

1. launch the app,
2. create a trip,
3. see the five main tabs,
4. view the seeded checklist,
5. change item quantities,
6. mark items using the approved visual status system,
7. add a custom item,
8. close and reopen the app without losing state.

Do this before optional integrations.

## Completion behavior

After each sprint, update:

- `STATUS.md`
- `DECISIONS.md` when decisions changed
- tests
- relevant docs

If `STATUS.md` does not exist, create it.
