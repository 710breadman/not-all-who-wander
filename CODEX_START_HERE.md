# Codex — Start Here

## Mission

Turn this handoff into a working, polished Camping PWA without redesigning the requirements from scratch.

## Execution rules

1. Read the handoff before coding.
2. Implement sprints in numeric order.
3. Keep the app runnable at the end of every sprint.
4. Prefer simple, durable architecture over clever architecture.
5. Preserve the checklist taxonomy unless a change is clearly necessary.
6. If a requirement is ambiguous, choose the least-complex behavior that preserves future extensibility and document the choice.
7. Do not promote items from `Extras` into core categories without a documented reason.
8. Do not add a cloud backend until the local-first product is solid.
9. Add tests with each behavior instead of postponing testing.
10. Update project documentation as implementation changes.

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
6. mark items Packed / Need to Buy / Not Needed,
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
