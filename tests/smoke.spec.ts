import { expect, test } from "@playwright/test";

test.describe("LaboraIQ smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome to LaboraIQ" })).toBeVisible();
    await expect(page.getByPlaceholder("name@laboraiq.com")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("name@laboraiq.com").fill("qa@laboraiq.com");
    await page.locator('input[type="password"]').fill("123");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText(/Password must have at least 6 characters|Invalid login payload/i)).toBeVisible();
  });
});
