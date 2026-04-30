"use client";

import { useMemo, useState } from "react";

import { ConverterUI, type ConverterEntitlement } from "@/components/workspace/converter/ConverterUI";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { getConverterPlanLimits } from "@/lib/plans/productLimits";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

function buildEntitlement(plan: "basic" | "pro" | "ultra", usedToday: number): ConverterEntitlement {
  const limits = getConverterPlanLimits(plan);
  return {
    plan,
    usedConverterCountToday: usedToday,
    converterConversionsPerDay: limits.conversionsPerDay,
    converterMaxFileSizeBytes: limits.maxFileSizeBytes,
    converterBatchMaxFiles: limits.batchMaxFiles,
    converterAllowAdvancedVideo: limits.allowAdvancedVideo,
    converterAllowLinkToAudio: limits.allowLinkToAudio,
    converterPriority: limits.priority,
  };
}

export function ConverterWorkspacePage() {
  const [searchState] = useState<{
    e2eEnabled: boolean;
    e2ePlan: "basic" | "pro" | "ultra";
    e2eUsedToday: number;
    e2eForceFailure: boolean;
  }>(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return {
        e2eEnabled: false,
        e2ePlan: "basic" as "basic" | "pro" | "ultra",
        e2eUsedToday: 0,
        e2eForceFailure: false,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    return {
      e2eEnabled: params.get("e2e") === "1",
      e2ePlan: planParam === "pro" || planParam === "ultra" ? planParam : "basic",
      e2eUsedToday: Number.parseInt(params.get("usedToday") ?? "0", 10) || 0,
      e2eForceFailure: params.get("fail") === "conversion",
    };
  });

  const { e2eEnabled, e2ePlan, e2eUsedToday, e2eForceFailure } = searchState;

  const testEntitlement = useMemo(
    () => (e2eEnabled ? buildEntitlement(e2ePlan, e2eUsedToday) : null),
    [e2eEnabled, e2ePlan, e2eUsedToday]
  );

  const testMode = useMemo(
    () =>
      e2eEnabled
        ? {
            enabled: true,
            dailyUsageStorageKey: `nexusdesk.converter.e2e.${e2ePlan}.${e2eUsedToday}`,
            forceFailure: e2eForceFailure,
          }
        : null,
    [e2eEnabled, e2eForceFailure, e2ePlan, e2eUsedToday]
  );

  return (
    <PublicWorkspaceShell mode="converter">
      {({ entitlement, locked, isZh, authLoading }) => (
        <ToolLandingPageSection hero={toolPageContent.converter}>
          <ConverterUI
            isZh={isZh}
            locked={e2eEnabled ? false : locked || authLoading}
            entitlement={e2eEnabled ? testEntitlement : entitlement}
            testMode={testMode}
          />
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
