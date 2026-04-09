import { expect, test, type Page } from "@playwright/test";

const env =
  (
    globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process?.env ?? {};

const showcaseBaseUrl = env.E2E_BASE_URL ?? "http://127.0.0.1:4174";

function resolveMainAppOrigin() {
  const configuredMainAppUrl = env.E2E_MAIN_APP_URL?.trim();
  if (configuredMainAppUrl) return configuredMainAppUrl;

  try {
    const showcaseUrl = new URL(showcaseBaseUrl);
    const isVercelShowcaseDeployment =
      showcaseUrl.protocol === "https:" &&
      showcaseUrl.hostname.endsWith(".vercel.app") &&
      showcaseUrl.hostname.includes("sony-livestream-showcase");

    if (isVercelShowcaseDeployment) {
      return "https://sonywiki.vercel.app";
    }
  } catch {
    // Ignore invalid base URLs and fall back to the local main app default.
  }

  return "http://127.0.0.1:5173";
}

const mainAppOrigin = resolveMainAppOrigin();

async function mockSonyUsbCamera(page: Page, label = "Sony USB Livestream") {
  await page.addInitScript(({ deviceLabel }: { deviceLabel: string }) => {
    const devices = [
      { kind: "videoinput", deviceId: "sony-usb-1", label: deviceLabel, groupId: "sony-group" },
      { kind: "videoinput", deviceId: "builtin-1", label: "Integrated Camera", groupId: "builtin-group" },
    ];

    class FakeVideoTrack extends EventTarget {
      kind = "video";
      label: string;
      enabled = true;
      muted = false;
      readyState: "live" | "ended" = "live";

      constructor(trackLabel: string) {
        super();
        this.label = trackLabel;
      }

      stop() {
        if (this.readyState === "ended") return;
        this.readyState = "ended";
        this.dispatchEvent(new Event("ended"));
      }
    }

    Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
      configurable: true,
      get() {
        return (this as HTMLMediaElement & { __srcObject?: unknown }).__srcObject ?? null;
      },
      set(value) {
        (this as HTMLMediaElement & { __srcObject?: unknown }).__srcObject = value;
      },
    });

    HTMLMediaElement.prototype.play = async () => {};

    const mediaDevices = new EventTarget() as Navigator["mediaDevices"] & EventTarget;

    mediaDevices.enumerateDevices = async () => devices as MediaDeviceInfo[];
    mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const requestedId =
        constraints &&
        typeof constraints.video === "object" &&
        constraints.video &&
        "deviceId" in constraints.video &&
        constraints.video.deviceId &&
        typeof constraints.video.deviceId === "object" &&
        "exact" in constraints.video.deviceId
          ? constraints.video.deviceId.exact
          : devices[0].deviceId;

      const selected = devices.find((device) => device.deviceId === requestedId) ?? devices[0];
      const track = new FakeVideoTrack(selected.label);

      return {
        active: true,
        getTracks: () => [track],
        getVideoTracks: () => [track],
      } as MediaStream;
    };

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: mediaDevices,
    });
  }, { deviceLabel: label });
}

async function mockYouTubeIframeApi(page: Page) {
  await page.addInitScript(() => {
    class MockPlayer {
      host: HTMLElement;
      iframe: HTMLIFrameElement;
      state = -1;
      muted = true;
      events?: {
        onReady?: (event: { target: MockPlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
      };

      constructor(element: HTMLElement, options: {
        videoId: string;
        events?: {
          onReady?: (event: { target: MockPlayer }) => void;
          onStateChange?: (event: { data: number }) => void;
        };
      }) {
        this.host = element;
        this.events = options.events;
        this.iframe = document.createElement("iframe");
        this.iframe.src = `https://www.youtube.com/embed/${options.videoId}?mock=1`;
        this.iframe.allow = "autoplay; encrypted-media";
        this.iframe.width = "100%";
        this.iframe.height = "100%";
        this.host.replaceChildren(this.iframe);

        window.setTimeout(() => {
          this.events?.onReady?.({ target: this });
        }, 0);
      }

      destroy() {
        this.iframe.remove();
      }

      getPlayerState() {
        return this.state;
      }

      isMuted() {
        return this.muted;
      }

      mute() {
        this.muted = true;
      }

      playVideo() {
        this.state = 1;
        window.setTimeout(() => {
          this.events?.onStateChange?.({ data: 1 });
        }, 0);
      }

      setPlaybackQuality() {}

      setVolume() {}

      unMute() {
        this.muted = false;
      }
    }

    window.YT = {
      Player: MockPlayer,
      PlayerState: {
        BUFFERING: 3,
        CUED: 5,
        ENDED: 0,
        PAUSED: 2,
        PLAYING: 1,
        UNSTARTED: -1,
      },
    };
  });
}

test.describe("Livestream Showcase standalone app", () => {
  test("loads the standalone showcase shell", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("ascii-rec-background")).toBeVisible();
    await expect(page.getByTestId("ascii-rec-canvas")).toBeVisible();
    await expect(page.getByTestId("ascii-rec-scanlines")).toBeVisible();
    await expect(page.getByTestId("ascii-rec-vignette")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to reason 11" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next reason" })).toBeVisible();
  });

  test("renders YouTube slides 11-15 with a persistent player host", async ({ page }) => {
    await mockYouTubeIframeApi(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("ascii-rec-background")).toBeVisible();

    for (const index of [11, 12, 13, 14, 15]) {
      const start = Date.now();
      await page.getByRole("button", { name: `Go to reason ${index}` }).click();

      const tutorialLabel = `Tutorial ${String(index - 10).padStart(2, "0")}`;
      await expect(page.getByText(tutorialLabel, { exact: false }).first()).toBeVisible();

      const playerHost = page.locator("#showcase-youtube-player-host");
      await expect(playerHost).toBeVisible();
      await expect(page.locator("#showcase-youtube-player-host")).toHaveCount(1);
      await expect(page.getByTestId("showcase-carousel-panel")).toHaveAttribute("data-kiosk-audio-mode", /^(audible|muted)$/);
      console.log(`slide=${index} readyMs=${Date.now() - start} host=showcase-youtube-player-host`);
    }
  });

  test("renders the ASCII background in reduced-motion mode", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByTestId("ascii-rec-background")).toHaveAttribute("data-motion-mode", "reduced");
    await expect(page.getByTestId("ascii-rec-canvas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next reason" })).toBeVisible();
  });

  test("keeps comments and gifts streaming aggressively", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const giftCount = page.getByTestId("gift-count");
    const initialGiftValue = Number(await giftCount.getAttribute("data-count"));

    await expect(page.getByTestId("live-comment-item")).toHaveCount(4, {
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

  test("auto-connects the preferred Sony USB camera in kiosk mode", async ({ page }) => {
    await mockSonyUsbCamera(page);

    await page.goto("/?kiosk=1", { waitUntil: "networkidle" });

    await expect(page.getByTestId("showcase-root")).toHaveAttribute("data-kiosk-mode", "true");
    await expect(page.getByTestId("camera-badge")).toContainText("Sony USB Livestream");
    await expect(page.getByTestId("camera-badge")).toHaveAttribute("data-camera-state", "live");
    await expect(page.locator('[data-testid="video-source-picker"]')).toHaveCount(0);
  });

  test("keeps Escape disabled while kiosk mode is active", async ({ page }) => {
    await mockSonyUsbCamera(page);

    await page.goto("/?kiosk=1", { waitUntil: "networkidle" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);

    await expect(page).toHaveURL(/\/\?kiosk=1$/);
    await expect(page.getByTestId("showcase-root")).toHaveAttribute("data-kiosk-mode", "true");
  });

  test("shows the debug control panel when debug mode is enabled", async ({ page }) => {
    await mockSonyUsbCamera(page);

    await page.goto("/?kiosk=1&debug=1", { waitUntil: "networkidle" });

    await expect(page.getByTestId("preview-control-panel")).toBeVisible();
    await expect(page.getByTestId("phone-mockup")).toHaveAttribute("data-debug-mode", "true");
  });
});
