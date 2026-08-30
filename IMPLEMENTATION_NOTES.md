# Implementation Notes

## Architecture

Recommended layers:

```text
UI
  -> application services
      -> repositories
          -> IndexedDB
```

Keep persistence details out of UI components.

## Seed lifecycle

1. Ship `data/checklist_seed.json`.
2. On first run, import it.
3. Store `seedVersion`.
4. On later app releases, migrations may add newly introduced seed items without overwriting user edits.
5. User-created items always win over automatic seed replacement.

## IDs

Use UUIDs or stable prefixed IDs.

Seed IDs should be stable across releases.

## Search

Search:
- name
- aliases
- tags

Normalize case and whitespace.

## Progress calculation

Applicable items:
- exclude `not-needed`

Packed progress:
- `packed / applicable`

Need-to-Buy is not Packed.

## Ordering

Default:
1. section-defined order
2. item sortOrder
3. name as final stable fallback

Allow manual ordering later; do not make drag-and-drop a v1 dependency.

## Error handling

Backup restore and schema migration are the highest-risk operations.

Never partially overwrite working data on a failed restore:
1. validate file
2. parse to temporary structures
3. verify schema
4. perform transaction
5. report success/failure

## Logging

Developer diagnostics should be useful but unobtrusive.

Do not log private checklist notes to remote services in v1.

## Future sync

If sync is added later, TripItem snapshot semantics must remain explicit. Avoid silently resolving conflicts by overwriting local values.
