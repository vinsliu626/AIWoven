"use client";

import { ConverterUI } from "@/components/workspace/converter/ConverterUI";

import { CompactRouteIntro, PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function ConverterWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="converter">
      {({ entitlement, locked, isZh, authLoading }) => (
        <>
          <CompactRouteIntro
            eyebrow="Converter"
            title="File converter workspace for common document, image, audio, and media conversions"
            intro="Use the NexusDesk converter directly on this route. Choose a source format, pick a target format, and run plan-aware file conversions from a clean public workspace instead of a mixed app surface."
          />
          <ConverterUI isZh={isZh} locked={locked || authLoading} entitlement={entitlement} />
        </>
      )}
    </PublicWorkspaceShell>
  );
}
