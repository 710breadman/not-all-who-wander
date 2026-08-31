import { expect, test } from "@playwright/test";

test("a user can create a trip and view its checklist", async ({ page }) => {
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
  await page.getByRole("button", { name: "GPX" }).click();
  await expect(page.getByRole("dialog", { name: "GPX routes and tracks" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Safety layers" }).click();
  await expect(page.getByRole("dialog", { name: "Safety and access layers" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Discover sites" }).click();
  await expect(page.getByRole("dialog", { name: "Official campsite discovery" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByRole("dialog", { name: "Trip map" })).toBeVisible();
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
