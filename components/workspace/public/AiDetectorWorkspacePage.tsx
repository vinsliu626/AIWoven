"use client";

import { DetectorUI } from "@/components/workspace/detector/DetectorUI";
import { WorkspaceSignInPrompt } from "@/components/auth/WorkspaceSignInPrompt";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiDetectorWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="detector">
      {({ entitlement, locked, isZh, authLoading, authProviders }) => (
        <ToolLandingPageSection hero={toolPageContent.detector}>
          {locked && !authLoading ? <WorkspaceSignInPrompt isZh={isZh} toolName="AI Detector" callbackUrl="/ai-detector" providers={authProviders} /> : <DetectorUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            canSeeSuspicious={!!entitlement?.canSeeSuspiciousSentences}
          />}
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
