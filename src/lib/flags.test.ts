import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Mock next/headers cookies(). Each test sets `mockCookieValue` to control
 * what `cookies().get('pref-v3')` returns.
 */
let mockCookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === "pref-v3" && mockCookieValue !== undefined
          ? { value: mockCookieValue }
          : undefined,
    }),
}));

const importFresh = async () => {
  vi.resetModules();
  return await import("./flags");
};

describe("isV3Enabled — resolution priority", () => {
  const originalEdgeConfig = process.env.EDGE_CONFIG;

  beforeEach(() => {
    mockCookieValue = undefined;
    delete process.env.EDGE_CONFIG;
  });

  afterEach(() => {
    if (originalEdgeConfig) process.env.EDGE_CONFIG = originalEdgeConfig;
    else delete process.env.EDGE_CONFIG;
  });

  it("returns true when cookie is '1' (explicit opt-in wins)", async () => {
    mockCookieValue = "1";
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(true);
  });

  it("returns false when cookie is '0' (explicit opt-out wins, even with EDGE_CONFIG set)", async () => {
    mockCookieValue = "0";
    process.env.EDGE_CONFIG = "https://edge-config.vercel.com/fake";
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(false);
  });

  it("returns hard default (true) when no cookie and no EDGE_CONFIG env — v3 is the default", async () => {
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(true);
  });

  it("ignores invalid cookie values and falls through to hard default (true)", async () => {
    mockCookieValue = "yes";
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(true);
  });

  it("returns hard default (true) when EDGE_CONFIG is set but the package isn't installed (silent fallback)", async () => {
    // The package isn't installed in this test env, so the dynamic import
    // throws inside readEdgeConfig and we fall through to hard default.
    process.env.EDGE_CONFIG = "https://edge-config.vercel.com/fake";
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(true);
  });

  it("opt-out cookie ('0') still wins over the new default-on hard default", async () => {
    mockCookieValue = "0";
    const { isV3Enabled } = await importFresh();
    expect(await isV3Enabled()).toBe(false);
  });
});

describe("describeFlagState — debug helper", () => {
  beforeEach(() => {
    mockCookieValue = undefined;
    delete process.env.EDGE_CONFIG;
  });

  it("reports source=cookie when an explicit cookie is set", async () => {
    mockCookieValue = "1";
    const { describeFlagState } = await importFresh();
    const state = await describeFlagState();
    expect(state.resolved).toBe(true);
    expect(state.source).toBe("cookie");
    expect(state.cookie).toBe("1");
  });

  it("reports source=hard-default when nothing is configured (now resolves to true)", async () => {
    const { describeFlagState } = await importFresh();
    const state = await describeFlagState();
    expect(state.resolved).toBe(true);
    expect(state.source).toBe("hard-default");
    expect(state.cookie).toBeNull();
    expect(state.edgeConfigConfigured).toBe(false);
    expect(state.hardDefault).toBe(true);
  });

  it("reports edgeConfigConfigured=true when EDGE_CONFIG env is present", async () => {
    process.env.EDGE_CONFIG = "https://edge-config.vercel.com/fake";
    const { describeFlagState } = await importFresh();
    const state = await describeFlagState();
    expect(state.edgeConfigConfigured).toBe(true);
  });
});
