"use client";

import { DetectorUI } from "@/components/workspace/detector/DetectorUI";

import { CompactRouteIntro, PublicWorkspaceShell } from "./PublicWorkspaceShell";

export function AiDetectorWorkspacePage() {
  return (
    <PublicWorkspaceShell mode="detector">
      {({ entitlement, locked, isZh, authLoading }) => (
        <>
          <CompactRouteIntro
            eyebrow="AI Detector"
            title="AI Detector workspace for checking text, reviewing suspicious passages, and understanding AI-like writing patterns"
            intro="This route opens the NexusDesk AI Detector directly. Paste English text, run the detector, review flagged sections, and inspect how machine-like the writing appears from a single indexable product page."
          />
          <DetectorUI
            isLoadingGlobal={authLoading}
            isZh={isZh}
            locked={locked}
            canSeeSuspicious={!!entitlement?.canSeeSuspiciousSentences}
          />
        </>
      )}
    </PublicWorkspaceShell>
  );
}
