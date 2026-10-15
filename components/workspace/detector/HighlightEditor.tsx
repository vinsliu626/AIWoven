"use client";
import React from "react";
import type { DetectorHighlight } from "./detector-utils";

function normalizeHighlights(text: string, highlights: DetectorHighlight[]) {
  const sorted = [...highlights]
    .filter((h) => Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start)
    .map((h) => ({
      ...h,
      start: Math.max(0, Math.min(text.length, h.start)),
      end: Math.max(0, Math.min(text.length, h.end)),
    }))
    .sort((a, b) => a.start - b.start);

  const merged: DetectorHighlight[] = [];
  for (const h of sorted) {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end) {
      last.end = Math.max(last.end, h.end);
      last.severity = Math.max(last.severity ?? 0, h.severity ?? 0);
    } else {
      merged.push({ ...h });
    }
  }
  return merged;
}

function renderHighlightedText(text: string, highlights: DetectorHighlight[]) {
  if (!text) return null;

  const normalized = normalizeHighlights(text, highlights);
  if (normalized.length === 0) {
    return <span>{text}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  normalized.forEach((highlight, index) => {
    if (cursor < highlight.start) {
      nodes.push(<span key={`text-${index}`}>{text.slice(cursor, highlight.start)}</span>);
    }

    nodes.push(
      <mark
        key={`mark-${index}`}
        className="rounded-sm bg-amber-200/80 px-0.5 py-[1px] text-slate-900 underline decoration-amber-500/60 decoration-2 underline-offset-[3px]"
        title={highlight.label || "AI-like"}
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>
    );

    cursor = highlight.end;
  });

  if (cursor < text.length) {
    nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return nodes;
}

export function HighlightEditor({
  value,
  onChange,
  highlights,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  highlights: DetectorHighlight[];
  placeholder: string;
  disabled?: boolean;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [isEditing, setIsEditing] = React.useState(true);
  const hasHighlights = value.trim().length > 0 && highlights.length > 0;

  React.useEffect(() => {
    setIsEditing(!hasHighlights);
  }, [hasHighlights]);

  React.useEffect(() => {
    if (!isEditing) return;
    textareaRef.current?.focus();
  }, [isEditing]);

  const sharedTextStyle =
    "h-full w-full px-5 py-4 text-[15px] leading-7 font-sans whitespace-pre-wrap break-words";

  return (
    <div className="absolute inset-0 overflow-hidden bg-white">
      {hasHighlights && !isEditing ? (
        <div
          role="textbox"
          aria-readonly="true"
          tabIndex={0}
          title="Double-click to edit"
          onDoubleClick={() => setIsEditing(true)}
          className={[
            sharedTextStyle,
            "overflow-auto purple-scrollbar scroll-stable",
            "text-slate-900 selection:bg-blue-100 selection:text-slate-900",
            "cursor-text",
          ].join(" ")}
        >
          {renderHighlightedText(value, highlights)}
        </div>
      ) : null}
      {hasHighlights && !isEditing ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="absolute right-4 top-3 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white/95 px-2.5 py-1 text-[12px] font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-slate-50 hover:text-slate-900"
        >
          <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12.5 4.5 3 3L7 16H4v-3z" /></svg>
          Edit text
        </button>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={[
            "h-full w-full resize-none overflow-auto purple-scrollbar scroll-stable",
            sharedTextStyle,
            "bg-transparent text-slate-900 caret-slate-900",
            "placeholder:text-slate-400",
            "selection:bg-blue-100",
            "focus:outline-none",
          ].join(" ")}
          spellCheck={false}
        />
      )}
    </div>
  );
}
