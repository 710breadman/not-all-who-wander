import { expect, test, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";

const runtimeErrors = new WeakMap<Page, string[]>();

test.describe.configure({ timeout: 120_000 });
test.use({ serviceWorkers: "block" });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "The exhaustive pass targets the phone UI.");
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource: net::ERR_FAILED")) errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

async function createTrip(
  page: Page,
  options: { name?: string; destination?: string } = {},
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await page.getByRole("textbox", { name: "Trip name" }).fill(options.name ?? "UI audit trip");
  if (options.destination) {
    await page.getByRole("textbox", { name: "Destination", exact: true }).fill(options.destination);
  }
  await page.getByRole("button", { name: "Create checklist" }).click();
  await expect(page.getByRole("heading", { name: options.name ?? "UI audit trip" })).toBeVisible();
}

async function chooseTripAction(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Open trip menu" }).click();
  await page
    .getByRole("navigation", { name: "Trip actions" })
    .getByRole("button", { name, exact: true })
    .click();
}

async function openHomeMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "App menu" })).toBeVisible();
}

async function assertPhoneFit(page: Page): Promise<void> {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
}

test("every menu and modal has reliable open and close paths", async ({ page }) => {
  await page.goto("/");
  const homeMenuButton = page.getByRole("button", { name: "Open menu" });
  await expect(homeMenuButton).toHaveAttribute("aria-expanded", "false");
  await homeMenuButton.click();
  await expect(homeMenuButton).toHaveAttribute("aria-expanded", "true");
  await homeMenuButton.click();
  await expect(page.getByRole("navigation", { name: "App menu" })).toHaveCount(0);

  await openHomeMenu(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "App menu" })).toHaveCount(0);
  await openHomeMenu(page);
  await page.mouse.click(5, 700);
  await expect(page.getByRole("navigation", { name: "App menu" })).toHaveCount(0);

  await page.getByRole("button", { name: "Start a new trip" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.getByRole("dialog", { name: "New camping trip" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "New camping trip" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start a new trip" }).click();
  await page.locator(".dialog-backdrop").click({ position: { x: 3, y: 3 } });
  await expect(page.getByRole("dialog", { name: "New camping trip" })).toHaveCount(0);

  await createTrip(page, { destination: "Fern Canyon" });
  const tripMenuButton = page.getByRole("button", { name: "Open trip menu" });
  await tripMenuButton.click();
  await expect(tripMenuButton).toHaveAttribute("aria-expanded", "true");
  await tripMenuButton.click();
  await expect(page.getByRole("navigation", { name: "Trip actions" })).toHaveCount(0);
  await tripMenuButton.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Trip actions" })).toHaveCount(0);
  await tripMenuButton.click();
  await page.getByRole("button", { name: "Close trip menu" }).click({ position: { x: 3, y: 3 } });
  await expect(page.getByRole("navigation", { name: "Trip actions" })).toHaveCount(0);

  const dialogs = [
    ["+ Add item", "Add a new item"],
    ["Edit trip", "Edit trip"],
    ["Trip safety", "Trip safety & preflight"],
    ["Weather", "Weather forecast"],
    ["Map", "Trip map"],
    ["Waypoints", "Local waypoints"],
    ["Discover sites", "Official campsite discovery"],
    ["Safety layers", "Safety and access layers"],
    ["Record track", "Track recording"],
    ["GPX routes & tracks", "GPX routes and tracks"],
    ["Offline maps", "Offline map regions"],
    ["Offline trip pack", "Offline trip packs"],
    ["Share trip", "Share UI audit trip"],
  ] as const;
  for (const [action, dialog] of dialogs) {
    await chooseTripAction(page, action);
    await expect(page.getByRole("dialog", { name: dialog })).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).click();
    await expect(page.getByRole("dialog", { name: dialog })).toHaveCount(0);
  }
  await assertPhoneFit(page);
});

test("all checklist controls update, persist, filter, and give feedback", async ({ page }) => {
  await createTrip(page, { destination: "Fern Canyon" });

  const categoryNames = ["Food", "Gear", "Clothes", "Hygiene & First Aid", "Extras", "Personal"];
  const tabs = page.getByRole("navigation", { name: "Checklist categories" });
  for (const name of categoryNames) {
    const tab = tabs.getByRole("button", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-pressed", "true");
  }
  await tabs.getByRole("button", { name: "Food", exact: true }).click();

  const statusFilters = page.locator(".status-key button");
  await expect(statusFilters).toHaveCount(4);
  for (const button of await statusFilters.all()) {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }

  const section = page.locator(".item-section-heading").first();
  await section.click();
  await expect(section).toHaveAttribute("aria-expanded", "false");
  await section.click();
  await expect(section).toHaveAttribute("aria-expanded", "true");

  const row = page.locator(".check-item").first();
  const rowName = (await row.locator("strong").textContent())!;
  for (const status of ["Packed", "Need to buy", "To pack", "Not needed"]) {
    await row.getByRole("button", { name: status, exact: true }).click();
    await expect(row.getByRole("button", { name: status, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await row.getByRole("button", { name: "To pack", exact: true }).click();

  const quantity = row.locator(".stepper span");
  const initialQuantity = Number(await quantity.textContent());
  await row.getByRole("button", { name: `Increase ${rowName} quantity` }).click();
  await expect(quantity).toHaveText(String(initialQuantity + 1));
  await row.getByRole("button", { name: `Decrease ${rowName} quantity` }).click();
  await expect(quantity).toHaveText(String(initialQuantity));

  await row.getByRole("button", { name: "Edit", exact: true }).click();
  const editDialog = page.getByRole("dialog", { name: `Edit ${rowName}` });
  await editDialog.getByRole("textbox", { name: "Name", exact: true }).fill("Audited meal kit");
  await editDialog.getByLabel("Category").selectOption("extras");
  await editDialog.getByRole("textbox", { name: "Section" }).fill("Audit gear");
  await editDialog.getByRole("spinbutton", { name: "Quantity" }).fill("3");
  await editDialog.getByRole("textbox", { name: "Unit" }).fill("kits");
  await editDialog.getByRole("radio", { name: "Need to buy" }).check();
  await editDialog.getByRole("textbox", { name: "Notes" }).fill("Verified in the full UI pass");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await tabs.getByRole("button", { name: "Extras", exact: true }).click();
  await expect(page.getByText("Audited meal kit", { exact: true })).toBeVisible();

  await page.getByLabel("Search checklist").fill("Audited meal");
  await expect(page.locator(".check-item")).toHaveCount(1);
  await page.getByLabel("Search checklist").fill("");
  await page.getByLabel("Filter checklist").selectOption("need-to-buy");
  await expect(page.getByText("Audited meal kit", { exact: true })).toBeVisible();
  await page.getByLabel("Filter checklist").selectOption("all");

  await chooseTripAction(page, "+ Add item");
  await page.getByRole("textbox", { name: "Item name" }).fill("Audit lantern");
  await page.getByRole("button", { name: "Add to checklist" }).click();
  const customRow = page.locator(".check-item").filter({ hasText: "Audit lantern" });
  await customRow.getByRole("button", { name: "Promote" }).click();
  await expect(page.getByRole("status")).toContainText("added to the master inventory");
  await expect(customRow.getByRole("button", { name: "Promote" })).toHaveCount(0);

  await chooseTripAction(page, "Packing mode");
  await expect(page.locator("main.app-shell")).toHaveClass(/packing-mode/);
  await expect(page.getByLabel("Filter checklist")).toBeDisabled();
  await chooseTripAction(page, "Exit packing mode");
  await expect(page.locator("main.app-shell")).not.toHaveClass(/packing-mode/);
  await expect(page.getByLabel("Filter checklist")).toBeEnabled();
  await assertPhoneFit(page);
});

test("profile, inventory, site, backup, trip sorting, and import controls work", async ({ page }) => {
  await page.goto("/");
  await openHomeMenu(page);
  await page.getByRole("button", { name: "Profile settings" }).click();
  await page.getByRole("button", { name: "+ Add person" }).click();
  const profileDialog = page.getByRole("dialog", { name: "Add profile" });
  await profileDialog.getByRole("textbox", { name: "Profile name" }).fill("Alex");
  await profileDialog.getByRole("textbox", { name: /Email or Gmail/i }).fill("alex@example.com");
  await profileDialog.getByRole("button", { name: "+ Add item" }).click();
  await expect(page.getByRole("dialog", { name: "Add personal item" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Add personal item" })).toHaveCount(0);
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByRole("button", { name: "+ Add item" }).click();
  const personalDialog = page.getByRole("dialog", { name: "Add personal item" });
  await personalDialog.getByRole("textbox", { name: "Item name" }).fill("Daily medicine");
  await personalDialog.getByRole("button", { name: "Add to personal list" }).click();
  await expect(profileDialog.getByText("Daily medicine", { exact: true })).toBeVisible();
  await profileDialog.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Alex", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("dialog", { name: "Edit profile" }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("dialog", { name: "Edit profile" }).getByText("Daily medicine", { exact: true })).toHaveCount(0);
  await page.getByRole("dialog", { name: "Edit profile" }).getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("button", { name: "← All trips" }).click();

  await openHomeMenu(page);
  await page.getByRole("button", { name: "Sign in / switch profile" }).click();
  await page.locator(".profile-switcher button").filter({ hasText: "Alex" }).click();
  await page.getByRole("button", { name: "Continue as Alex" }).click();
  await openHomeMenu(page);
  await expect(page.getByRole("button", { name: "Switch profile (Alex)" })).toBeVisible();
  await page.getByRole("button", { name: "Manage master inventory" }).click();

  await page.getByRole("button", { name: "+ Add item" }).click();
  const inventoryDialog = page.getByRole("dialog", { name: "Edit inventory item" });
  await inventoryDialog.getByRole("textbox", { name: "Name", exact: true }).fill("Audit compass");
  await inventoryDialog.getByLabel("Category").selectOption("gear");
  await inventoryDialog.getByRole("textbox", { name: "Section" }).fill("Navigation");
  await inventoryDialog.getByRole("spinbutton", { name: "Default quantity" }).fill("2");
  await inventoryDialog.getByRole("textbox", { name: "Unit" }).fill("items");
  await inventoryDialog.getByLabel("Rule").selectOption("per-person");
  await inventoryDialog.getByRole("spinbutton", { name: "Amount" }).fill("1");
  await inventoryDialog.getByRole("textbox", { name: /Aliases/i }).fill("direction finder");
  await inventoryDialog.getByRole("textbox", { name: /Tags/i }).fill("navigation, safety");
  await inventoryDialog.getByRole("button", { name: "Save item" }).click();
  await page.getByLabel("Search inventory").fill("direction finder");
  await expect(page.getByText("Audit compass", { exact: true })).toBeVisible();
  await page.getByLabel("Filter inventory category").selectOption("gear");
  const inventoryRow = page.locator(".inventory-item").filter({ hasText: "Audit compass" });
  await inventoryRow.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog", { name: "Edit inventory item" }).getByRole("textbox", { name: "Name", exact: true }).fill("Audit compass updated");
  await page.getByRole("dialog", { name: "Edit inventory item" }).getByRole("button", { name: "Save item" }).click();
  await expect(page.getByText("Audit compass updated", { exact: true })).toBeVisible();
  await page.locator(".inventory-item").filter({ hasText: "Audit compass updated" }).getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Audit compass updated", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "← All trips" }).click();

  await openHomeMenu(page);
  await page.getByRole("button", { name: "Saved site ideas" }).click();
  await page.getByRole("button", { name: "+ Add site" }).click();
  const siteDialog = page.getByRole("dialog", { name: "Add site" });
  await siteDialog.getByRole("textbox", { name: "Name" }).fill("Audit campsite");
  await siteDialog.getByRole("spinbutton", { name: "Latitude" }).fill("41.4");
  await siteDialog.getByRole("spinbutton", { name: "Longitude" }).fill("-124.1");
  await siteDialog.getByLabel("Visit state").selectOption("visited");
  await siteDialog.getByRole("spinbutton", { name: /Rating/i }).fill("5");
  await siteDialog.getByRole("checkbox", { name: "Potable water" }).check();
  await siteDialog.getByRole("button", { name: "Save site" }).click();
  const siteRow = page.locator(".inventory-item").filter({ hasText: "Audit campsite" });
  await siteRow.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog", { name: "Edit site" }).getByRole("textbox", { name: "Name" }).fill("Audit campsite updated");
  await page.getByRole("dialog", { name: "Edit site" }).getByRole("button", { name: "Save site" }).click();
  const updatedSiteRow = page.locator(".inventory-item").filter({ hasText: "Audit campsite updated" });
  await updatedSiteRow.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Audit campsite updated", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Show archived" }).check();
  await expect(page.getByText("Audit campsite updated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "← All trips" }).click();

  await openHomeMenu(page);
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const backup = await backupDownload;
  await expect(page.getByRole("status")).toContainText("Backup downloaded");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByLabel("Restore backup").setInputFiles(await backup.path());
  await expect(page.getByRole("heading", { name: "Path A Logical" })).toBeVisible();

  await openHomeMenu(page);
  await page.getByLabel("Import shared trip").setInputFiles({
    name: "audit-trip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "camping-trip-v1",
      trip: {
        id: "audit-import",
        name: "Imported audit trip",
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
  await expect(page.getByRole("heading", { name: "Imported audit trip" })).toBeVisible();
  await assertPhoneFit(page);
});

test("location, route, offline, sharing, and external-data controls work", async ({ page, context }) => {
  await context.grantPermissions(["geolocation", "clipboard-read", "clipboard-write"]);
  await context.setGeolocation({ latitude: 41.4, longitude: -124.1, accuracy: 8 });
  await mockExternalData(page);
  await createTrip(page, { name: "Field tools audit", destination: "Fern Canyon" });

  await chooseTripAction(page, "Trip safety");
  const preflight = page.getByRole("dialog", { name: "Trip safety & preflight" });
  await preflight.getByRole("spinbutton", { name: "Destination latitude" }).fill("41.4");
  await preflight.getByRole("spinbutton", { name: "Destination longitude" }).fill("-124.1");
  await preflight.getByRole("textbox", { name: "Emergency contact" }).fill("Sam");
  await preflight.getByRole("checkbox", { name: "fuel" }).check();
  await preflight.getByRole("checkbox", { name: "Schedule" }).uncheck();
  const popupPromise = page.waitForEvent("popup");
  await preflight.getByRole("button", { name: "Print itinerary" }).click();
  await (await popupPromise).close();
  await preflight.getByRole("button", { name: "Copy itinerary" }).click();
  await preflight.getByRole("button", { name: "Save preflight" }).click();

  await chooseTripAction(page, "Waypoints");
  const waypoints = page.getByRole("dialog", { name: "Local waypoints" });
  await waypoints.getByRole("button", { name: "Use current location" }).click();
  await expect(waypoints.getByRole("status")).toContainText("8 m");
  await waypoints.getByRole("button", { name: "Copy", exact: true }).click();
  await waypoints.getByRole("button", { name: "+ Save a spot" }).click();
  await waypoints.getByRole("textbox", { name: "Name" }).fill("Audit trailhead");
  await waypoints.getByLabel("Waypoint type").selectOption("trailhead");
  await waypoints.getByRole("button", { name: "Save waypoint" }).click();
  await expect(waypoints.getByText("Audit trailhead", { exact: true })).toBeVisible();
  await waypoints.locator(".inventory-item").filter({ hasText: "Audit trailhead" }).getByRole("button", { name: "Copy" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Record track");
  const recorder = page.getByRole("dialog", { name: "Track recording" });
  await recorder.getByRole("button", { name: "Start balanced" }).click();
  await expect(recorder).toContainText("recording");
  await recorder.getByRole("button", { name: "Pause" }).click();
  await recorder.getByRole("button", { name: "Resume" }).click();
  await context.setGeolocation({ latitude: 41.4001, longitude: -124.1001, accuracy: 8 });
  await recorder.getByRole("button", { name: "Capture current point" }).click();
  await expect(recorder).toContainText("2 points");
  await recorder.getByRole("button", { name: "Stop & save" }).click();
  await expect(recorder.getByRole("status")).toContainText("Saved 2 points locally");
  await recorder.getByRole("button", { name: "Start battery saver" }).click();
  await expect(recorder).toContainText("60s target");
  await recorder.getByRole("button", { name: "Stop & save" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "GPX routes & tracks");
  const gpx = page.getByRole("dialog", { name: "GPX routes and tracks" });
  await gpx.getByLabel("Import GPX").setInputFiles({
    name: "audit.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from('<?xml version="1.0"?><gpx version="1.1" creator="PAL"><rte><name>Audit route</name><rtept lat="41.4" lon="-124.1"/><rtept lat="41.41" lon="-124.11"/></rte></gpx>'),
  });
  await expect(gpx.getByText("Audit route", { exact: true })).toBeVisible();
  const gpxDownload = page.waitForEvent("download");
  page.once("dialog", (dialog) => void dialog.accept());
  await gpx.getByRole("button", { name: "Export GPX" }).click();
  await gpxDownload;
  page.once("dialog", (dialog) => void dialog.accept());
  await gpx.locator(".inventory-item").filter({ hasText: "Audit route" }).getByRole("button", { name: "Delete" }).click();
  await expect(gpx.getByText("Audit route", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Weather");
  const weather = page.getByRole("dialog", { name: "Weather forecast" });
  await weather.getByRole("button", { name: "Fetch forecast" }).click();
  await expect(weather).toContainText("Rain Showers");
  await weather.getByRole("button", { name: "Refresh forecast" }).click();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Discover sites");
  const discovery = page.getByRole("dialog", { name: "Official campsite discovery" });
  await discovery.getByRole("button", { name: "Search official sites" }).click();
  await expect(discovery.getByText("Audit Campground", { exact: true }).first()).toBeVisible();
  await discovery.getByRole("button", { name: "Save idea" }).first().click();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Safety layers");
  const layers = page.getByRole("dialog", { name: "Safety and access layers" });
  await layers.getByRole("button", { name: "Refresh layers" }).click();
  const layerToggle = layers.getByRole("checkbox").first();
  await layerToggle.uncheck();
  await expect(layerToggle).not.toBeChecked();
  await layerToggle.check();
  await expect(layerToggle).toBeChecked();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Map");
  const map = page.getByRole("dialog", { name: "Trip map" });
  await map.getByRole("button", { name: "Show my location" }).click();
  await expect(map).toContainText("Fern Canyon");
  await map.locator(".inventory-item").filter({ hasText: "Audit Campground" }).getByRole("button", { name: "Details" }).click();
  await expect(map.getByRole("region", { name: "Marker details" })).toBeVisible();
  await map.getByRole("button", { name: "Copy coordinates" }).click();
  await expect(map.getByRole("link", { name: "Open navigation" })).toHaveAttribute("href", /^https:/);
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Offline trip pack");
  const pack = page.getByRole("dialog", { name: "Offline trip packs" });
  for (const checkbox of await pack.getByRole("checkbox").all()) {
    await checkbox.uncheck();
    await checkbox.check();
  }
  await pack.getByRole("button", { name: "Estimate pack" }).click();
  await expect(pack).toContainText("Estimated pack size");
  await pack.getByRole("button", { name: "Prepare offline pack" }).click();
  await expect(pack).toContainText("ready for offline use");
  page.once("dialog", (dialog) => void dialog.accept());
  await pack.getByRole("button", { name: "Delete" }).click();
  await expect(pack).toContainText("Offline pack deleted");
  await page.getByRole("button", { name: "Close dialog" }).click();

  await chooseTripAction(page, "Share trip");
  const share = page.getByRole("dialog", { name: "Share Field tools audit" });
  const shareDownload = page.waitForEvent("download");
  await share.getByRole("button", { name: "Share packing list" }).click();
  await shareDownload;
  await page.getByRole("button", { name: "Close dialog" }).click();
  await assertPhoneFit(page);
});

async function mockExternalData(page: Page): Promise<void> {
  const cors = { "Access-Control-Allow-Origin": "*" };
  await page.route(/api\.weather\.gov\/points\//, (route) =>
    route.fulfill({
      headers: cors,
      json: {
        properties: {
          forecast: "https://api.weather.gov/test-daily",
          forecastHourly: "https://api.weather.gov/test-hourly",
        },
      },
    }),
  );
  const period = {
    name: "Tonight",
    startTime: "2026-09-01T18:00:00-07:00",
    temperature: 52,
    temperatureUnit: "F",
    shortForecast: "Rain Showers",
    detailedForecast: "Rain and wind",
    windSpeed: "10 mph",
    windDirection: "W",
    probabilityOfPrecipitation: { value: 80 },
  };
  await page.route(/api\.weather\.gov\/test-daily$/, (route) => route.fulfill({ headers: cors, json: { properties: { periods: [period] } } }));
  await page.route(/api\.weather\.gov\/test-hourly$/, (route) => route.fulfill({ headers: cors, json: { properties: { periods: [period] } } }));
  await page.route(/api\.weather\.gov\/alerts\//, (route) => route.fulfill({ headers: cors, json: { features: [] } }));
  await page.route("**/query?*", (route) => {
    const url = route.request().url();
    const discoveryRequest = url.includes("RecreationOpportunities") || url.includes("Recreation_Sites_Facilities");
    return route.fulfill({
      headers: cors,
      json: {
        features: discoveryRequest
          ? [{ id: "audit-site", geometry: { coordinates: [-124.1, 41.4] }, properties: { NAME: "Audit Campground", URL: "https://example.com/audit-camp" } }]
          : [{ id: "audit-layer", geometry: { coordinates: [-124.1, 41.4] }, properties: { NAME: "Audit area" } }],
      },
    });
  });
  await page.route("https://demotiles.maplibre.org/**", (route) => route.abort());
}
