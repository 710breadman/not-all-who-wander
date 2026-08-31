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
  ).toHaveCount(5);
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
