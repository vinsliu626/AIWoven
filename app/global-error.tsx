"use client";

import { AIWovenLogo } from "@/components/brand/AIWovenLogo";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html><body className="bg-[#05070c]"><main className="grid min-h-screen place-items-center px-6 text-center text-white"><div><AIWovenLogo className="justify-center"/><h1 className="mt-8 text-3xl font-semibold tracking-tight">The workspace hit a loose thread.</h1><p className="mt-3 text-sm text-slate-400">Your data is still in place. Try loading this view again.</p><button type="button" onClick={reset} className="mt-7 rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950">Try again</button></div></main></body></html>;
}
