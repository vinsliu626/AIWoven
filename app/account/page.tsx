// app/account/page.tsx
"use client";

import { useBillingStatus } from "@/lib/hooks/useBillingStatus";
import { PlanCard } from "@/components/billing/PlanCard";
import { UsageCards } from "@/components/billing/UsageCards";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";
import { WorkspaceBreadcrumb } from "@/components/app/WorkspaceHeader";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function AccountPage() {
  const { data, loading, refresh } = useBillingStatus();
  const { data: session } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <main className="aiwoven-workspace flex min-h-screen bg-[var(--app-canvas)] text-slate-900">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:flex"><AIWovenAppNav isOwner={session?.user?.role === "OWNER"} /></div>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6"><div className="flex items-center gap-2"><button type="button" onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden" aria-label="Open navigation"><svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path d="M3.5 6h13M3.5 10h13M3.5 14h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button><WorkspaceBreadcrumb title="Account" isZh={false} /></div><span className="text-[13px] text-slate-500">{session?.user?.email ?? "Account"}</span></header>
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-7">
        <div><p className="ui-eyebrow">Account</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Plan and usage</h1><p className="mt-2 text-sm text-slate-500">Review access, allowances, and billing status.</p></div>
        <button
          onClick={refresh}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-sm text-slate-500">Loading account status…</div>
        ) : !data?.ok ? (
          <div className="border-l-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
      {mobileNavOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"/><div className="absolute inset-y-0 left-0"><AIWovenAppNav mobile isOwner={session?.user?.role === "OWNER"} onClose={() => setMobileNavOpen(false)} /></div></div> : null}
    </main>
  );
}
