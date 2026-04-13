"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatMode, Lang } from "./types";

type ModeItem = {
  value: ChatMode;
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
};

const MODE_ITEMS: ModeItem[] = [
  { value: "normal", title: { en: "Chat / Normal", zh: "聊天 / 普通" }, desc: { en: "Fast, classic chat", zh: "快速、直接的经典对话" } },
  { value: "workflow", title: { en: "Chat / Workflow", zh: "聊天 / 工作流" }, desc: { en: "Planner, Writer, Reviewer", zh: "规划、撰写、审阅协作" } },
  { value: "detector", title: { en: "AI Detector", zh: "AI 检测器" }, desc: { en: "Detect AI-like writing patterns", zh: "检测文本中的 AI 写作痕迹" } },
  { value: "note", title: { en: "AI Note", zh: "AI 笔记" }, desc: { en: "Generate notes from audio or text", zh: "把音频或文本整理成结构化笔记" } },
  { value: "study", title: { en: "AI Study", zh: "AI 学习" }, desc: { en: "Notes, flashcards, and quizzes", zh: "生成笔记、卡片和测验" } },
  { value: "humanizer", title: { en: "AI Humanizer", zh: "AI Humanizer" }, desc: { en: "Rewrite for better flow and readability", zh: "让表达更自然、更顺畅" } },
  {
    value: "converter",
    title: { en: "Converter", zh: "转换器" },
    desc: { en: "Convert documents, images, audio, and common media formats", zh: "转换文档、图片、音频和常见媒体格式" },
  },
];

function labelFor(mode: ChatMode, lang: Lang) {
  return MODE_ITEMS.find((item) => item.value === mode)?.title[lang] ?? mode;
}

export function ModeDropdown({
  value,
  onChange,
  lang,
  disabled,
}: {
  value: ChatMode;
  onChange: (m: ChatMode) => void;
  lang: Lang;
  disabled?: boolean;
}) {
  const isZh = lang === "zh";
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(
    () =>
      MODE_ITEMS.map((item) => ({
        value: item.value,
        title: item.title[lang],
        desc: item.desc[lang],
      })),
    [lang]
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = 300;
      const padding = 16;
      const left = Math.min(
        Math.max(padding, rect.right - width),
        Math.max(padding, window.innerWidth - width - padding)
      );

      setMenuPosition({
        top: rect.bottom + 8,
        left,
        width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  const menu = open && menuPosition
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[60] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
        >
          <div className="border-b border-white/5 px-3 py-2 text-[11px] text-slate-400">
            {isZh ? "选择工作区" : "Choose a workspace"}
          </div>

          <div className="p-1">
            {items.map((item) => {
              const active = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={["w-full rounded-xl px-3 py-2 text-left transition", active ? "bg-white/10" : "hover:bg-white/10"].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-100">{item.title}</div>
                    {active ? <div className="text-xs text-emerald-300">✓</div> : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-xs text-slate-100 transition hover:bg-white/10",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
        title={isZh ? "切换工作区" : "Switch workspace"}
      >
        <span className="text-slate-200">{labelFor(value, lang)}</span>
        <span className="text-slate-400">▼</span>
      </button>

      {menu}
    </div>
  );
}
