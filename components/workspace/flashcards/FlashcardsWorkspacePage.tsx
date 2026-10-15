"use client";

import { PublicWorkspaceShell } from "@/components/workspace/public/PublicWorkspaceShell";
import { FlashcardsWorkspace } from "./FlashcardsWorkspace";

export function FlashcardsWorkspacePage() {
  return <PublicWorkspaceShell mode="study" title="Flashcards">{({ locked }) => <FlashcardsWorkspace locked={locked}/>}</PublicWorkspaceShell>;
}
