"use client";

import { HumanizerUI } from "@/components/workspace/humanizer/HumanizerUI";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiHumanizerWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="humanizer">
      {({ entitlement, locked, isZh, refreshEntitlement }) => (
        <ToolLandingPageSection hero={toolPageContent.humanizer}>
          <HumanizerUI isZh={isZh} locked={locked} entitlement={entitlement} onUsageRefresh={refreshEntitlement} />
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
