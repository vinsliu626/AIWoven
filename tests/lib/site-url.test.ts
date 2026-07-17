import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("uses the canonical AIWoven domain for production by default", () => {
    expect(resolveSiteUrl({ NODE_ENV: "production" })).toBe("https://aiwoven.app");
  });

  it("does not let a temporary Vercel deployment replace production canonicals", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        VERCEL_URL: "aiwoven-preview-123.vercel.app",
      })
    ).toBe("https://aiwoven.app");
  });

  it("accepts the explicit production site URL and removes its trailing slash", () => {
    expect(
      resolveSiteUrl({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://aiwoven.app/",
      })
    ).toBe("https://aiwoven.app");
  });

  it("keeps localhost for development", () => {
    expect(resolveSiteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
  });
});
