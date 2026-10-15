// app/api/ai-note/process/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retired legacy one-shot endpoint (audio → Groq Whisper → notes).
 *
 * No client in this repository calls it, and it ran transcription and LLM work
 * without plan, quota, or size checks. All audio now goes through
 * /api/ai-note/start → /api/ai-note/chunk → /api/ai-note/finalize, which enforce
 * those limits. Kept as a 410 (like finalize-step) so any unknown caller gets a
 * clear answer; delete once production logs confirm there are no requests.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "DISABLED",
      message: "This endpoint has been retired. Use /api/ai-note/start, /api/ai-note/chunk, and /api/ai-note/finalize.",
    },
    { status: 410 }
  );
}
