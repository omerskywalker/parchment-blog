import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appUrl } from "./resend";

describe("appUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("prefers NEXT_PUBLIC_SITE_URL over all other app url env vars", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://parchment.blog";
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.parchment.blog";
    process.env.NEXTAUTH_URL = "https://auth.parchment.blog";

    expect(appUrl()).toBe("https://parchment.blog");
  });

  it("falls back to NEXT_PUBLIC_APP_URL when site url is absent", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.parchment.blog/";

    expect(appUrl()).toBe("https://preview.parchment.blog");
  });

  it("falls back to NEXTAUTH_URL when no public app url exists", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXTAUTH_URL = "https://parchment.blog/";

    expect(appUrl()).toBe("https://parchment.blog");
  });

  it("uses VERCEL_URL when no explicit app url exists", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    process.env.VERCEL_URL = "parchment-preview.vercel.app/";

    expect(appUrl()).toBe("https://parchment-preview.vercel.app");
  });

  it("falls back to localhost in development", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_URL;

    expect(appUrl()).toBe("http://localhost:3000");
  });
});
