"use client";

import React from "react";

export type ChatListItem = {
  id: string;
  title: string;
  updatedAt: string | number | Date;
  pinned?: boolean;
};

function fmtTime(d: ChatListItem["updatedAt"]) {
  const date = d instanceof Date ? d : new Date(d);
  // 你截图是：2026/1/30 01:11:08 这种格式
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}:${ss}`;
}

export function ChatHistoryRow({
  item,
  isActive,
  isZh,
  onOpen,
  onRename,
  onDelete,
  onTogglePin,
}: {
  item: ChatListItem;
  isActive?: boolean;
  isZh: boolean;
  onOpen: () => void;
  onRename: (newTitle: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onTogglePin: () => void | Promise<void>;
}) {
  const [openMenu, setOpenMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!openMenu) return;
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [openMenu]);

  async function handleRename() {
    setOpenMenu(false);
    const next = window.prompt(isZh ? "输入新的聊天名称：" : "New chat name:", item.title);
    const trimmed = (next ?? "").trim();
    if (!trimmed || trimmed === item.title) return;
    await onRename(trimmed);
  }

  async function handleDelete() {
    setOpenMenu(false);
    const ok = window.confirm(isZh ? "确定删除这条聊天记录吗？" : "Delete this chat?");
    if (!ok) return;
    await onDelete();
  }

  async function handlePin() {
    setOpenMenu(false);
    await onTogglePin();
  }

  return (
    <div
      className={[
        "group w-full rounded-2xl border px-4 py-3 text-left transition",
        isActive
          ? "border-slate-300 bg-slate-100"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300",
      ].join(" ")}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {item.pinned && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {isZh ? "置顶" : "Pinned"}
              </span>
            )}
            <div className="truncate text-[13px] font-semibold text-slate-900">
              {item.title || (isZh ? "未命名聊天" : "Untitled chat")}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">{fmtTime(item.updatedAt)}</div>
        </div>

        {/* ⋯ 菜单按钮 */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="More"
            onClick={(e) => {
              e.stopPropagation(); // 不要触发 onOpen
              setOpenMenu((v) => !v);
            }}
            className={[
              "h-9 w-9 rounded-full border transition flex items-center justify-center",
              "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
            ].join(" ")}
          >
            ⋯
          </button>

          {openMenu && (
            <div
              className="absolute right-0 mt-2 w-40 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handlePin}
                className="w-full text-left px-3 py-2 text-[12px] text-slate-900 hover:bg-slate-50 transition"
              >
                {item.pinned ? (isZh ? "取消置顶" : "Unpin") : (isZh ? "置顶" : "Pin")}
              </button>

              <button
                type="button"
                onClick={handleRename}
                className="w-full text-left px-3 py-2 text-[12px] text-slate-900 hover:bg-slate-50 transition"
              >
                {isZh ? "重命名" : "Rename"}
              </button>

              <div className="h-px bg-slate-100" />

              <button
                type="button"
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-[12px] text-rose-700 hover:bg-rose-50 transition"
              >
                {isZh ? "删除" : "Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}