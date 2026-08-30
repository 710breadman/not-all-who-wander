# Data Model

The data model should remain simple but allow future quantity rules and sync.

## Entities

### AppSettings

```ts
type AppSettings = {
  schemaVersion: number;
  defaultTripStyle: "car" | "light-backpacking" | "custom";
  compactPackingMode: boolean;
};
```

### MasterItem

```ts
type ChecklistCategory =
  | "food"
  | "gear"
  | "clothes"
  | "hygiene-first-aid"
  | "extras";

type QuantityUnit =
  | "item"
  | "pack"
  | "box"
  | "bag"
  | "bottle"
  | "can"
  | "gallon"
  | "liter"
  | "serving"
  | "other";

type MasterItem = {
  id: string;
  name: string;
  category: ChecklistCategory;
  section: string;
  defaultQuantity: number;
  unit: QuantityUnit | string;
  tripStyles: Array<"car" | "light-backpacking" | "custom">;
  tags: string[];
  aliases?: string[];
  notes?: string;
  archived: boolean;
  source: "seed" | "user" | "research";
};
```

### Trip

```ts
type Trip = {
  id: string;
  name: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  camperCount: number;
  style: "car" | "light-backpacking" | "custom";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};
```

### TripItem

```ts
type TripItemStatus =
  | "not-packed"
  | "packed"
  | "need-to-buy"
  | "not-needed";

type TripItem = {
  id: string;
  tripId: string;
  masterItemId?: string;
  name: string;
  category: ChecklistCategory;
  section: string;
  quantity: number;
  unit: string;
  status: TripItemStatus;
  notes?: string;
  tags: string[];
  custom: boolean;
  sortOrder: number;
};
```

## Important behavior

### Snapshot rule
When a trip is created, selected MasterItems are copied into TripItems.

Later edits to the MasterItem do not silently change an existing TripItem.

### Promotion rule
A custom TripItem may be copied into MasterItem after explicit user action.

### Archive rule
Prefer archive/soft-delete for master data. Trip history should remain intact.

## Future quantity rules

Do not implement unless the simple fixed model is already stable.

Possible later structure:

```ts
type QuantityRule =
  | { kind: "fixed"; amount: number }
  | { kind: "per-person"; amount: number }
  | { kind: "per-day"; amount: number }
  | { kind: "per-person-per-day"; amount: number };
```

## Storage

v1:
- IndexedDB
- schema migrations
- JSON full backup

Avoid coupling components directly to IndexedDB. Put persistence behind a repository/service boundary so future cloud sync is possible.
