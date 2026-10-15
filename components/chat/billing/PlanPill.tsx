"use client";

import React from "react";
import { PlanId, planLabel } from "./planUtils";

// Kept for API compatibility with existing callers; the enterprise pill needs no global keyframes.
export function PlanPillStyles() {
  return null;
}

export function PlanPillButton({
  isZh,
  plan,
  unlimited,
  onClick,
}: {
  isZh: boolean;
  plan: PlanId;
  unlimited?: boolean;
  onClick: () => void;
}) {
  const name = planLabel(plan, isZh);
  const isFree = plan === "basic";
  const dot = plan === "ultra" ? "bg-violet-500" : plan === "pro" ? "bg-blue-600" : plan === "gift" ? "bg-emerald-500" : "bg-slate-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 pr-1 text-[13px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span className="text-slate-500">{isZh ? "套餐" : "Plan"}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span className="font-semibold text-slate-900">{name}</span>
      {unlimited ? (
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">{isZh ? "无限制" : "Unlimited"}</span>
      ) : null}
      {isFree ? (
        <span className="ml-1 rounded-md bg-blue-600 px-2.5 py-1 text-[12px] font-semibold text-white transition group-hover:bg-blue-700">
          {isZh ? "升级" : "Upgrade"}
        </span>
      ) : (
        <span className="ml-0.5 mr-1.5 text-slate-400" aria-hidden>
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      )}
    </button>
  );
}
