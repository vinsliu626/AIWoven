"use client";

import { StudyUI } from "@/components/workspace/study/StudyUI";
import { WorkspaceSignInPrompt } from "@/components/auth/WorkspaceSignInPrompt";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import type { Entitlement } from "@/components/chat/billing/types";
import type { StudyEntitlement } from "@/components/workspace/study/study-types";
import { getStudyBasePlanLimits, normalizePlan } from "@/lib/plans/productLimits";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

function toStudyEntitlement(entitlement: Entitlement | null): StudyEntitlement | null {
  if (!entitlement) return null;

  const normalizedPlan = normalizePlan(entitlement.plan);
  const defaults = getStudyBasePlanLimits(normalizedPlan);

  return {
    plan: entitlement.plan,
    unlimited: entitlement.unlimited,
    studyGenerationsPerDay: entitlement.studyGenerationsPerDay ?? defaults.generationsPerDay,
    studyMaxFileSizeBytes: entitlement.studyMaxFileSizeBytes ?? defaults.maxFileSizeBytes,
    studyMaxExtractedChars: entitlement.studyMaxExtractedChars ?? defaults.maxExtractedChars,
    studyMaxQuizQuestions: entitlement.studyMaxQuizQuestions ?? defaults.maxQuizQuestions,
    studyMaxSelectableModes: entitlement.studyMaxSelectableModes ?? defaults.maxSelectableModes,
    studyAllowedDifficulties: entitlement.studyAllowedDifficulties ?? defaults.allowedDifficulties,
    usedStudyCountToday: entitlement.usedStudyCountToday ?? 0,
  };
}

export function AiStudyWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="study">
      {({ entitlement, locked, isZh, authLoading, authProviders, refreshEntitlement }) => {
        const studyEntitlement = toStudyEntitlement(entitlement);

        return (
          <ToolLandingPageSection hero={toolPageContent.study}>
            {locked && !authLoading ? <WorkspaceSignInPrompt isZh={isZh} toolName="AI Study" callbackUrl="/ai-study" providers={authProviders} /> : <StudyUI isZh={isZh} locked={locked} entitlement={studyEntitlement} onUsageRefresh={refreshEntitlement} />}
          </ToolLandingPageSection>
        );
      }}
    </PublicWorkspaceShell>
  );
}
