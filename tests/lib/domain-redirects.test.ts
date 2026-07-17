import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("domain migration redirects", () => {
  it("preserves the path while permanently redirecting legacy hosts", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/:path*",
          destination: "https://aiwoven.app/:path*",
          permanent: true,
          has: [{ type: "host", value: "ai-multimodel-erhw.vercel.app" }],
        }),
        expect.objectContaining({
          source: "/:path*",
          destination: "https://aiwoven.app/:path*",
          permanent: true,
          has: [{ type: "host", value: "www.aiwoven.app" }],
        }),
      ])
    );
  });
});
