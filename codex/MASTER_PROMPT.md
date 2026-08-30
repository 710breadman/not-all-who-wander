# Master Codex Prompt

You are implementing the Camping project in this repository.

Treat the handoff documents as the product contract.

## Read first

Read, in order:

1. CODEX_START_HERE.md
2. PROJECT_SPEC.md
3. DECISIONS.md
4. CHECKLIST_TAXONOMY.md
5. DATA_MODEL.md
6. UI_UX_SPEC.md
7. SPRINTS.md
8. ACCEPTANCE_TESTS.md
9. IMPLEMENTATION_NOTES.md
10. data/checklist_seed.json

## Objective

Build a polished, local-first, installable Camping PWA optimized for car camping while retaining a light-backpacking mode.

The main trip tabs must be:

- Food
- Gear
- Clothes
- Hygiene & First Aid
- Extras

## Mandatory clarified data

- torch means propane torch
- battery means battery bank
- ally means handheld gaming device
- gas means gasoline
- do not keep a generic Sauce item
- use separate Mayonnaise, Ketchup, BBQ Sauce, and Hot Sauce items

## Execution

Work through `SPRINTS.md` in order.

For each sprint:

1. inspect the current repository,
2. implement only the required scope plus necessary plumbing,
3. add/update tests,
4. run lint/typecheck/tests/build,
5. fix failures,
6. update STATUS.md,
7. update DECISIONS.md only when a real decision changes,
8. report a concise checklist of completed work and remaining blockers.

Do not jump to cloud sync, AI, maps, weather, or Google Sheets before the core local-first app is complete.

## UX rule

The packing UI should be faster and clearer than a spreadsheet. Do not recreate a spreadsheet grid.

## Ambiguity rule

Do not stall on minor ambiguity.

Choose the simplest implementation consistent with the handoff, record the assumption in DECISIONS.md, and continue.

Ask for user input only when the choice is destructive, security-sensitive, expensive, or would materially change the product direction.
