import { describe, expect, it } from "vitest";
import { resolvePlaywrightRuntime } from "@/lib/testing/playwrightRuntime";

describe("resolvePlaywrightRuntime", () => {
  it("uses port 3000 by default", () => {
    expect(resolvePlaywrightRuntime({})).toEqual({ baseURL: "http://127.0.0.1:3000", hostname: "127.0.0.1", port: 3000 });
  });

  it("builds a URL from PLAYWRIGHT_PORT", () => {
    expect(resolvePlaywrightRuntime({ PLAYWRIGHT_PORT: "3107" }).baseURL).toBe("http://127.0.0.1:3107");
  });

  it("gives PLAYWRIGHT_BASE_URL precedence and keeps its port", () => {
    expect(resolvePlaywrightRuntime({ PLAYWRIGHT_PORT: "3107", PLAYWRIGHT_BASE_URL: "http://localhost:4111/" })).toEqual({
      baseURL: "http://localhost:4111",
      hostname: "localhost",
      port: 4111,
    });
  });
});
