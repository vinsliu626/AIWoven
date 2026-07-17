"use client";

import { BillingStatus } from "@/lib/hooks/useBillingStatus";

function pillClass(ok: boolean) {
  return ok
    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
    : "border-amber-300/20 bg-amber-300/10 text-amber-200";
}

export function PlanCard({ s }: { s: BillingStatus }) {
  const entitled = Boolean(s.entitled);
  return (
    <section className="border-y border-white/8 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.22em] text-slate-500">Current plan</div>
          <div className="mt-2 text-3xl font-semibold tracking-[-.04em] text-white">{s.plan.toUpperCase()}</div>
          <div className="mt-2 text-sm text-slate-400">
            Billing status: <span className="font-medium text-slate-200">{s.stripeStatus ?? "Not connected"}</span>
            {s.daysLeft != null ? (
              <span className="ml-2 text-slate-500">({s.daysLeft} days left)</span>
            ) : null}
          </div>
          {s.unlimited ? (
            <div className="mt-1 text-sm text-slate-400">
              Workspace access: <span className="font-medium text-emerald-200">Unlimited</span>
            </div>
          ) : null}
        </div>

        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${pillClass(entitled)}`}>
          {entitled ? "Entitled" : "Not Entitled"}
        </div>
      </div>

      {!entitled && s.plan !== "basic" ? (
        <div className="mt-4 border-l-2 border-amber-300/40 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">
          Your subscription is not active. Features may be downgraded to Basic.
        </div>
      ) : null}
    </section>
  );
}
