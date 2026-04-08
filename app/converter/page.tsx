import { Suspense } from "react";

import { ConverterPageClient } from "@/components/workspace/converter/ConverterPageClient";

export const dynamic = "force-dynamic";

export default function ConverterPage() {
  const allowE2E = process.env.NODE_ENV !== "production" || process.env.CONVERTER_E2E_BYPASS === "true";
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#030303] text-sm text-slate-400">Loading Converter...</div>}>
      <ConverterPageClient allowE2E={allowE2E} />
    </Suspense>
  );
}
