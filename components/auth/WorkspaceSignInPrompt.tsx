"use client";

import { useEffect } from "react";
import { signIn, type ClientSafeProvider } from "next-auth/react";

import { LocalCredentialsForm } from "@/components/auth/LocalCredentialsForm";

type Props = {
  isZh: boolean;
  toolName: string;
  callbackUrl: string;
  providers: ClientSafeProvider[];
  onClose?: () => void;
  modal?: boolean;
};

function SignInContent({ isZh, toolName, callbackUrl, providers, onClose }: Omit<Props, "modal">) {
  const copy = {
    eyebrow: isZh ? "免费账户" : "Free account",
    title: isZh ? `登录后免费使用 ${toolName}` : `Sign in to use ${toolName} for free`,
    body: isZh
      ? "登录即可开始使用免费额度、保存使用记录，并在不同设备间继续工作。无需先选择付费套餐。"
      : "Start with the free plan, save your work, and continue across devices. You do not need to choose a paid plan first.",
    google: isZh ? "使用 Google 继续" : "Continue with Google",
    github: isZh ? "使用 GitHub 继续" : "Continue with GitHub",
    fallback: isZh ? "打开登录页面" : "Open sign-in page",
    privacy: isZh ? "登录即表示你同意 AIWoven 的隐私政策。" : "By continuing, you agree to AIWoven's privacy policy.",
    close: isZh ? "关闭登录提示" : "Close sign-in prompt",
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f17]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}

      <div className="relative">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
          <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            <rect x="5" y="10" width="14" height="10" rx="3" />
            <path d="M12 14v2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[.26em] text-cyan-200/80">{copy.eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">{copy.body}</p>

        <div className="mt-7 space-y-3">
          {providers.map((provider) =>
            provider.id === "e2e-credentials" ? (
              <LocalCredentialsForm key={provider.id} isZh={isZh} />
            ) : (
              <button
                key={provider.id}
                type="button"
                onClick={() => void signIn(provider.id, { callbackUrl })}
                className="flex h-12 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
              >
                <span>{provider.id === "google" ? copy.google : provider.id === "github" ? copy.github : provider.name}</span>
                <span aria-hidden className="text-slate-500">→</span>
              </button>
            )
          )}
          {providers.length === 0 ? (
            <button
              type="button"
              onClick={() => void signIn(undefined, { callbackUrl })}
              className="h-12 w-full rounded-2xl bg-white text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            >
              {copy.fallback}
            </button>
          ) : null}
        </div>

        <p className="mt-5 text-center text-[11px] leading-5 text-slate-600">{copy.privacy}</p>
      </div>
    </div>
  );
}

export function WorkspaceSignInPrompt({ modal = false, onClose, ...props }: Props) {
  useEffect(() => {
    if (!modal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal, onClose]);

  if (!modal) {
    return (
      <section className="flex min-h-[430px] items-center justify-center px-4 py-10" aria-label={props.isZh ? "登录后使用工具" : "Sign in to use this tool"}>
        <SignInContent {...props} />
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm motion-safe:animate-[authPromptIn_.18s_ease-out]" role="dialog" aria-modal="true" aria-label={props.isZh ? "登录后免费使用" : "Sign in to use for free"}>
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label={props.isZh ? "关闭" : "Close"} />
      <SignInContent {...props} onClose={onClose} />
      <style jsx>{`
        @keyframes authPromptIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
