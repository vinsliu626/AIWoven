"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function LocalCredentialsForm({ isZh = false }: { isZh?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await signIn("e2e-credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: window.location.href,
      });

      if (!result?.ok) {
        setError(isZh ? "邮箱或密码不正确。" : "The email or password is incorrect.");
        return;
      }

      window.location.assign(result.url || window.location.href);
    } catch {
      setError(isZh ? "本地登录暂时不可用，请重试。" : "Local sign-in is temporarily unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-3" data-testid="local-credentials-form">
      <div>
        <p className="text-xs font-medium text-cyan-100">{isZh ? "本地测试账号" : "Local test account"}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">{isZh ? "仅在非生产环境可用" : "Available only outside production"}</p>
      </div>
      <label className="block">
        <span className="sr-only">{isZh ? "邮箱" : "Email"}</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={isZh ? "邮箱" : "Email"}
          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/35"
        />
      </label>
      <label className="block">
        <span className="sr-only">{isZh ? "密码" : "Password"}</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isZh ? "密码" : "Password"}
          className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/35"
        />
      </label>
      {error ? <p role="alert" className="text-[10px] leading-4 text-rose-300">{error}</p> : null}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
        {submitting ? (isZh ? "登录中…" : "Signing in…") : (isZh ? "登录" : "Sign in")}
      </button>
    </form>
  );
}
