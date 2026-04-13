"use client";

import { NoteUI } from "@/components/workspace/note/NoteUI";

import { CompactRouteIntro, PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiNoteWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="note">
      {({ entitlement, locked, isZh, authLoading, refreshEntitlement }) => (
        <>
          <CompactRouteIntro
            eyebrow="AI Note"
            title="AI Note workspace for turning transcripts, recordings, and source text into structured notes"
            intro="Use the NexusDesk AI Note workspace directly on this route. Upload audio, record in the browser, or paste source text, then generate cleaner notes without bouncing through the main chat surface."
          />
          <NoteUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            entitlement={entitlement}
            onUsageRefresh={refreshEntitlement}
          />
        </>
      )}
    </PublicWorkspaceShell>
  );
}
