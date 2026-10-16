"use client";

import { useMemo, useSyncExternalStore } from "react";

import { ConverterUI, type ConverterEntitlement } from "@/components/workspace/converter/ConverterUI";
import { WorkspaceSignInPrompt } from "@/components/auth/WorkspaceSignInPrompt";
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

type TestModeSearchState = {
  e2eEnabled: boolean;
  e2ePlan: "basic" | "pro" | "ultra";
  e2eUsedToday: number;
  e2eForceFailure: boolean;
};

const subscribeToNothing = () => () => {};
const readTestModeSearch = () => (process.env.NODE_ENV === "production" ? "" : window.location.search);

function parseTestModeSearch(search: string): TestModeSearchState {
  const params = new URLSearchParams(search);
  const planParam = params.get("plan");
  return {
    e2eEnabled: params.get("e2e") === "1",
    e2ePlan: planParam === "pro" || planParam === "ultra" ? planParam : "basic",
    e2eUsedToday: Number.parseInt(params.get("usedToday") ?? "0", 10) || 0,
    e2eForceFailure: params.get("fail") === "conversion",
  };
}

export function ConverterWorkspacePage() {
  // Test-mode query parameters (dev/test only). Read through useSyncExternalStore so the
  // server render and the first client render agree (both see no test mode); reading
  // window.location during the first render made the client tree differ from the server
  // HTML and React discarded it with a hydration error.
  const search = useSyncExternalStore(subscribeToNothing, readTestModeSearch, () => "");
  const searchState = useMemo(() => parseTestModeSearch(search), [search]);

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
      {({ entitlement, locked, isZh, authLoading, authProviders }) => (
        <ToolLandingPageSection hero={toolPageContent.converter}>
          {locked && !authLoading && !e2eEnabled ? <WorkspaceSignInPrompt isZh={isZh} toolName="Converter" callbackUrl="/converter" providers={authProviders} /> : <ConverterUI
            isZh={isZh}
            locked={e2eEnabled ? false : locked || authLoading}
            entitlement={e2eEnabled ? testEntitlement : entitlement}
            testMode={testMode}
          />}
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
