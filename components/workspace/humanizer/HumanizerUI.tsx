"use client";

import { useMemo } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { countHumanizerWords } from "@/lib/humanizer/text";
import { useHumanizerController } from "./useHumanizerController";

type HumanizerEntitlement = {
  plan: "basic" | "pro" | "ultra" | "gift";
  usedHumanizerWordsThisWeek?: number;
  humanizerWordsPerWeek?: number;
  humanizerMaxInputWords?: number;
  humanizerMinInputWords?: number;
};

const SAMPLE_TEXT =
  "In today's rapidly evolving digital landscape, it is important to note that effective communication plays a crucial role in the success of any organization. By leveraging innovative strategies and fostering a culture of collaboration, teams can unlock their full potential and achieve remarkable outcomes. Furthermore, it is essential to recognize that clear and concise messaging enables stakeholders to make informed decisions in a timely manner.";

export function HumanizerUI({
  isZh,
  locked,
  entitlement,
  onUsageRefresh,
}: {
  isZh: boolean;
  locked: boolean;
  entitlement: HumanizerEntitlement | null;
  onUsageRefresh?: () => Promise<void> | void;
}) {
  const ctl = useHumanizerController({ isZh, locked, entitlement, onUsageRefresh });
  const outputWords = useMemo(() => countHumanizerWords(ctl.output), [ctl.output]);

  const helperText = useMemo(() => {
    if (locked) return isZh ? "登录后即可使用 AI Humanizer。" : "Sign in to use AI Humanizer.";
    if (ctl.inputWords > 0 && ctl.inputWords < ctl.minWords) return isZh ? `至少输入 ${ctl.minWords} 个单词后继续。` : `Enter at least ${ctl.minWords} words to continue.`;
    if (ctl.maxWords > 0 && ctl.inputWords > ctl.maxWords) return isZh ? `你当前套餐每次最多允许 ${ctl.maxWords} 个单词。` : `Your plan allows up to ${ctl.maxWords} words per request.`;
    if (ctl.weeklyLimit > 0 && ctl.remainingWeeklyWords <= 0) return isZh ? "你已达到本周 Humanizer 配额上限。" : "You've reached your weekly Humanizer limit.";
    return null;
  }, [ctl.inputWords, ctl.maxWords, ctl.minWords, ctl.remainingWeeklyWords, ctl.weeklyLimit, isZh, locked]);

  const usedWeekly = Math.max(0, ctl.weeklyLimit - ctl.remainingWeeklyWords);
  const usagePct = ctl.weeklyLimit > 0 ? Math.min(100, (usedWeekly / ctl.weeklyLimit) * 100) : 0;
  const overLimit = ctl.maxWords > 0 && ctl.inputWords > ctl.maxWords;

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) ctl.setText(clip);
    } catch {
      // Clipboard permission denied; keyboard paste still works.
    }
  }

  return (
    <div className="w-full">
      <div className="ui-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-500">{isZh ? "风格" : "Mode"}</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[13px] font-semibold text-blue-700">
              <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.4 1.4M13.6 13.6 15 15M5 15l1.4-1.4M13.6 6.4 15 5" /></svg>
              {isZh ? "自然润色" : "Natural"}
            </span>
            <span className="hidden text-[12px] text-slate-400 sm:inline">{isZh ? "保留原意，轻度改写" : "Keeps your meaning, lightly rewrites"}</span>
          </div>
          {ctl.weeklyLimit > 0 ? (
            <div className="flex items-center gap-2.5 text-[12px] text-slate-500">
              <span className="tabular-nums">
                {isZh ? "本周已用" : "Weekly usage"}{" "}
                <span className="font-semibold text-slate-800">{usedWeekly.toLocaleString()}</span> / {ctl.weeklyLimit.toLocaleString()} {isZh ? "词" : "words"}
              </span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <span className={`block h-full rounded-full ${usagePct >= 90 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${usagePct}%` }} />
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-2">
          {/* Input pane */}
          <div className="flex min-w-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="relative min-h-[380px] flex-1 lg:min-h-[500px]">
              <textarea
                value={ctl.text}
                onChange={(event) => ctl.setText(event.target.value)}
                placeholder={isZh ? "在这里粘贴或输入你想润色的文本（至少 20 个单词）…" : "Paste or type the text you want to humanize (at least 20 words)…"}
                aria-label={isZh ? "输入文本" : "Input text"}
                className="custom-scrollbar absolute inset-0 h-full w-full resize-none bg-white px-5 py-4 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                disabled={ctl.loading || locked}
              />
              {!ctl.text && !locked ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto flex gap-2 pt-16">
                    <button type="button" onClick={() => ctl.setText(SAMPLE_TEXT)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h7l3 3v10H5z" /><path d="M8 9.5h4M8 12.5h4" /></svg>
                      {isZh ? "试用示例" : "Try a sample"}
                    </button>
                    <button type="button" onClick={() => void pasteFromClipboard()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="10" height="13" rx="1.5" /><path d="M8 4V3h4v1" /></svg>
                      {isZh ? "粘贴文本" : "Paste text"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3 text-[13px]">
                <span className={`font-medium tabular-nums ${overLimit ? "text-red-600" : "text-slate-800"}`}>
                  {ctl.inputWords.toLocaleString()}{ctl.maxWords > 0 ? ` / ${ctl.maxWords.toLocaleString()}` : ""} {isZh ? "词" : "words"}
                </span>
                {ctl.text ? (
                  <button type="button" onClick={() => ctl.setText("")} disabled={ctl.loading} className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline disabled:opacity-40">
                    {isZh ? "清空" : "Clear"}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void ctl.humanize()}
                disabled={!ctl.canSubmit}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {ctl.loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                    {isZh ? "处理中..." : "Humanizing..."}
                  </>
                ) : (
                  <>{isZh ? "开始润色" : "Humanize"}</>
                )}
              </button>
            </div>
          </div>

          {/* Output pane */}
          <div className="flex min-w-0 flex-col bg-slate-50/40">
            <div className="custom-scrollbar relative min-h-[380px] flex-1 overflow-y-auto px-5 py-4 lg:min-h-[500px]" aria-live="polite">
              {ctl.loading ? (
                <div className="space-y-3 pt-1" aria-busy="true">
                  {[92, 100, 86, 97, 74, 90, 60].map((width, index) => (
                    <div key={index} className="ui-shimmer h-3.5 rounded" style={{ width: `${width}%` }} />
                  ))}
                </div>
              ) : ctl.output ? (
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-900">{ctl.output}</p>
              ) : (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9Z" /><path d="M9.5 18h5M10.5 21h3" /></svg>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{isZh ? "润色结果将显示在这里" : "Your humanized text will appear here"}</p>
                  <p className="mt-1 max-w-xs text-[13px] leading-5 text-slate-500">
                    {isZh ? "更自然的措辞、更顺的节奏，并尽量少改动原文。" : "Smoother flow and more natural wording, with minimal changes to your original."}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3">
              <span className="text-[13px] font-medium tabular-nums text-slate-800">{outputWords.toLocaleString()} {isZh ? "词" : "words"}</span>
              <CopyButton text={ctl.output} />
            </div>
          </div>
        </div>
      </div>

      {ctl.error || helperText || ctl.success ? (
        <div
          role={ctl.error ? "alert" : "status"}
          className={`mt-3 rounded-lg border px-3.5 py-2.5 text-[13px] ${
            ctl.error ? "border-red-200 bg-red-50 text-red-700" : ctl.success && !helperText ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {ctl.error || helperText || ctl.success}
        </div>
      ) : null}
    </div>
  );
}
