import { AIWovenLogo } from "@/components/brand/AIWovenLogo";

export default function Loading() {
  return <main className="grid min-h-screen place-items-center bg-white text-slate-900"><div className="flex flex-col items-center gap-5"><AIWovenLogo/><div className="h-1 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600"/></div><p className="text-[10px] uppercase tracking-[.06em] text-slate-500">Weaving your workspace</p></div></main>;
}
