import { expect, test } from "@playwright/test";

const mainAppOrigin =
  (
    globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process?.env?.E2E_MAIN_APP_URL ?? "http://127.0.0.1:5173";

test.describe("Livestream Showcase standalone app", () => {
  test("loads the standalone showcase shell", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Go to reason 11" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next reason" })).toBeVisible();
  });

  test("renders YouTube slides 11-15 with a persistent player host", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    for (const index of [11, 12, 13, 14, 15]) {
      const start = Date.now();
      await page.getByRole("button", { name: `Go to reason ${index}` }).click();

      const tutorialLabel = `Tutorial ${String(index - 10).padStart(2, "0")}`;
      await expect(page.getByText(tutorialLabel, { exact: false }).first()).toBeVisible();

      const playerHost = page.locator("#showcase-youtube-player-host");
      await expect(playerHost).toBeVisible();
      await expect(
        page.locator('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]'),
      ).toHaveCount(1, {
        timeout: 10000,
      });
      await page.waitForTimeout(1200);

      const iframe = page.locator('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]').first();
      const src = await iframe.getAttribute("src");
      console.log(`slide=${index} readyMs=${Date.now() - start} iframe=${src ? src.slice(0, 100) : "null"}`);
    }
  });

  test("keeps comments and gifts streaming aggressively", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const giftCount = page.getByTestId("gift-count");
    const initialGiftValue = Number(await giftCount.getAttribute("data-count"));

    await expect(page.getByTestId("live-comment-item")).toHaveCount(6, {
      timeout: 6000,
    });

    await expect
      .poll(async () => Number(await giftCount.getAttribute("data-count")), {
        timeout: 4000,
      })
      .toBeGreaterThan(initialGiftValue);
  });

  test("returns to the main livestream SOP with Escape", async ({ page }) => {
    await page.route(`${mainAppOrigin}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>main app livestream stub</body></html>",
      });
    });

    await page.goto("/", {
      waitUntil: "networkidle",
      referer: `${mainAppOrigin}/livestream/showcase`,
    });

    await page.keyboard.press("Escape");
    await page.waitForURL(`${mainAppOrigin}/livestream`);

    await expect(page.getByText("main app livestream stub")).toBeVisible();
  });
});
