"use client";

import { NoteUI } from "@/components/workspace/note/NoteUI";
import { WorkspaceSignInPrompt } from "@/components/auth/WorkspaceSignInPrompt";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiNoteWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="note">
      {({ entitlement, locked, isZh, authLoading, authProviders, refreshEntitlement }) => (
        <ToolLandingPageSection hero={toolPageContent.note}>
          {locked && !authLoading ? <WorkspaceSignInPrompt isZh={isZh} toolName="AI Note" callbackUrl="/ai-note" providers={authProviders} /> : <NoteUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            entitlement={entitlement}
            onUsageRefresh={refreshEntitlement}
          />}
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
