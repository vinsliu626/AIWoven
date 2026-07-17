"use client";

import { BillingStatus } from "@/lib/hooks/useBillingStatus";
import { fmtHours, fmtNumber, percent } from "@/lib/ui/format";

function Progress({ p }: { p: number }) {
  return (
    <div className="h-1 w-full rounded-full bg-white/8">
      <div className="h-1 rounded-full bg-cyan-300" style={{ width: `${p}%` }} />
    </div>
  );
}

export function UsageCards({ s }: { s: BillingStatus }) {
  const chatLimit = s.chatPerDay; // null = unlimited
  const chatUsed = s.usedChatCountToday;

  const detLimit = s.detectorWordsPerWeek;
  const detUsed = s.usedDetectorWordsThisWeek;

  const noteLimit = s.noteSecondsPerWeek;
  const noteUsed = s.usedNoteSecondsThisWeek;

  const chatP = chatLimit == null ? 0 : percent(chatUsed, chatLimit);
  const detP = detLimit == null ? 0 : percent(detUsed, detLimit);
  const noteP = noteLimit == null ? 0 : percent(noteUsed, noteLimit);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border-t border-white/8 py-5">
        <div className="text-sm text-slate-500">Chat today</div>
        <div className="mt-1 text-xl font-semibold text-white">
          {fmtNumber(chatUsed)}{" "}
          <span className="text-sm font-normal text-slate-500">
            / {chatLimit == null ? "∞" : fmtNumber(chatLimit)}
          </span>
        </div>
        <div className="mt-3">{chatLimit == null ? <div className="text-sm text-emerald-300">Unlimited</div> : <Progress p={chatP} />}</div>
        <div className="mt-2 text-xs text-slate-500">Direct and multi-step chat share this allowance.</div>
      </div>

      <div className="border-t border-white/8 py-5">
        <div className="text-sm text-slate-500">AI Detector this week</div>
        <div className="mt-1 text-xl font-semibold text-white">
          {fmtNumber(detUsed)}{" "}
          <span className="text-sm font-normal text-slate-500">
            / {detLimit == null ? "∞" : fmtNumber(detLimit)} words
          </span>
        </div>
        <div className="mt-3">{detLimit == null ? <div className="text-sm text-emerald-300">Unlimited</div> : <Progress p={detP} />}</div>
      </div>

      <div className="border-t border-white/8 py-5">
        <div className="text-sm text-slate-500">AI Note this week</div>
        <div className="mt-1 text-xl font-semibold text-white">
          {fmtHours(noteUsed)}{" "}
          <span className="text-sm font-normal text-slate-500">
            / {noteLimit == null ? "∞" : fmtHours(noteLimit)}
          </span>
        </div>
        <div className="mt-3">{noteLimit == null ? <div className="text-sm text-emerald-300">Unlimited</div> : <Progress p={noteP} />}</div>
      </div>
    </div>
  );
}
