"use client";

import { ConverterUI } from "@/components/workspace/converter/ConverterUI";
import { ToolLandingPageSection } from "@/components/seo/ToolLandingPageSection";
import { toolPageContent } from "@/lib/seo/toolPageContent";

import { PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function ConverterWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="converter">
      {({ entitlement, locked, isZh, authLoading }) => (
        <ToolLandingPageSection hero={toolPageContent.converter}>
          <ConverterUI isZh={isZh} locked={locked || authLoading} entitlement={entitlement} />
        </ToolLandingPageSection>
      )}
    </PublicWorkspaceShell>
  );
}
