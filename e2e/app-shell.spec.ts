import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";

async function chooseTripAction(page: Page, name: string): Promise<void> {
  const opener = page.getByRole("button", { name: "Open trip menu" });
  await opener.click();
  const menu = page.getByRole("navigation", { name: "Trip actions" });
  if (!(await menu.isVisible())) await opener.click();
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.top >= 0;
    }),
  ).toBe(true);
  await menu.getByRole("button", { name, exact: true }).click();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

function rasterPmtilesFixture(): Buffer {
  const tile = Buffer.from([137, 80, 78, 71]);
  const directory = Buffer.from([1, 0, 1, tile.length, 1]);
  const metadata = Buffer.from("{}");
  const tileOffset = 127 + directory.length + metadata.length;
  const header = Buffer.alloc(127);
  header.write("PMTiles"); header[7] = 3; header[96] = 1; header[97] = 1; header[98] = 1; header[99] = 2; header[100] = 0; header[101] = 20;
  const uint64 = (offset: number, value: number) => { header.writeUInt32LE(value, offset); header.writeUInt32LE(0, offset + 4); };
  uint64(8, 127); uint64(16, directory.length); uint64(24, 127 + directory.length); uint64(32, metadata.length); uint64(40, tileOffset); uint64(48, 0); uint64(56, tileOffset); uint64(64, tile.length); uint64(72, 1); uint64(80, 1); uint64(88, 1);
  header.writeInt32LE(-1800000000, 102); header.writeInt32LE(-850511290, 106); header.writeInt32LE(1800000000, 110); header.writeInt32LE(850511290, 114);
  return Buffer.concat([header, directory, metadata, tile]);
}

test("a user can create a trip and view its checklist", async ({ page, context }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Path A Logical" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await expect(
    page.getByRole("dialog", { name: "New camping trip" }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: /tent camping/i }),
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "Trip name" })
    .fill("Redwoods weekend");
  await page.getByRole("textbox", { name: "Destination" }).fill("Fern Canyon");
  await page.getByRole("button", { name: "Create checklist" }).click();
  await expect(
    page.getByRole("heading", { name: "Redwoods weekend" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Checklist categories" })
      .getByRole("button"),
  ).toHaveCount(6);
  await expect(page.getByRole("button", { name: "Weather", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open trip menu" }).click();
  await page.getByRole("button", { name: "Close trip menu" }).click({ position: { x: 4, y: 4 } });
  await expect(page.getByRole("navigation", { name: "Trip actions" })).toHaveCount(0);
  await chooseTripAction(page, "+ Add item");
  await expect(page.getByRole("dialog", { name: "Add a new item" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Edit trip");
  await expect(page.getByRole("dialog", { name: "Edit trip" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Trip safety");
  await expect(
    page.getByRole("dialog", { name: "Trip safety & preflight" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "fuel" }).check();
  await page.getByRole("button", { name: "Save preflight" }).click();
  await chooseTripAction(page, "Waypoints");
  await expect(page.getByRole("dialog", { name: "Local waypoints" })).toBeVisible();
  await page.getByRole("button", { name: "+ Save a spot" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Fern Canyon trailhead");
  await page.getByRole("spinbutton", { name: "Latitude" }).fill("41.4");
  await page.getByRole("spinbutton", { name: "Longitude" }).fill("-124.1");
  await page.getByRole("button", { name: "Save waypoint" }).click();
  await expect(page.getByText("Fern Canyon trailhead", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Record track");
  await expect(page.getByRole("dialog", { name: "Track recording" })).toContainText(/never begins automatically/i);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Offline maps");
  await expect(page.getByRole("dialog", { name: "Offline map regions" })).toContainText(/PMTiles archive/i);
  const archive = rasterPmtilesFixture();
  await page.route("https://maps.example/test.pmtiles", (route) => route.fulfill({ status: 200, body: archive, headers: { "Content-Length": String(archive.length), "Content-Type": "application/vnd.pmtiles" } }));
  await page.getByRole("textbox", { name: "Licensed raster PMTiles HTTPS URL" }).fill("https://maps.example/test.pmtiles");
  await page.getByRole("checkbox", { name: /license permits offline downloading/i }).check();
  await page.getByRole("button", { name: "Download region" }).click();
  await expect(page.getByRole("dialog", { name: "Offline map regions" })).toContainText(/ready for airplane-mode use/i);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Offline trip pack");
  await expect(page.getByRole("dialog", { name: "Offline trip packs" })).toContainText(/private medical notes are never included/i);
  await page.getByRole("button", { name: "Prepare offline pack" }).click();
  await expect(page.getByRole("dialog", { name: "Offline trip packs" })).toContainText(/ready for offline use/i);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "GPX routes & tracks");
  await expect(page.getByRole("dialog", { name: "GPX routes and tracks" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Safety layers");
  await expect(page.getByRole("dialog", { name: "Safety and access layers" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Discover sites");
  await expect(page.getByRole("dialog", { name: "Official campsite discovery" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Map");
  await expect(page.getByRole("dialog", { name: "Trip map" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Trip map" })).toContainText(/rendering from its local PMTiles archive/i);
  await context.setOffline(false);
  await page.getByRole("dialog", { name: "Trip map" }).getByRole("button", { name: "Close dialog" }).evaluate((button) => (button as HTMLElement).click());
  await expect(page.getByRole("dialog", { name: "Trip map" })).toHaveCount(0);
  await chooseTripAction(page, "Weather");
  await expect(page.getByRole("dialog", { name: "Weather forecast" })).toContainText(/Add destination coordinates/i);
  await page.getByRole("dialog", { name: "Weather forecast" }).getByRole("button", { name: "Close dialog" }).click();
  await chooseTripAction(page, "Share trip");
  await expect(page.getByRole("dialog", { name: "Share Redwoods weekend" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  const download = page.waitForEvent("download");
  await chooseTripAction(page, "Export checklist CSV");
  await download;
  await chooseTripAction(page, "Save site idea");
  await expect(page.getByText(/Saved Fern Canyon as a site idea/i)).toBeVisible();
  await chooseTripAction(page, "Packing mode");
  await expect(
    page.locator("main.app-shell"),
  ).toHaveClass(/packing-mode/);
  await page.getByRole("button", { name: "Open trip menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Trip actions" }).getByRole("button", { name: "Exit packing mode" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Trip actions" })).toHaveCount(0);
});

test("the loaded app remains usable while offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Path A Logical" }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await expect(
    page.getByRole("dialog", { name: "New camping trip" }),
  ).toBeVisible();
});

test("application shell fits the configured viewport", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
});

test("a camper can quick-plan meals and manage groceries offline", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await page.getByRole("textbox", { name: "Trip name" }).fill("Meal test weekend");
  await page.getByLabel("Start date").fill("2026-09-04");
  await page.getByLabel("End date").fill("2026-09-06");
  await page.getByRole("button", { name: "Create checklist" }).click();
  await chooseTripAction(page, "Meals");
  const planner = page.getByRole("dialog", { name: "Meals" });
  await expect(planner).toBeVisible();
  await planner.getByRole("button", { name: /Breakfast for Fri, Sep 4: unplanned/i }).click();
  await planner.getByRole("textbox", { name: "Quick Add" }).fill("Eat in town");
  await planner.getByRole("button", { name: "Save", exact: true }).click();
  await expect(planner.getByRole("button", { name: /Breakfast for Fri, Sep 4: Eat in town/i })).toBeVisible();
  await planner.getByRole("button", { name: "Meals", exact: true }).click();
  await planner.getByRole("button", { name: "+ Create meal" }).click();
  await planner.getByRole("textbox", { name: "Name", exact: true }).fill("Camp tacos");
  await planner.getByRole("checkbox", { name: "Favorite" }).check();
  await planner.getByText("More details").click();
  await planner.getByLabel(/Ingredients/).fill("Tortillas | 8 | count | Pantry | yes");
  await planner.getByLabel(/Required equipment/).fill("Camp griddle");
  await planner.getByLabel("Prep at home").fill("Dice the peppers");
  await planner.getByRole("button", { name: "Save meal" }).click();
  await planner.getByRole("button", { name: "Plan", exact: true }).click();
  await planner.getByRole("button", { name: /Dinner for Sat, Sep 5: unplanned/i }).click();
  await planner.getByRole("button", { name: "Camp tacos", exact: true }).click();
  await expect(planner.getByRole("button", { name: /Dinner for Sat, Sep 5: Camp tacos/i })).toBeVisible();
  await expect(planner.getByText(/Camp tacos:.*Dice the peppers/)).toBeVisible();
  await expect(planner.getByText(/Missing: Camp griddle/)).toBeVisible();
  await planner.getByRole("button", { name: "Add missing gear" }).click();
  await expect(planner.getByRole("status")).toContainText(/Added 1 missing gear item/);
  await planner.getByRole("button", { name: "Undo gear addition" }).click();
  await planner.getByRole("button", { name: /Groceries · 1/ }).click();
  await expect(planner.getByText("Tortillas", { exact: true })).toBeVisible();
  await planner.getByRole("combobox", { name: "Status" }).selectOption("packed");
  await planner.getByRole("button", { name: "Save", exact: true }).click();
  await context.setOffline(true);
  await planner.getByRole("button", { name: "Close meal planner" }).click();
  await chooseTripAction(page, "Meals");
  await page.getByRole("dialog", { name: "Meals" }).getByRole("button", { name: /Groceries · 1/ }).click();
  await expect(page.getByRole("dialog", { name: "Meals" }).getByRole("combobox", { name: "Status" })).toHaveValue("packed");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".meal-tabs")).toHaveCSS("display", "none");
  await page.emulateMedia({ media: "screen" });
  await planner.getByRole("button", { name: "Plan", exact: true }).click();
  const dinner = planner.getByRole("button", { name: /Dinner for Sat, Sep 5: Camp tacos/i });
  await dinner.locator("..").getByRole("button", { name: "Clear" }).click();
  await expect(planner.getByRole("button", { name: /Groceries · 0/ })).toBeVisible();
  await planner.getByRole("button", { name: "Undo last change" }).click();
  await expect(planner.getByRole("button", { name: /Groceries · 1/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("a user can save a campsite idea locally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Saved site ideas" }).click();
  await expect(page.getByRole("heading", { name: "Saved sites" })).toBeVisible();
  await page.getByRole("button", { name: "+ Add site" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Fern Canyon");
  await page.getByRole("textbox", { name: /tags/i }).fill("redwoods, hike");
  await page.getByRole("button", { name: "Save site" }).click();
  await expect(page.getByText("Fern Canyon", { exact: true })).toBeVisible();
  await expect(page.getByText(/redwoods, hike/i)).toBeVisible();
});

test("backup tools load on demand and explain their scope", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Backup & restore" }).click();

  await expect(page.getByRole("heading", { name: "Keep your lists safe." })).toBeVisible();
  await expect(page.getByText(/meal plans, groceries, saved meals/i)).toBeVisible();
  await expect(page.getByText(/downloaded map archives and prepared offline packs stay on this device/i)).toBeVisible();
});

test("the phone home menu reaches every local management flow", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Sign in / switch profile" }).click();
  await expect(page.getByRole("dialog", { name: "Sign in or switch profile" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "Close dialog" }).click();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Profile settings" }).click();
  await expect(page.getByRole("heading", { name: "People & profiles" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "← All trips" }).click();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Manage master inventory" }).click();
  await expect(page.getByRole("heading", { name: "Everything you may bring." })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "← All trips" }).click();

  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByLabel("Import shared trip").setInputFiles({
    name: "phone-trip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "camping-trip-v1",
      trip: {
        id: "phone-import",
        name: "Imported phone trip",
        camperCount: 1,
        style: "car",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
        archived: false,
      },
      items: [],
      profiles: [],
    })),
  });
  await expect(page.getByRole("heading", { name: "Imported phone trip" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
