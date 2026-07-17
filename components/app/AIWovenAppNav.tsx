"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AIWovenLogo } from "@/components/brand/AIWovenLogo";

const workItems = [
  ["Chat", "/chat", "C"],
  ["Note", "/ai-note", "N"],
  ["Detect", "/ai-detector", "D"],
  ["Study", "/ai-study", "S"],
  ["Humanizer", "/ai-humanizer", "H"],
  ["Converter", "/converter", "↔"],
] as const;

function NavLink({ label, href, glyph, pathname, onClick }: { label: string; href: string; glyph: string; pathname: string; onClick?: () => void }) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={`group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition ${active ? "bg-white/[0.085] text-white" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"}`}>
      <span className={`grid h-6 w-6 place-items-center rounded-lg border font-mono text-[10px] ${active ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200" : "border-white/8 bg-white/[0.025] text-slate-500 group-hover:text-slate-300"}`}>{glyph}</span>
      <span>{label}</span>
    </Link>
  );
}

export function AIWovenAppNav({ mobile = false, isOwner = false, onClose, onBilling, onSettings }: { mobile?: boolean; isOwner?: boolean; onClose?: () => void; onBilling?: () => void; onSettings?: () => void }) {
  const pathname = usePathname();
  const openAccountSection = (section: "billing" | "settings") => {
    if (section === "billing" && onBilling) onBilling();
    else if (section === "settings" && onSettings) onSettings();
    else window.location.href = `/account#${section}`;
    onClose?.();
  };

  return (
    <aside className={`${mobile ? "flex h-full" : "hidden lg:flex"} w-[228px] shrink-0 flex-col border-r border-white/[0.07] bg-[#080a0f]/96 px-3 py-4`} aria-label="Workspace navigation">
      <Link href="/" onClick={onClose} className="flex h-11 items-center px-2"><AIWovenLogo className="h-7" /></Link>
      <div className="mt-5 px-3 font-mono text-[9px] uppercase tracking-[.22em] text-slate-600">Workspace</div>
      <nav className="mt-2 space-y-1">
        {workItems.map(([label, href, glyph]) => <NavLink key={href} label={label} href={href} glyph={glyph} pathname={pathname} onClick={onClose} />)}
        <NavLink label="History" href="/chat?history=1" glyph="↺" pathname={pathname} onClick={onClose} />
      </nav>

      <div className="mt-auto border-t border-white/[0.07] pt-3">
        {isOwner ? <NavLink label="Owner Analytics" href="/owner/analytics" glyph="A" pathname={pathname} onClick={onClose} /> : null}
        <NavLink label="Account" href="/account" glyph="U" pathname={pathname} onClick={onClose} />
        <button type="button" onClick={() => openAccountSection("billing")} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.045] hover:text-slate-100"><span className="grid h-6 w-6 place-items-center rounded-lg border border-white/8 bg-white/[0.025] font-mono text-[10px]">$</span>Billing</button>
        <button type="button" onClick={() => openAccountSection("settings")} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] text-slate-400 transition hover:bg-white/[0.045] hover:text-slate-100"><span className="grid h-6 w-6 place-items-center rounded-lg border border-white/8 bg-white/[0.025] font-mono text-[10px]">⚙</span>Settings</button>
      </div>
    </aside>
  );
}
