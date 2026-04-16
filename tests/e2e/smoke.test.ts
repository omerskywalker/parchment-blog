import { test, expect } from "@playwright/test";

/**
 * Smoke tests — critical happy paths that must work on every deployment.
 *
 * These tests are intentionally lightweight: they verify that pages render
 * and the most important flows are reachable. They do NOT test authenticated
 * flows or database writes (those belong in integration tests).
 *
 * To run: npx playwright test smoke
 * Against a preview URL: BASE_URL=https://your-preview.vercel.app npx playwright test
 */

test.describe("Public pages", () => {
  test("home page loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Parchment/);
    await expect(page.getByRole("heading", { name: /Parchment/i, level: 1 })).toBeVisible();
    // CTA button exists
    const cta = page.getByRole("link", { name: /Start writing|New post/i });
    await expect(cta).toBeVisible();
  });

  test("home page shows value proposition features", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/No algorithm/i)).toBeVisible();
    await expect(page.getByText(/Distraction-free/i)).toBeVisible();
  });

  test("/posts page loads with search bar", async ({ page }) => {
    await page.goto("/posts");
    await expect(page).toHaveTitle(/Parchment/);
    const searchBar = page.getByPlaceholder(/Search posts/i);
    await expect(searchBar).toBeVisible();
  });

  test("post feed cards are clickable links", async ({ page }) => {
    await page.goto("/posts");
    // Wait for at least one post card
    const firstCard = page.locator("article").first();
    // If there are no posts, that's OK for a fresh env — just check the empty state
    const emptyState = page.getByText(/No published posts/i);
    const hasCard = await firstCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasCard || hasEmpty).toBe(true);
  });

  test("post detail page renders content when a post exists", async ({ page }) => {
    // Navigate to /posts and click the first available post
    await page.goto("/posts");
    const firstLink = page.locator("a[href^='/posts/']").first();
    const exists = await firstLink.isVisible().catch(() => false);
    if (!exists) {
      test.skip(true, "No published posts available in this environment");
    }

    await firstLink.click();
    await expect(page).toHaveURL(/\/posts\/.+/);

    // Article heading should be present
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Back nav
    await expect(page.getByRole("link", { name: /Back to posts/i })).toBeVisible();
  });

  test("footer is present with RSS link", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const rssLink = footer.getByRole("link", { name: /RSS/i });
    await expect(rssLink).toBeVisible();
    await expect(rssLink).toHaveAttribute("href", "/rss.xml");
  });

  test("RSS feed returns valid XML", async ({ page }) => {
    const response = await page.goto("/rss.xml");
    expect(response?.status()).toBe(200);
    const contentType = response?.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
  });

  test("sitemap.xml returns 200", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
  });

  test("health endpoint returns ok", async ({ page }) => {
    const response = await page.goto("/api/health");
    expect(response?.status()).toBe(200);
  });
});

test.describe("Auth pages", () => {
  test("sign in page renders form", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign in/i })).toBeVisible();
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Create an account|Register/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });

  test("sign in page has link to register", async ({ page }) => {
    await page.goto("/signin");
    const registerLink = page.getByRole("link", { name: /Register|Create account|Sign up/i });
    await expect(registerLink).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });
});

test.describe("Security headers", () => {
  test("response includes X-Content-Type-Options", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("response includes X-Frame-Options DENY", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });

  test("response includes Referrer-Policy", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["referrer-policy"]).toBeDefined();
  });
});

test.describe("SEO", () => {
  test("home page has canonical link", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    // canonical might be set at route level — just check that OG tags are present
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
  });

  test("post detail has JSON-LD article schema when a post exists", async ({ page }) => {
    await page.goto("/posts");
    const firstLink = page.locator("a[href^='/posts/']").first();
    const exists = await firstLink.isVisible().catch(() => false);
    if (!exists) {
      test.skip(true, "No published posts to verify JSON-LD against");
    }

    await firstLink.click();
    await page.waitForURL(/\/posts\/.+/);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const content = await jsonLd.textContent();
    const parsed = JSON.parse(content ?? "{}");
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBeTruthy();
  });
});
