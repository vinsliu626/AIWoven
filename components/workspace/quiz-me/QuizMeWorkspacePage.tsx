"use client";

import { PublicWorkspaceShell } from "@/components/workspace/public/PublicWorkspaceShell";
import { QuizMeWorkspace } from "./QuizMeWorkspace";

export function QuizMeWorkspacePage() {
  return <PublicWorkspaceShell mode="study">{({ locked }) => <QuizMeWorkspace locked={locked}/>}</PublicWorkspaceShell>;
}
