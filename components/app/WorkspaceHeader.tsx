"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signIn, type ClientSafeProvider } from "next-auth/react";

import { LocalCredentialsForm } from "@/components/auth/LocalCredentialsForm";
import type { ChatMode } from "@/components/chat/ui/workflow/types";

export function workspaceModeTitle(mode: ChatMode, isZh: boolean) {
  switch (mode) {
    case "workflow":
      return isZh ? "工作流对话" : "Workflow chat";
    case "detector":
      return isZh ? "AI 检测器" : "AI Detector";
    case "note":
      return isZh ? "AI 笔记" : "AI Note";
    case "study":
      return isZh ? "AI 学习" : "AI Study";
    case "humanizer":
      return "AI Humanizer";
    case "converter":
      return isZh ? "文件转换" : "File Converter";
    case "normal":
    default:
      return isZh ? "AI 对话" : "AI Chat";
  }
}

export function WorkspaceBreadcrumb({ title, isZh }: { title: string; isZh: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      <span className="hidden text-slate-400 sm:inline">{isZh ? "工作区" : "Workspace"}</span>
      <svg viewBox="0 0 20 20" aria-hidden className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:block"><path d="m8 5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span className="truncate font-semibold text-slate-900">{title}</span>
    </nav>
  );
}

function MenuItem({ children, onClick, tone = "default", href }: { children: ReactNode; onClick?: () => void; tone?: "default" | "danger" | "accent"; href?: string }) {
  const className = `flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition ${
    tone === "danger" ? "text-red-600 hover:bg-red-50" : tone === "accent" ? "font-medium text-blue-700 hover:bg-blue-50" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
  }`;
  if (href) return <a href={href} onClick={onClick} className={className}>{children}</a>;
  return <button type="button" onClick={onClick} className={className}>{children}</button>;
}

export function HeaderAuthMenu({
  isZh,
  sessionExists,
  userInitial,
  userLabel,
  userEmail,
  visibleAuthProviders,
  onOpenAccount,
  onOpenBilling,
  onOpenSettings,
  isOwner = false,
  onSignOut,
}: {
  isZh: boolean;
  sessionExists: boolean;
  userInitial: string;
  userLabel: string;
  userEmail: string;
  visibleAuthProviders: ClientSafeProvider[];
  onOpenAccount: () => void;
  onOpenBilling: () => void;
  onOpenSettings: () => void;
  isOwner?: boolean;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState<"signin" | "account" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const copy = {
    signIn: isZh ? "登录" : "Sign in",
    signInTitle: isZh ? "登录 AIWoven" : "Sign in to AIWoven",
    signInBody: isZh ? "免费开始，随时升级。" : "Start free. Upgrade any time.",
    continueWithGoogle: isZh ? "使用 Google 继续" : "Continue with Google",
    continueWithGitHub: isZh ? "使用 GitHub 继续" : "Continue with GitHub",
    noProviders: isZh ? "当前没有可用的登录方式。" : "No sign-in providers are currently available.",
    account: isZh ? "账户" : "Account",
    billing: isZh ? "套餐与额度" : "Billing",
    settings: isZh ? "设置" : "Settings",
    signOut: isZh ? "退出登录" : "Sign out",
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const panel = "absolute right-0 top-[calc(100%+8px)] z-[70] w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)]";

  return (
    <div ref={menuRef} className="relative">
      {sessionExists ? (
        <button
          type="button"
          data-testid="header-auth-account"
          aria-label="Open account menu"
          aria-expanded={menuOpen === "account"}
          onClick={() => setMenuOpen((current) => (current === "account" ? null : "account"))}
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {String(userInitial).toUpperCase()}
          </span>
          <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
            <span className="max-w-[140px] truncate text-[13px] font-medium text-slate-900">{userLabel}</span>
            <span className="max-w-[140px] truncate text-[11px] text-slate-500">{userEmail}</span>
          </span>
          <svg viewBox="0 0 20 20" aria-hidden className="hidden h-4 w-4 text-slate-400 sm:block"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      ) : (
        <button
          type="button"
          data-testid="header-auth-signin"
          onClick={() => setMenuOpen((current) => (current === "signin" ? null : "signin"))}
          className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {copy.signIn}
        </button>
      )}

      {menuOpen === "signin" && !sessionExists ? (
        <div className={panel}>
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-sm font-semibold text-slate-900">{copy.signInTitle}</p>
            <p className="mt-0.5 text-[12px] text-slate-500">{copy.signInBody}</p>
          </div>
          <div className="space-y-1.5 px-1 pb-1">
            {visibleAuthProviders.map((provider) => provider.id === "e2e-credentials" ? (
              <LocalCredentialsForm key={provider.id} isZh={isZh} />
            ) : (
              <button
                type="button"
                key={provider.id}
                onClick={() => {
                  setMenuOpen(null);
                  signIn(provider.id);
                }}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-800 transition hover:bg-slate-50"
              >
                {provider.id === "google" ? copy.continueWithGoogle : provider.id === "github" ? copy.continueWithGitHub : provider.name}
              </button>
            ))}
            {visibleAuthProviders.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-500">{copy.noProviders}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {menuOpen === "account" && sessionExists ? (
        <div className={panel}>
          <div className="mb-1 border-b border-slate-100 px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-slate-900">{userLabel}</p>
            <p className="truncate text-[12px] text-slate-500">{userEmail}</p>
          </div>
          <MenuItem onClick={() => { setMenuOpen(null); onOpenAccount(); }}>{copy.account}</MenuItem>
          <MenuItem onClick={() => { setMenuOpen(null); onOpenBilling(); }}>{copy.billing}</MenuItem>
          <MenuItem onClick={() => { setMenuOpen(null); onOpenSettings(); }}>{copy.settings}</MenuItem>
          {isOwner ? <MenuItem tone="accent" href="/owner/analytics" onClick={() => setMenuOpen(null)}>Owner Analytics</MenuItem> : null}
          <div className="my-1 border-t border-slate-100" />
          <MenuItem tone="danger" onClick={() => { setMenuOpen(null); onSignOut(); }}>{copy.signOut}</MenuItem>
        </div>
      ) : null}
    </div>
  );
}
