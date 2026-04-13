"use client";

import { HumanizerUI } from "@/components/workspace/humanizer/HumanizerUI";

import { CompactRouteIntro, PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiHumanizerWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="humanizer">
      {({ entitlement, locked, isZh, refreshEntitlement }) => (
        <>
          <CompactRouteIntro
            eyebrow="AI Humanizer"
            title="AI Humanizer workspace for rewriting stiff text into more natural phrasing"
            intro="This route opens the NexusDesk AI Humanizer directly. Paste machine-like or awkward text, keep the original meaning, and smooth the wording inside a focused public workspace that search engines can index."
          />
          <HumanizerUI isZh={isZh} locked={locked} entitlement={entitlement} onUsageRefresh={refreshEntitlement} />
        </>
      )}
    </PublicWorkspaceShell>
  );
}
