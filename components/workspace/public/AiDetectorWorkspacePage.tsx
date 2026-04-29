"use client";

import { DetectorUI } from "@/components/workspace/detector/DetectorUI";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiDetectorWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="detector">
      {({ entitlement, locked, isZh, authLoading }) => (
        <ToolLandingPageSection hero={toolPageContent.detector}>
          <DetectorUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            canSeeSuspicious={!!entitlement?.canSeeSuspiciousSentences}
          />
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
