"use client";

import { StudyUI } from "@/components/workspace/study/StudyUI";

import { CompactRouteIntro, PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiStudyWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="study">
      {({ entitlement, locked, isZh, refreshEntitlement }) => (
        <>
          <CompactRouteIntro
            eyebrow="AI Study"
            title="AI Study workspace for generating notes, flashcards, and quizzes from uploaded documents"
            intro="Use the NexusDesk AI Study workspace directly on this route. Upload PDFs, DOCX files, or slide decks, extract the key material, and turn it into revision-ready outputs from an indexable public page."
          />
          <StudyUI isZh={isZh} locked={locked} entitlement={entitlement} onUsageRefresh={refreshEntitlement} />
        </>
      )}
    </PublicWorkspaceShell>
  );
}
