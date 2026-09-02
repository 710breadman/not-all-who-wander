# Firebase Offline-First Sync — Implementation Brief

## Goal

Add optional Firebase cloud sync to the camping app while keeping:

- app fully usable offline
- Firebase Spark/free tier as the target
- no required account
- no required server
- minimal Firestore reads/writes
- user data private by default
- simple recovery if a device is lost
- future support for shared trips and shared lists

Firebase is a sync/recovery layer.

Firebase is **not** the primary database.

---

# 1. Core Architecture

Use:

```text
UI
 ↓
Repository / Data Layer
 ↓
Local SQLite Database
 ↓
Sync Queue
 ↓
Firebase Firestore
```

The UI should never depend directly on Firebase.

All normal app operations must work against the local database.

Firebase sync happens separately.

---

# 2. Required Firebase Services

Implement only:

- Firebase Authentication
- Google Sign-In
- Cloud Firestore
- Firebase App Check
- Firebase Crashlytics if easy to add
- Firebase Performance Monitoring if easy to add

Optional later:

- Firebase Remote Config
- Firebase Cloud Messaging

DO NOT add yet:

- Cloud Functions
- Cloud Storage
- SMS authentication
- paid Firebase services
- server-side processing

Target Firebase plan:

```text
Spark / Free
```

Do not introduce a dependency that requires Blaze billing.

---

# 3. Account Behavior

Account must be optional.

Initial experience:

```text
Continue Offline

or

Sign in with Google
```

Offline users get all normal camping features.

Signing in enables:

```text
Cloud Sync
Automatic Backup
Restore on New Device
Multi-Device Sync
```

Do not lock existing local data behind account creation.

---

# 4. Local Database Is Source of Truth

Use the application's existing local database if suitable.

Otherwise use SQLite.

Store locally:

- profile
- app preferences
- gear inventory
- gear categories
- packing lists
- camping checklists
- food lists
- meal plans
- trips
- saved campsites
- favorites
- campsite notes
- GPS waypoints
- custom locations
- custom tags/categories
- user-created templates
- safety-related user data
- trip history
- GPX metadata
- other small user-created structured data

Do not require internet for any of these.

---

# 5. Do Not Sync Large/Recreatable Files

Keep these local:

- offline map tiles
- satellite imagery
- map cache
- weather cache
- radar cache
- large photos
- videos
- PDFs
- temporary files
- downloaded map packages

Firestore may store metadata about them.

Example:

```json
{
  "region": "Rocky Mountain National Park",
  "offlineInstalled": true,
  "version": 14
}
```

Do not upload the map itself.

---

# 6. Common Sync Metadata

Every syncable record should support:

```text
id
userId
createdAt
updatedAt
revision
deviceId
deletedAt
syncState
```

Recommended syncState values:

```text
clean
dirty
pending_delete
conflict
```

Use stable UUIDs generated locally.

Do not use Firestore-generated IDs if that makes offline creation harder.

---

# 7. Sync Queue

Create a local sync queue.

Example:

```text
sync_queue

id
entityType
entityId
operation
createdAt
attemptCount
lastAttemptAt
error
```

Operations:

```text
UPSERT
DELETE
```

User actions should:

```text
1. modify local database
2. update updatedAt + revision
3. mark record dirty
4. add/update sync queue entry
5. immediately update UI
```

Do NOT wait for Firebase.

---

# 8. Reduce Firebase Writes

Do not sync on every keystroke.

Bad:

```text
C → write
Co → write
Cof → write
Coff → write
Coffee → write
```

Correct:

```text
User edits
 ↓
Local autosave
 ↓
Debounce
 ↓
One cloud update
```

Sync triggers:

- user finishes editing
- short debounce period expires
- app moves to background
- network returns
- app starts and network is available
- manual "Sync Now"
- periodic low-frequency sync while app is active

Batch operations when practical.

---

# 9. Firestore Data Structure

Start with something similar to:

```text
users/
  {uid}/
    profile/
      main

    preferences/
      main

    gearLists/
      {listId}

    checklists/
      {listId}

    trips/
      {tripId}

    savedSites/
      {siteId}

    waypoints/
      {waypointId}

    mealPlans/
      {planId}

    templates/
      {templateId}
```

Prefer logical documents instead of turning every small field/item into a separate Firestore document.

Do not create huge documents.

Find a middle ground.

Example:

A packing list with 30 simple items may reasonably live in one document.

A large object with lots of independent editing may use a collection.

---

# 10. Delta Sync

Do not download all user data during every sync.

Track:

```text
lastSuccessfulSync
```

Pull records where:

```text
updatedAt > lastSuccessfulSync
```

Then:

```text
1. pull remote changes
2. merge with local
3. push local dirty records
4. resolve conflicts
5. update lastSuccessfulSync
```

Persist the sync timestamp locally.

---

# 11. Conflict Resolution

Implement simple deterministic conflict handling.

Initial strategy:

```text
Higher revision wins.

If revisions equal:
newest updatedAt wins.
```

For potentially destructive conflicts, retain the losing version locally if practical.

Never silently erase large amounts of user data.

Future collaborative lists may need item-level conflict handling.

Do not over-engineer collaborative sync in V1.

---

# 12. Soft Delete / Recently Deleted

Do not immediately destroy synced records.

Delete should become:

```text
deletedAt = timestamp
syncState = pending_delete
```

Provide:

```text
Settings / Data / Recently Deleted
```

Allow:

```text
Restore
Delete Permanently
```

Do not rely on paid Firestore TTL features.

Client can clean old deleted items.

Suggested retention:

```text
30 days
```

Make retention configurable in code.

---

# 13. Full Manual Export

Firebase sync is not enough for disaster recovery.

Add:

```text
Settings
  Data
    Export My Data
    Import Backup
```

Export a portable archive such as:

```text
over-yonder-backup.zip

manifest.json
profile.json
preferences.json
gear.json
lists.json
trips.json
sites.json
waypoints.json
templates.json
```

Include:

```text
schemaVersion
appVersion
createdAt
```

Import must validate schema before changing local data.

Provide:

```text
Merge
Replace Local Data
Cancel
```

if practical.

Never destroy the current database before validating the backup.

---

# 14. Google Sign-In

Implement Firebase Authentication with Google.

After first login:

```text
1. authenticate
2. determine whether Firebase data exists
3. determine whether local data exists
```

Cases:

### No local data + cloud data exists

Offer:

```text
Restore Cloud Data
Start Fresh
```

### Local data exists + no cloud data

Offer:

```text
Enable Cloud Sync
```

Upload local records.

### Both exist

Run merge/sync.

Do not blindly replace one with the other.

---

# 15. Cloud Sync Settings UI

Create:

```text
Settings
  Cloud & Backup
```

Example:

```text
Cloud Sync

Status:
Connected as user@gmail.com

Automatic Sync        [ON]

Last Sync
Today, 6:32 AM

[ Sync Now ]

Data Protection

[ Export My Data ]
[ Import Backup ]
[ Recently Deleted ]

Account

[ Disconnect Google ]
```

Disconnected state:

```text
Cloud Sync

Keep your lists, trips, gear and settings
backed up and synchronized between devices.

[ Sign in with Google ]

Cloud sync is optional.
The app works normally without an account.
```

---

# 16. Security Rules

Users must only access their own data.

Base rule concept:

```text
request.auth != null
&& request.auth.uid == userId
```

Apply ownership checks to every user-owned collection.

Never use:

```text
allow read, write: if true;
```

in production.

Add emulator/security-rule tests.

Test at minimum:

```text
anonymous user cannot read user data
anonymous user cannot write user data
user A can read user A
user A can write user A
user A cannot read user B
user A cannot write user B
```

---

# 17. Firebase App Check

Enable App Check.

Use the recommended platform provider.

Development builds must have a documented debug/dev configuration.

Production builds must enforce App Check after testing.

Do not break local development.

---

# 18. Network Behavior

The app must tolerate:

```text
no internet
weak internet
connection dropping during sync
Firebase unavailable
authentication expired
device going to sleep
app being killed during sync
```

Failed sync must:

```text
keep local data
keep queue
record error
retry later
```

Do not show scary error messages for normal offline behavior.

Example:

```text
Offline
Changes will sync when connected.
```

---

# 19. Sync Status

Expose simple states:

```text
Offline
Synced
Syncing
Changes Pending
Sync Error
```

Do not constantly refresh/re-render the full UI because sync status changed.

Only update affected components.

---

# 20. Logging

Add structured logs for:

```text
sync start
sync finish
records pulled
records pushed
conflicts
auth changes
queue size
failed writes
failed reads
retry attempts
sync duration
```

Do not log:

```text
authentication tokens
passwords
private notes
precise sensitive user content
```

---

# 21. Free-Tier Protection

Build around keeping Firebase usage small.

Rules:

```text
local reads first
no unnecessary listeners
no full-database refreshes
delta sync
debounced writes
batch writes
cache results
close listeners when screens close
do not listen to every user collection permanently
```

Realtime listeners should only exist where realtime behavior provides real value.

Example future use:

```text
currently open shared trip
```

Not:

```text
entire user database forever
```

---

# 22. Future Shared Trips

Design schemas so this can later be added without rewriting the entire local data system.

Potential future structure:

```text
sharedTrips/
  {tripId}/
    metadata
    members/
    packingList/
    meals/
    itinerary/
    campsite/
```

Roles could eventually include:

```text
owner
editor
viewer
```

Do NOT build the full collaboration system now.

Only avoid architecture choices that make it difficult later.

---

# 23. Migration

Existing users must keep their current data.

If introducing SQLite or schema changes:

```text
1. detect old schema
2. create backup
3. migrate
4. validate
5. mark migration complete
```

Do not force an existing user to sign in.

Do not wipe local data.

---

# 24. Testing

Add tests for:

## Local

- CRUD works offline
- app restart preserves data
- deleted data enters trash
- backup export works
- backup import works

## Authentication

- Google login
- logout
- expired auth
- account switch

## Sync

- new local record uploads
- remote record downloads
- local edit uploads
- remote edit downloads
- simultaneous modification
- delete sync
- restore deleted record
- duplicate prevention

## Network

- launch offline
- lose network mid-sync
- reconnect
- Firebase timeout
- retry
- app killed during pending sync

## Security

- cross-user access blocked
- unauthenticated access blocked
- App Check behavior tested

---

# 25. Implementation Order

Implement in this order.

## Sprint 1 — Local Data Foundation

- inspect current persistence system
- create/normalize local data repository
- add sync metadata fields
- add schema migrations
- ensure entire app works offline

Do not start Firebase until local data is reliable.

## Sprint 2 — Firebase Foundation

- Firebase project configuration
- Authentication
- Google login
- Firestore
- security rules
- App Check
- development configuration

## Sprint 3 — Sync Engine

- sync queue
- dirty-record tracking
- push changes
- pull delta changes
- retries
- sync state
- network awareness

## Sprint 4 — Conflict + Delete Protection

- revision handling
- deterministic conflict resolution
- soft delete
- Recently Deleted
- restore

## Sprint 5 — Cloud UI

- Google sign-in screen
- Cloud & Backup settings
- sync status
- Sync Now
- disconnect account
- first-login restore/merge flow

## Sprint 6 — Export / Import

- versioned JSON backup
- ZIP archive
- schema validation
- safe import
- failure recovery

## Sprint 7 — Hardening

- security tests
- offline tests
- migration tests
- sync stress testing
- App Check enforcement
- logging
- Crashlytics
- performance review

## Sprint 8 — Usage Optimization

Measure:

```text
reads/session
writes/session
sync frequency
average queue size
sync duration
```

Remove wasteful Firebase operations.

Target Spark/free-tier operation.

---

# 26. Acceptance Criteria

Feature is complete only when:

- [ ] user can use app without an account
- [ ] app works with zero internet
- [ ] user can optionally sign in with Google
- [ ] local data syncs to Firestore
- [ ] second device can recover the user's data
- [ ] Firebase failure cannot destroy local data
- [ ] sync resumes after reconnection
- [ ] writes are debounced/batched
- [ ] synchronization uses deltas
- [ ] cross-user Firestore access is blocked
- [ ] deleted records can be restored
- [ ] full manual export works
- [ ] full manual import works
- [ ] existing user data survives migration
- [ ] no required paid Firebase service exists
- [ ] app remains inside Spark-compatible architecture
- [ ] automated tests cover critical sync paths

---

# 27. Hard Rules

DO NOT:

- redesign unrelated parts of the app
- make Firebase the primary local data store
- require internet
- require login
- require Blaze billing
- add Cloud Functions
- add Firebase Storage
- upload offline map tiles
- sync caches
- write on every keystroke
- continuously read whole collections
- permanently listen to the entire database
- wipe data during login
- wipe data during migration
- silently resolve destructive conflicts
- weaken Firestore security rules

Prefer simple, boring, testable code.

---

# 28. Codex Workflow

Before changing code:

1. inspect existing project architecture
2. identify framework/platform
3. identify current persistence layer
4. identify existing account/auth code
5. identify existing data models
6. identify tests
7. identify migrations
8. write a short implementation plan

Then implement sprints in order.

After each sprint:

```text
build
test
fix failures
document changes
commit logical unit
continue
```

Do not skip failing tests to move forward.

If existing architecture conflicts with this specification, preserve the goals and choose the smallest safe adaptation.

At completion, report:

```text
IMPLEMENTATION REPORT

[ ] Sprint 1
[ ] Sprint 2
[ ] Sprint 3
[ ] Sprint 4
[ ] Sprint 5
[ ] Sprint 6
[ ] Sprint 7
[ ] Sprint 8

Files added:
Files modified:
Database migrations:
Firebase configuration:
Security rules:
Tests added:
Tests passing:
Known limitations:
Free-tier risks:
Recommended next sprint:
```

Primary priorities, in order:

```text
1. Never lose user data.
2. Work offline.
3. Stay free.
4. Keep sync simple.
5. Keep Firebase usage low.
6. Make cloud features optional.
7. Leave room for shared trips later.
```