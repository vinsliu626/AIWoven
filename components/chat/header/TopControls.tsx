"use client";

import React from "react";
import { PillSelect, PillOption } from "@/components/chat/ui/PillSelect";

type Mode = "single" | "team" | "detector" | "note";
type ModelKind = "fast" | "quality";
type SingleModelKey = "aiwoven";

export function TopControls({
  isZh,
  isLoading,
  sessionExists,

  mode,
  setMode,

  modelKind,
  setModelKind,

  singleModelKey,
  setSingleModelKey,

  onOpenPlan,

  status,
  userInitial,
  userLabel,
  onSignIn,
  onSignOut,
}: {
  isZh: boolean;
  isLoading: boolean;
  sessionExists: boolean;

  mode: Mode;
  setMode: (m: Mode) => void;

  modelKind: ModelKind;
  setModelKind: (k: ModelKind) => void;

  singleModelKey: SingleModelKey;
  setSingleModelKey: (k: SingleModelKey) => void;

  onOpenPlan: () => void;

  status: "loading" | "authenticated" | "unauthenticated";
  userInitial: string;
  userLabel: string;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const modeOptions: PillOption[] = [
    { value: "single", label: isZh ? "单模型" : "Single model" },
    { value: "team", label: isZh ? "团队协作" : "Team / multi-agent" },
    { value: "detector", label: isZh ? "AI 检测器" : "AI Detector" },
    { value: "note", label: isZh ? "AI 笔记" : "AI Note" },
  ];

  const singleModelOptions: PillOption[] = [
    { value: "aiwoven", label: "AIWoven Assistant" },
  ];

  const teamQualityOptions: PillOption[] = [
    { value: "fast", label: isZh ? "快速" : "Fast" },
    { value: "quality", label: isZh ? "高质量" : "High quality" },
  ];

  return (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1 text-[11px] min-w-[160px]">
          <span className="text-slate-500">{isZh ? "运行模式" : "Mode"}</span>
          <PillSelect
            value={mode}
            options={modeOptions}
            onChange={(v: string) => setMode(v as Mode)}
            disabled={isLoading}
          />
        </div>

        <div className="h-8 w-px bg-gradient-to-b from-slate-50 via-slate-50 to-transparent" />

        <div className="flex flex-col gap-1 text-[11px] min-w-[180px]">
          <span className="text-slate-500">
            {mode === "single"
              ? isZh
                ? "单模型选择"
                : "Model"
              : mode === "team"
              ? isZh
                ? "团队质量"
                : "Team quality"
              : mode === "detector"
              ? isZh
                ? "检测语言"
                : "Language"
              : isZh
              ? "笔记输入"
              : "Input"}
          </span>

          {mode === "single" ? (
            <PillSelect value={singleModelKey} options={singleModelOptions} onChange={(v: string) => setSingleModelKey(v as SingleModelKey)} disabled={isLoading} />
          ) : mode === "team" ? (
            <PillSelect value={modelKind} options={teamQualityOptions} onChange={(v: string) => setModelKind(v as ModelKind)} disabled={isLoading} />
          ) : mode === "detector" ? (
            <div className="w-full rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-900 shadow-inner shadow-slate-900/10">
              English only
            </div>
          ) : (
            <div className="w-full rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] text-slate-900 shadow-inner shadow-slate-900/10">
              {isZh ? "音频 / 录音 / 文本" : "Audio / Record / Text"}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onOpenPlan}
        className="md:hidden px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-900 hover:bg-slate-100 transition"
      >
        {isZh ? "套餐" : "Plan"}
      </button>

      <div className="flex items-center gap-2">
        {status === "loading" ? (
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
        ) : status === "authenticated" ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-xs font-semibold text-white shadow-sm">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col text-[11px] leading-tight">
              <span className="text-slate-900 truncate max-w-[120px]">{userLabel}</span>
              <button onClick={onSignOut} className="text-xs text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline">
                {isZh ? "退出登录" : "Sign out"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-sm transition-all"
          >
            {isZh ? "登录 / 注册" : "Sign in / Sign up"}
          </button>
        )}
      </div>
    </div>
  );
}
