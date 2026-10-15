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

  const perks = isZh
    ? ["免费套餐，无需信用卡", "保存历史记录，跨设备继续", "随时升级以获得更高额度"]
    : ["Free plan — no credit card required", "Save your history and continue on any device", "Upgrade any time for higher limits"];

  return (
    <div className="relative w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] sm:p-8">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </button>
      ) : null}

      <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          <rect x="5" y="10" width="14" height="10" rx="2.5" />
          <path d="M12 14v2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="ui-eyebrow">{copy.eyebrow}</p>
      <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{copy.body}</p>

      <ul className="mt-5 space-y-2">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5 text-[13px] text-slate-600">
            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-emerald-600"><path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {perk}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2.5">
        {providers.map((provider) =>
          provider.id === "e2e-credentials" ? (
            <LocalCredentialsForm key={provider.id} isZh={isZh} />
          ) : (
            <button
              key={provider.id}
              type="button"
              onClick={() => void signIn(provider.id, { callbackUrl })}
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ProviderIcon id={provider.id} />
              <span>{provider.id === "google" ? copy.google : provider.id === "github" ? copy.github : provider.name}</span>
            </button>
          )
        )}
        {providers.length === 0 ? (
          <button
            type="button"
            onClick={() => void signIn(undefined, { callbackUrl })}
            className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {copy.fallback}
          </button>
        ) : null}
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-400">{copy.privacy}</p>
    </div>
  );
}

function ProviderIcon({ id }: { id: string }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]">
        <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-7.9Z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8Z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
      </svg>
    );
  }
  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] fill-slate-900">
        <path d="M12 1.5a10.5 10.5 0 0 0-3.3 20.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7 0-.6 0-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.5 1.1 3.1.9.1-.7.4-1.1.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.7 1.1 1.7 1.1 2.8 0 4-2.4 4.9-4.8 5.2.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5Z" />
      </svg>
    );
  }
  return null;
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
      <section className="flex min-h-[430px] items-center justify-center px-4 py-10 sm:py-14" aria-label={props.isZh ? "登录后使用工具" : "Sign in to use this tool"}>
        <SignInContent {...props} />
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm motion-safe:animate-[authPromptIn_.18s_ease-out]" role="dialog" aria-modal="true" aria-label={props.isZh ? "登录后免费使用" : "Sign in to use for free"}>
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
