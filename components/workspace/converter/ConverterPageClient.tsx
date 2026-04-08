"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { ConverterUI, type ConverterEntitlement } from "@/components/workspace/converter/ConverterUI";
import { getConverterPlanLimits } from "@/lib/plans/productLimits";

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

export function ConverterPageClient({ allowE2E }: { allowE2E: boolean }) {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [entitlement, setEntitlement] = useState<ConverterEntitlement | null>(null);
  const [loading, setLoading] = useState(false);

  const e2eEnabled = allowE2E && searchParams.get("e2e") === "1";
  const e2ePlanParam = searchParams.get("plan");
  const e2ePlan = e2ePlanParam === "pro" || e2ePlanParam === "ultra" ? e2ePlanParam : "basic";
  const e2eUsedToday = Number.parseInt(searchParams.get("usedToday") ?? "0", 10) || 0;
  const e2eForceFailure = searchParams.get("fail") === "conversion";
  const effectiveLocked = e2eEnabled ? false : !session;

  useEffect(() => {
    if (e2eEnabled) {
      setEntitlement(buildEntitlement(e2ePlan, e2eUsedToday));
      return;
    }
    if (!session) {
      setEntitlement(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch("/api/billing/status", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!cancelled && response.ok && data?.ok) {
          setEntitlement({
            plan: data.plan,
            usedConverterCountToday: data.usedConverterCountToday,
            converterConversionsPerDay: data.converterConversionsPerDay,
            converterMaxFileSizeBytes: data.converterMaxFileSizeBytes,
            converterBatchMaxFiles: data.converterBatchMaxFiles,
            converterAllowAdvancedVideo: data.converterAllowAdvancedVideo,
            converterAllowLinkToAudio: data.converterAllowLinkToAudio,
            converterPriority: data.converterPriority,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [e2eEnabled, e2ePlan, e2eUsedToday, session]);

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
    <div className="min-h-screen bg-[#030303]">
      {loading && !entitlement && !effectiveLocked ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading Converter...</div>
      ) : (
        <ConverterUI isZh={false} locked={effectiveLocked || status === "loading"} entitlement={entitlement} testMode={testMode} />
      )}
    </div>
  );
}
