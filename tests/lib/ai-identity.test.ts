import { describe, expect, it } from "vitest";
import { AIWOVEN_IDENTITY_PROMPT, toPublicAiStage } from "@/lib/ai/identity";

describe("AIWoven Assistant identity boundary", () => {
  it("sets a neutral, truthful product identity", () => {
    expect(AIWOVEN_IDENTITY_PROMPT).toContain("You are AIWoven Assistant");
    expect(AIWOVEN_IDENTITY_PROMPT).toContain("does not expose the active provider or model");
    expect(AIWOVEN_IDENTITY_PROMPT).toContain("Do not volunteer or claim a specific underlying provider");
  });

  it("removes routing metadata from public stage payloads", () => {
    const internal = { stage: "writer" as const, content: "Answer", provider: "internal", model: "internal-id", routingDecision: "fallback" };
    expect(toPublicAiStage(internal)).toEqual({ stage: "writer", content: "Answer" });
    expect(toPublicAiStage(internal)).not.toHaveProperty("provider");
    expect(toPublicAiStage(internal)).not.toHaveProperty("model");
    expect(toPublicAiStage(internal)).not.toHaveProperty("routingDecision");
  });
});
