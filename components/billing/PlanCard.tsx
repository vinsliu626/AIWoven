"use client";

import { BillingStatus } from "@/lib/hooks/useBillingStatus";

function pillClass(ok: boolean) {
  return ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export function PlanCard({ s }: { s: BillingStatus }) {
  const entitled = Boolean(s.entitled);
  return (
    <section className="ui-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-slate-400">Current plan</div>
          <div className="mt-2 text-2xl font-semibold capitalize tracking-tight text-slate-900">{s.plan}</div>
          <div className="mt-2 text-sm text-slate-500">
            Billing status: <span className="font-medium text-slate-800">{s.stripeStatus ?? "Not connected"}</span>
            {s.daysLeft != null ? (
              <span className="ml-2 text-slate-500">({s.daysLeft} days left)</span>
            ) : null}
          </div>
          {s.unlimited ? (
            <div className="mt-1 text-sm text-slate-500">
              Workspace access: <span className="font-medium text-emerald-700">Unlimited</span>
            </div>
          ) : null}
        </div>

        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${pillClass(entitled)}`}>
          {entitled ? "Entitled" : "Not Entitled"}
        </div>
      </div>

      {!entitled && s.plan !== "basic" ? (
        <div className="mt-4 border-l-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Your subscription is not active. Features may be downgraded to Basic.
        </div>
      ) : null}
    </section>
  );
}
