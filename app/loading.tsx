import { AIWovenLogo } from "@/components/brand/AIWovenLogo";

export default function Loading() {
  return <main className="grid min-h-screen place-items-center bg-[#05070c] text-white"><div className="flex flex-col items-center gap-5"><AIWovenLogo/><div className="h-1 w-28 overflow-hidden rounded-full bg-white/8"><div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-300"/></div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">Weaving your workspace</p></div></main>;
}
