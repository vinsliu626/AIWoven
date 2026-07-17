import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnalyticsAdmin } from "@/lib/analytics/admin";
import { getOwnerAnalyticsSummary } from "@/lib/analytics/summary";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";

export const dynamic = "force-dynamic";

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-t border-white/8 py-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">{value.toLocaleString()}</p></div>;
}

export default async function OwnerAnalyticsPage() {
  const authorization = await requireAnalyticsAdmin();
  if (!authorization.ok) notFound();
  const data = await getOwnerAnalyticsSummary();
  const maxVisits = Math.max(1, ...data.visitTrend.map((item) => item.count));
  const topFeature = [...data.features].sort((a, b) => b.total - a.total)[0];

  return <main className="aiwoven-workspace flex min-h-screen bg-[#05070b] text-slate-100">
    <AIWovenAppNav isOwner />
    <div className="min-w-0 flex-1">
    <header className="border-b border-white/8 bg-[#080a0f]/80"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Owner workspace</p><h1 className="mt-1 text-xl font-semibold">AIWoven Analytics</h1></div><Link href="/ai-study" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300">Back to workspace</Link></div></header>
    <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 md:px-8 md:py-12">
      <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Website traffic</h2><p className="text-sm text-slate-500">Privacy-friendly visits; bots and static requests are excluded.</p></div><p className="text-sm text-slate-500">Top tool: <span className="font-medium text-sky-300">{topFeature?.name ?? "—"}</span></p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><Metric label="Total visits" value={data.visits.total}/><Metric label="Unique visitors" value={data.visits.unique}/><Metric label="Today" value={data.visits.today}/><Metric label="Last 7 days" value={data.visits.last7Days}/><Metric label="Last 30 days" value={data.visits.last30Days}/><Metric label="Signed in" value={data.visits.loggedIn}/><Metric label="Anonymous" value={data.visits.anonymous}/></div></section>
      <section className="border-y border-white/8 py-6"><h2 className="text-lg font-semibold text-slate-50">Daily visits</h2><div className="mt-6 flex h-44 items-end gap-1" aria-label="Daily website visit trend">{data.visitTrend.length ? data.visitTrend.map((item) => <div key={item.date} className="group relative flex-1 rounded-t bg-cyan-400/70" style={{height:`${Math.max(4,(item.count/maxVisits)*100)}%`}} title={`${item.date}: ${item.count}`} />) : <p className="self-center text-sm text-slate-500">No visit data yet.</p>}</div></section>
      <section><h2 className="text-lg font-semibold">Feature usage</h2><div className="mt-4 overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[800px] text-left text-sm text-slate-200"><thead className="border-b border-white/10 bg-black/20 text-xs text-slate-400"><tr>{["Feature","Total","Today","7 days","30 days","Unique users","Last used"].map(h=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data.features.map(item=><tr key={item.key} className="border-b border-white/8 last:border-0"><td className="px-4 py-4 font-medium text-slate-50">{item.name}</td><td className="px-4 py-4">{item.total}</td><td className="px-4 py-4">{item.today}</td><td className="px-4 py-4">{item.last7Days}</td><td className="px-4 py-4">{item.last30Days}</td><td className="px-4 py-4">{item.uniqueUsers}</td><td className="px-4 py-4 text-slate-400">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></section>
      <section><h2 className="text-lg font-semibold">Recent activity</h2><div className="mt-4 divide-y divide-white/8 rounded-3xl border border-white/10 bg-white/[0.04]">{data.recent.length ? data.recent.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-slate-50">{item.featureName}</p><p className="text-xs text-slate-400">{item.actionType} · {item.userId} · {item.pagePath ?? "—"}</p></div><time className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div>) : <p className="p-5 text-sm text-slate-500">No feature activity yet.</p>}</div></section>
    </div></div>
  </main>;
}
