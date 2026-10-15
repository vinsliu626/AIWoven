"use client";

import { PublicWorkspaceShell } from "@/components/workspace/public/PublicWorkspaceShell";
import { QuizMeWorkspace } from "./QuizMeWorkspace";

export function QuizMeWorkspacePage() {
  return <PublicWorkspaceShell mode="study" title="Quiz Me">{({ locked }) => <QuizMeWorkspace locked={locked}/>}</PublicWorkspaceShell>;
}
