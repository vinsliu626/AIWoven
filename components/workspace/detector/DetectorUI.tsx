"use client";

import React, { useMemo, useState } from "react";
import {
  buildCoverageHighlightsFromSentences,
  clampPct,
  countWords,
  hasNonEnglish,
  type DetectorHighlight,
  type DetectorResult,
  type DetectorSentence,
} from "./detector-utils";
import { HighlightEditor } from "./HighlightEditor";

const MIN_WORDS = 80;

const SAMPLE_TEXT =
  "Remote work has reshaped how teams collaborate, communicate, and measure productivity. While many employees appreciate the flexibility of working from home, organizations must address new challenges related to communication, culture, and accountability. Effective remote teams typically rely on clear documentation, predictable meeting rhythms, and shared tools that make progress visible to everyone. Managers play a critical role by setting expectations, offering regular feedback, and creating opportunities for informal connection. Furthermore, companies that invest in asynchronous workflows often find that employees can focus more deeply on complex tasks. Ultimately, the success of remote work depends less on location and more on intentional systems that support trust, transparency, and continuous improvement across the organization.";

type Verdict = {
  label: string;
  headline: string;
  detail: string;
  tone: "ai" | "mixed" | "human";
};

function getVerdict(result: DetectorResult): Verdict {
  const { aiGenerated: ai, humanAiRefined: mixed, humanWritten: human } = result;
  if (ai >= 70) {
    return {
      label: "Likely AI-generated",
      headline: "We are highly confident this text was AI-generated.",
      detail: "Sentence structure and word choice closely match patterns common in AI-written text.",
      tone: "ai",
    };
  }
  if (human >= 70) {
    return {
      label: "Likely human-written",
      headline: "This text appears to be written by a human.",
      detail: "Sentence variation and phrasing suggest low AI detectability.",
      tone: "human",
    };
  }
  if (ai >= mixed && ai >= human) {
    return {
      label: "Possibly AI-generated",
      headline: "This text contains notable AI-like signals.",
      detail: "Parts of the text resemble AI writing. Review the highlighted passages before submitting.",
      tone: "ai",
    };
  }
  if (mixed >= human) {
    return {
      label: "Mixed",
      headline: "This text looks human-written and AI-refined.",
      detail: "The writing blends human phrasing with passages that may have been polished by AI tools.",
      tone: "mixed",
    };
  }
  return {
    label: "Mostly human",
    headline: "This text is most likely written by a human.",
    detail: "A few passages show AI-like patterns, but the overall signal leans human.",
    tone: "human",
  };
}

const toneStyles: Record<Verdict["tone"], { chip: string; ring: string; text: string }> = {
  ai: { chip: "bg-amber-50 text-amber-800 ring-amber-200", ring: "stroke-amber-500", text: "text-amber-600" },
  mixed: { chip: "bg-violet-50 text-violet-800 ring-violet-200", ring: "stroke-violet-500", text: "text-violet-600" },
  human: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", ring: "stroke-emerald-500", text: "text-emerald-600" },
};

function ScoreGauge({ value, tone, label }: { value: number; tone: Verdict["tone"]; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={radius} className="fill-none stroke-slate-100" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={`fill-none transition-[stroke-dashoffset] duration-700 ease-out ${toneStyles[tone].ring}`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xl font-semibold tabular-nums tracking-tight text-slate-900">{Math.round(value)}%</p>
          <p className="-mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Breakdown({ result }: { result: DetectorResult }) {
  const rows = [
    { label: "AI-generated", value: result.aiGenerated, color: "bg-amber-400" },
    { label: "Human & AI-refined", value: result.humanAiRefined, color: "bg-violet-400" },
    { label: "Human-written", value: result.humanWritten, color: "bg-emerald-400" },
  ];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={rows.map((row) => `${row.label} ${Math.round(row.value)}%`).join(", ")}>
        {rows.map((row) => (
          <div key={row.label} className={`${row.color} h-full transition-[width] duration-700 ease-out`} style={{ width: `${row.value}%` }} />
        ))}
      </div>
      <dl className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-[13px]">
            <dt className="flex items-center gap-2 text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-sm ${row.color}`} aria-hidden />
              {row.label}
            </dt>
            <dd className="font-semibold tabular-nums text-slate-900">{Math.round(row.value)}%</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyResults() {
  const steps = [
    ["Paste or type your text", `English only, at least ${MIN_WORDS} words.`],
    ["Run the scan", "We score every sentence for AI-like patterns."],
    ["Review the report", "See the overall probability and highlighted passages."],
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6" /><path d="m15.5 15.5 4 4" /></svg>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">Your report will appear here</h3>
      <p className="mt-1 text-[13px] leading-6 text-slate-500">Get a sentence-level analysis of how likely your text was written by AI.</p>
      <ol className="mt-6 space-y-4">
        {steps.map(([title, body], index) => (
          <li key={title} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-500">{index + 1}</span>
            <div>
              <p className="text-[13px] font-medium text-slate-800">{title}</p>
              <p className="text-[12px] leading-5 text-slate-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LoadingResults() {
  return (
    <div aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
        </span>
        <p className="text-sm font-medium text-slate-800">Analyzing writing patterns…</p>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div className="ui-shimmer h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2.5">
          <div className="ui-shimmer h-4 w-3/4 rounded" />
          <div className="ui-shimmer h-3 w-full rounded" />
          <div className="ui-shimmer h-3 w-2/3 rounded" />
        </div>
      </div>
      <div className="ui-shimmer mt-8 h-2.5 w-full rounded-full" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((item) => <div key={item} className="ui-shimmer h-3 w-full rounded" />)}
      </div>
    </div>
  );
}

function ToolbarButton({ children, onClick, disabled, icon }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span aria-hidden className="text-slate-400">{icon}</span>
      {children}
    </button>
  );
}

export function DetectorUI({
  isLoadingGlobal,
  isZh,
  locked,
  canSeeSuspicious,
}: {
  isLoadingGlobal: boolean;
  isZh: boolean;
  locked: boolean;
  canSeeSuspicious: boolean;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<DetectorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [highlights, setHighlights] = useState<DetectorHighlight[]>([]);
  const [sentences, setSentences] = useState<DetectorSentence[]>([]);

  const words = useMemo(() => countWords(text), [text]);

  function handleTextChange(nextText: string) {
    setText(nextText);
    if (nextText === text) return;
    if (result) setResult(null);
    if (error) setError(null);
    if (notice) setNotice(null);
    if (highlights.length > 0) setHighlights([]);
    if (sentences.length > 0) setSentences([]);
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) handleTextChange(clip);
    } catch {
      setNotice(isZh ? "无法读取剪贴板，请使用 Ctrl/⌘ + V 粘贴。" : "Clipboard access was blocked. Use Ctrl/⌘ + V to paste instead.");
    }
  }

  const englishWarning = useMemo(() => {
    if (!text.trim()) return null;
    if (hasNonEnglish(text)) return "Only English text is supported.";
    return null;
  }, [text]);

  const tooShort = useMemo(() => {
    if (!text.trim()) return false;
    return words < MIN_WORDS;
  }, [text, words]);

  async function detect() {
    if (locked) {
      setError("Please sign in to use AI Detector.");
      return;
    }
    if (loading || isLoadingGlobal) return;

    setError(null);
    setNotice(null);
    setResult(null);
    setHighlights([]);
    setSentences([]);

    const t = text.trim();
    if (!t) {
      setError("Please paste text to begin analysis.");
      return;
    }
    if (countWords(t) < MIN_WORDS) {
      setError(`To analyze text, add at least ${MIN_WORDS} words.`);
      return;
    }
    if (hasNonEnglish(t)) {
      setError("Only English text is supported.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai-detector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, lang: "en" }),
      });

      if (res.status === 429) {
        throw new Error("Weekly detector quota exceeded. Please upgrade.");
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || `Detector API error: ${res.status}`);
      }

      const ai = clampPct(Number(data?.aiGenerated ?? data?.ai ?? 0));
      const humanAi = clampPct(Number(data?.humanAiRefined ?? data?.mixed ?? 0));
      const human = clampPct(Number(data?.humanWritten ?? data?.human ?? 0));

      const sum = ai + humanAi + human;
      const normalized =
        sum !== 100 && sum > 0
          ? {
              aiGenerated: Math.round(ai * (100 / sum)),
              humanAiRefined: Math.round(humanAi * (100 / sum)),
              humanWritten: Math.round(human * (100 / sum)),
            }
          : { aiGenerated: ai, humanAiRefined: humanAi, humanWritten: human };

      setResult(normalized);

      const rawSentences: DetectorSentence[] = Array.isArray(data?.sentences) ? data.sentences : [];
      setSentences(rawSentences);

      const finalHighlights = buildCoverageHighlightsFromSentences(t, rawSentences, normalized.aiGenerated, {
        minSentenceScore: 35,
        contextSentences: 1,
        gapChars: 60,
        minBlockChars: 20,
      });

      setHighlights(finalHighlights);
    } catch (e: unknown) {
      setError(e instanceof Error && e.message ? e.message : "Failed to analyze.");
    } finally {
      setLoading(false);
    }
  }

  const canDetect = !!text.trim() && !tooShort && !englishWarning && !loading && !isLoadingGlobal && !locked;

  const suspiciousSentences = useMemo(() => {
    const arr = sentences
      .slice()
      .filter((s) => typeof s.aiScore === "number" && s.text?.trim())
      .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));

    const base = result?.aiGenerated ?? 0;
    const threshold = base >= 80 ? 35 : base >= 60 ? 40 : base >= 40 ? 45 : 50;
    const filtered = arr.filter((s) => (s.aiScore ?? 0) >= threshold).slice(0, 40);
    if (filtered.length === 0) return arr.slice(0, 20);
    return filtered;
  }, [sentences, result?.aiGenerated]);

  const verdict = result ? getVerdict(result) : null;
  const wordsNeeded = Math.max(0, MIN_WORDS - words);
  const progress = Math.min(100, (words / MIN_WORDS) * 100);
  const inputMessage = error || englishWarning || notice;

  return (
    <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      {/* Input */}
      <section className="ui-card flex min-w-0 flex-col overflow-hidden" aria-label="Text to analyze">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Your text</h2>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">English</span>
          </div>
          <div className="flex items-center gap-0.5">
            <ToolbarButton
              onClick={() => handleTextChange(SAMPLE_TEXT)}
              disabled={loading || locked}
              icon={<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3.5h7l3 3v10H5z" /><path d="M8 9.5h4M8 12.5h4" /></svg>}
            >
              Try a sample
            </ToolbarButton>
            <ToolbarButton
              onClick={() => void pasteFromClipboard()}
              disabled={loading || locked}
              icon={<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="10" height="13" rx="1.5" /><path d="M8 4V3h4v1" /></svg>}
            >
              Paste
            </ToolbarButton>
            <ToolbarButton
              onClick={() => handleTextChange("")}
              disabled={!text || loading}
              icon={<svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 10h6.6L14 6" /></svg>}
            >
              Clear
            </ToolbarButton>
          </div>
        </div>

        {locked ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-800">Sign in to use AI Detector. The Basic plan includes a weekly word allowance.</div>
        ) : null}

        <div className="relative min-h-[420px] flex-1 lg:min-h-[540px]">
          <HighlightEditor
            value={text}
            onChange={handleTextChange}
            highlights={result ? highlights : []}
            placeholder={`Paste your text here to check for AI-generated content (minimum ${MIN_WORDS} words)…`}
            disabled={loading || isLoadingGlobal}
          />
          {loading ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="detector-scan-line h-1/3 w-full bg-gradient-to-b from-transparent via-blue-500/10 to-transparent" />
            </div>
          ) : null}
        </div>

        {inputMessage ? (
          <div role={error ? "alert" : "status"} className={`mx-4 mb-3 rounded-lg border px-3 py-2 text-[13px] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {inputMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-medium tabular-nums text-slate-800">{words.toLocaleString()} words</span>
              {result && highlights.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="h-2.5 w-4 rounded-sm bg-amber-200" aria-hidden /> AI-like passages highlighted
                </span>
              ) : wordsNeeded > 0 && text.trim() ? (
                <span className="text-slate-500">· add {wordsNeeded} more to scan</span>
              ) : null}
            </div>
            {!result && words < MIN_WORDS ? (
              <div className="mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={detect}
            disabled={!canDetect}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                Scanning…
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="9" r="5" /><path d="m13 13 3.5 3.5" /></svg>
                Detect AI
              </>
            )}
          </button>
        </div>
      </section>

      {/* Results */}
      <aside className="ui-card min-w-0 self-start p-5 lg:sticky lg:top-20" aria-label="Detection results" aria-live="polite">
        {loading ? (
          <LoadingResults />
        ) : result && verdict ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Detection report</p>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${toneStyles[verdict.tone].chip}`}>{verdict.label}</span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <ScoreGauge
                value={verdict.tone === "human" ? result.humanWritten : verdict.tone === "mixed" ? result.humanAiRefined : result.aiGenerated}
                label={verdict.tone === "human" ? "Human" : verdict.tone === "mixed" ? "Mixed" : "AI"}
                tone={verdict.tone}
              />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold leading-6 text-slate-900">{verdict.headline}</h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">{verdict.detail}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-[13px] font-semibold text-slate-800">Probability breakdown</p>
              <Breakdown result={result} />
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              {!canSeeSuspicious ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[13px] font-semibold text-slate-900">Sentence-level insights</p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-600">See exactly which sentences look AI-written. Available on Pro, Ultra, and Gift plans.</p>
                </div>
              ) : (
                <details className="group" open={suspiciousSentences.length <= 5}>
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-slate-800">
                    <span>Suspicious sentences <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{suspiciousSentences.length}</span></span>
                    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 text-slate-400 transition group-open:rotate-180"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </summary>
                  <ul className="custom-scrollbar mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {suspiciousSentences.map((sentence, index) => (
                      <li key={index} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold tabular-nums text-amber-700">{Math.round(sentence.aiScore)}% AI</span>
                          {Array.isArray(sentence.reasons) && sentence.reasons.length ? (
                            <span className="truncate text-[11px] text-slate-400">{sentence.reasons.join(" · ")}</span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[13px] leading-5 text-slate-700">{sentence.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <p className="mt-5 text-[11px] leading-5 text-slate-400">
              AI detection is probabilistic. Use this report as one signal alongside your own judgment, not as proof of authorship.
            </p>
          </div>
        ) : (
          <EmptyResults />
        )}
      </aside>
    </div>
  );
}
