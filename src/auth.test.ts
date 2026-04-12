import { describe, expect, it } from "vitest";
import { createAuthOptions, getOAuthProviderAvailability } from "./auth";

describe("getOAuthProviderAvailability", () => {
  it("reports providers as disabled when env vars are missing", () => {
    const providers = getOAuthProviderAvailability({} as unknown as NodeJS.ProcessEnv);

    expect(providers).toEqual({ google: false, github: false });
  });

  it("reports providers as enabled only when both credentials are present", () => {
    const providers = getOAuthProviderAvailability({
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      GITHUB_ID: "github-client-id",
      GITHUB_SECRET: "github-client-secret",
    } as unknown as NodeJS.ProcessEnv);

    expect(providers).toEqual({ google: true, github: true });
  });
});

describe("createAuthOptions", () => {
  it("keeps only credentials when OAuth env vars are absent", () => {
    const options = createAuthOptions({} as unknown as NodeJS.ProcessEnv);
    const providerIds = options.providers.map((provider) => provider.id);

    expect(providerIds).toEqual(["credentials"]);
  });

  it("adds configured OAuth providers when env vars exist", () => {
    const options = createAuthOptions({
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
      GITHUB_ID: "github-client-id",
      GITHUB_SECRET: "github-client-secret",
    } as unknown as NodeJS.ProcessEnv);
    const providerIds = options.providers.map((provider) => provider.id);

    expect(providerIds).toEqual(["credentials", "google", "github"]);
  });
});
