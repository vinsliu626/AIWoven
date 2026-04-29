"use client";

import { NoteUI } from "@/components/workspace/note/NoteUI";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiNoteWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="note">
      {({ entitlement, locked, isZh, authLoading, refreshEntitlement }) => (
        <ToolLandingPageSection hero={toolPageContent.note}>
          <NoteUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            entitlement={entitlement}
            onUsageRefresh={refreshEntitlement}
          />
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
