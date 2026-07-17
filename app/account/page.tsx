// app/account/page.tsx
"use client";

import { useBillingStatus } from "@/lib/hooks/useBillingStatus";
import { PlanCard } from "@/components/billing/PlanCard";
import { UsageCards } from "@/components/billing/UsageCards";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";
import { AIWovenLogo } from "@/components/brand/AIWovenLogo";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data, loading, refresh } = useBillingStatus();
  const { data: session } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="aiwoven-workspace flex min-h-screen bg-[#05070b] text-slate-100">
      <AIWovenAppNav isOwner={session?.user?.role === "OWNER"} />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-white/8 px-4 md:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden" aria-label="Open navigation">☰</button><AIWovenLogo className="lg:hidden" /></div><span className="text-xs text-slate-500">{session?.user?.email ?? "Account"}</span></header>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
      <div className="flex items-end justify-between gap-3 border-b border-white/8 pb-7">
        <div><p className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-300">Account workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.045em] text-white md:text-4xl">Plan and usage</h1><p className="mt-2 text-sm text-slate-400">Review access, allowances, and billing status.</p></div>
        <button
          onClick={refresh}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-sm text-slate-500">Loading account status…</div>
        ) : !data?.ok ? (
          <div className="border-l-2 border-red-300/40 bg-red-300/[0.05] px-4 py-3 text-sm text-red-200">
            Failed to load billing status. Are you logged in?
          </div>
        ) : (
          <div className="space-y-8">
            <PlanCard s={data} />
            <UsageCards s={data} />
          </div>
        )}
      </div>
      </div>
      </div>
      {mobileNavOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-black/70" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"/><div className="absolute inset-y-0 left-0"><AIWovenAppNav mobile isOwner={session?.user?.role === "OWNER"} onClose={() => setMobileNavOpen(false)} /></div></div> : null}
    </main>
  );
}
