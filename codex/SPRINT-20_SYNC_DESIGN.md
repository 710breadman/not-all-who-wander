# Sprint 20 sync foundation

## Decision

IndexedDB remains Path A Logical's source of truth. Firebase is optional
transport and recovery only. A user can keep using the whole app offline and
without an account.

The v8 local migration adds a per-profile store plus `syncMetadata`,
`syncQueue`, and `syncConflicts`. Queue entries are keyed by entity type and
stable local UUID, so repeated edits replace one pending entry instead of
creating a write for each keystroke.

## Current safe scope

Only user-created master inventory is approved for the first Firestore adapter.
It is the sole serializer in `src/application/syncService.ts`, uses explicit
pull-before-push sync through `src/infrastructure/firestoreSyncClient.ts`, and
is protected by the matching `firestore.rules` path. The queue is local and
does not upload anything until the signed-in user explicitly enables this scope.

The following remain local until a separate opt-in, payload review, rules, and
emulator test are added: trips and free-form trip notes, locations/sites,
waypoints, GPX/routes/tracks, weather/cache, offline maps and packs, emergency
details, vehicle details, medical notes, profile email/password hashes, and
all shared-trip data.

## Sync behavior

When an approved scope is explicitly enabled for one Firebase UID, a local
write, sync metadata update, and coalesced queue update use one IndexedDB
transaction. Failed cloud work retains the local record and queue entry,
records an error/attempt count, and can retry later. The queue is bound to a
single UID, so an account switch cannot reassign pending work.

V1 conflict selection is deterministic: higher revision wins, then newer
timestamp. The caller must retain the losing version in `syncConflicts` before
applying a destructive merge.

## Before production sync

1. Add the Firebase project public configuration and authorized domains. Run
   `npm run test:firebase-rules`; its emulator tests cover unauthenticated and
   cross-user denial plus valid/malformed documents.
2. Review each new payload's privacy boundary and add a narrow serializer plus
   matching Firestore rules; never serialize `Trip` wholesale.
3. Implement pull cursors using server ordering plus document-ID tie-breakers,
   not client clocks alone.
4. Validate Google sign-in and staged App Check on the Android WebView before
   enforcing App Check in production.
