/**
 * Server-side feature flag resolver.
 *
 * Resolution order (first match wins):
 *   1. Cookie `pref-v3=1`  → v3 ON for this user
 *   2. Cookie `pref-v3=0`  → v3 OFF for this user (explicit opt-out)
 *   3. Edge Config `v3Enabled` (true/false) → global default
 *   4. Hard-coded fallback `false`
 *
 * The middleware (see `middleware.ts`) handles the `?v3=on|off` query param
 * by writing the cookie and redirecting to a clean URL.
 *
 * Edge Config is read lazily and gracefully — if `EDGE_CONFIG` env var is not
 * set, the resolver simply skips that layer and uses the hard-coded fallback.
 * This means the system works even before you provision Edge Config.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "pref-v3";
const EDGE_CONFIG_KEY = "v3Enabled";
const HARD_DEFAULT = false; // off by default during rollout

/**
 * Read a boolean flag from Vercel Edge Config.
 * Returns null if Edge Config is not configured, the key is missing, or the
 * fetch fails for any reason. Failure is silent and non-blocking.
 */
async function readEdgeConfig(): Promise<boolean | null> {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    // Lazy import so the package is optional. If it's not installed, this
    // throws and we fall through.
    const { get } = await import("@vercel/edge-config");
    const value = await get<boolean>(EDGE_CONFIG_KEY);
    if (typeof value === "boolean") return value;
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the v3 experience should be rendered for the current request.
 * Server components only — uses Next.js `cookies()` from headers.
 */
export async function isV3Enabled(): Promise<boolean> {
  const cookieStore = await cookies();
  const c = cookieStore.get(COOKIE_NAME)?.value;
  if (c === "1") return true;
  if (c === "0") return false;

  const edge = await readEdgeConfig();
  if (edge !== null) return edge;

  return HARD_DEFAULT;
}

/**
 * Inspect resolution for the current request — useful for the debug endpoint.
 */
export async function describeFlagState() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value ?? null;
  const edge = await readEdgeConfig();
  const resolved = await isV3Enabled();
  return {
    resolved,
    source: cookie === "1" || cookie === "0" ? "cookie" : edge !== null ? "edge-config" : "hard-default",
    cookie,
    edgeConfigValue: edge,
    edgeConfigConfigured: !!process.env.EDGE_CONFIG,
    hardDefault: HARD_DEFAULT,
  };
}

export const V3_COOKIE_NAME = COOKIE_NAME;
