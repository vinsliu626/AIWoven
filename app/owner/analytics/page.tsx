import Link from "next/link";
import { buildPrivateMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { requireAnalyticsAdmin } from "@/lib/analytics/admin";
import { getOwnerAnalyticsSummary } from "@/lib/analytics/summary";
import { AIWovenAppNav } from "@/components/app/AIWovenAppNav";

export const dynamic = "force-dynamic";

export const metadata = buildPrivateMetadata({ title: "Owner Analytics | AIWoven", path: "/owner/analytics" });

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border-t border-slate-200 py-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value.toLocaleString()}</p></div>;
}

export default async function OwnerAnalyticsPage() {
  const authorization = await requireAnalyticsAdmin();
  if (!authorization.ok) notFound();
  const data = await getOwnerAnalyticsSummary();
  const maxVisits = Math.max(1, ...data.visitTrend.map((item) => item.count));
  const topFeature = [...data.features].sort((a, b) => b.total - a.total)[0];

  return <main className="aiwoven-workspace flex min-h-screen bg-white text-slate-900">
    <AIWovenAppNav isOwner />
    <div className="min-w-0 flex-1">
    <header className="border-b border-slate-200 bg-white/90"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div><p className="text-[10px] uppercase tracking-[.06em] text-blue-700">Owner workspace</p><h1 className="mt-1 text-xl font-semibold">AIWoven Analytics</h1></div><Link href="/ai-study" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">Back to workspace</Link></div></header>
    <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 md:px-8 md:py-12">
      <section><div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold">Website traffic</h2><p className="text-sm text-slate-500">Privacy-friendly visits; bots and static requests are excluded.</p></div><p className="text-sm text-slate-500">Top tool: <span className="font-medium text-sky-700">{topFeature?.name ?? "—"}</span></p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><Metric label="Total visits" value={data.visits.total}/><Metric label="Unique visitors" value={data.visits.unique}/><Metric label="Today" value={data.visits.today}/><Metric label="Last 7 days" value={data.visits.last7Days}/><Metric label="Last 30 days" value={data.visits.last30Days}/><Metric label="Signed in" value={data.visits.loggedIn}/><Metric label="Anonymous" value={data.visits.anonymous}/></div></section>
      <section className="border-y border-slate-200 py-6"><h2 className="text-lg font-semibold text-slate-900">Daily visits</h2><div className="mt-6 flex h-44 items-end gap-1" aria-label="Daily website visit trend">{data.visitTrend.length ? data.visitTrend.map((item) => <div key={item.date} className="group relative max-w-12 flex-1 rounded-t bg-blue-500 transition hover:bg-blue-600" style={{height:`${Math.max(4,(item.count/maxVisits)*100)}%`}} title={`${item.date}: ${item.count}`} />) : <p className="self-center text-sm text-slate-500">No visit data yet.</p>}</div></section>
      <section><h2 className="text-lg font-semibold">Feature usage</h2><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50"><table className="w-full min-w-[800px] text-left text-sm text-slate-800"><thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500"><tr>{["Feature","Total","Today","7 days","30 days","Unique users","Last used"].map(h=><th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data.features.map(item=><tr key={item.key} className="border-b border-slate-200 last:border-0"><td className="px-4 py-4 font-medium text-slate-900">{item.name}</td><td className="px-4 py-4">{item.total}</td><td className="px-4 py-4">{item.today}</td><td className="px-4 py-4">{item.last7Days}</td><td className="px-4 py-4">{item.last30Days}</td><td className="px-4 py-4">{item.uniqueUsers}</td><td className="px-4 py-4 text-slate-500">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table></div></section>
      <section><h2 className="text-lg font-semibold">Recent activity</h2><div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50">{data.recent.length ? data.recent.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-slate-900">{item.featureName}</p><p className="text-xs text-slate-500">{item.actionType} · {item.userId} · {item.pagePath ?? "—"}</p></div><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></div>) : <p className="p-5 text-sm text-slate-500">No feature activity yet.</p>}</div></section>
    </div></div>
  </main>;
}
