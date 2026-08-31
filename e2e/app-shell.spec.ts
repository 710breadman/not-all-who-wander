import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

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
    page.getByRole("heading", { name: "Not all who wander pack light." }),
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
  await page.getByRole("button", { name: "Create checklist" }).click();
  await expect(
    page.getByRole("heading", { name: "Redwoods weekend" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Checklist categories" })
      .getByRole("button"),
  ).toHaveCount(6);
  await page.getByRole("button", { name: "Trip safety" }).click();
  await expect(
    page.getByRole("dialog", { name: "Trip safety & preflight" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "fuel" }).check();
  await page.getByRole("button", { name: "Save preflight" }).click();
  await page.getByRole("button", { name: "Waypoints" }).click();
  await expect(page.getByRole("dialog", { name: "Local waypoints" })).toBeVisible();
  await page.getByRole("button", { name: "+ Save a spot" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Fern Canyon trailhead");
  await page.getByRole("spinbutton", { name: "Latitude" }).fill("41.4");
  await page.getByRole("spinbutton", { name: "Longitude" }).fill("-124.1");
  await page.getByRole("button", { name: "Save waypoint" }).click();
  await expect(page.getByText("Fern Canyon trailhead", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Record track" }).click();
  await expect(page.getByRole("dialog", { name: "Track recording" })).toContainText(/never begins automatically/i);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Offline maps" }).click();
  await expect(page.getByRole("dialog", { name: "Offline map regions" })).toContainText(/PMTiles archive/i);
  const archive = rasterPmtilesFixture();
  await page.route("https://maps.example/test.pmtiles", (route) => route.fulfill({ status: 200, body: archive, headers: { "Content-Length": String(archive.length), "Content-Type": "application/vnd.pmtiles" } }));
  await page.getByRole("textbox", { name: "Licensed raster PMTiles HTTPS URL" }).fill("https://maps.example/test.pmtiles");
  await page.getByRole("checkbox", { name: /license permits offline downloading/i }).check();
  await page.getByRole("button", { name: "Download region" }).click();
  await expect(page.getByRole("dialog", { name: "Offline map regions" })).toContainText(/ready for airplane-mode use/i);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Offline pack" }).click();
  await expect(page.getByRole("dialog", { name: "Offline trip packs" })).toContainText(/private medical notes are never included/i);
  await page.getByRole("button", { name: "Prepare offline pack" }).click();
  await expect(page.getByRole("dialog", { name: "Offline trip packs" })).toContainText(/ready for offline use/i);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "GPX" }).click();
  await expect(page.getByRole("dialog", { name: "GPX routes and tracks" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Safety layers" }).click();
  await expect(page.getByRole("dialog", { name: "Safety and access layers" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Discover sites" }).click();
  await expect(page.getByRole("dialog", { name: "Official campsite discovery" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Trip map" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Trip map" })).toContainText(/rendering from its local PMTiles archive/i);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Weather" }).click();
  await expect(page.getByRole("dialog", { name: "Weather forecast" })).toContainText(/Add destination coordinates/i);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Packing mode" }).click();
  await expect(
    page.getByRole("button", { name: "Exit packing" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the loaded app remains usable while offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Not all who wander pack light." }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await expect(
    page.getByRole("dialog", { name: "New camping trip" }),
  ).toBeVisible();
});

test("application shell fits the configured viewport", async ({ page }) => {
  await page.goto("/");

  const horizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBe(false);
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
