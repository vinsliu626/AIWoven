import { NextResponse } from "next/server";
import { generateStructuredNotesSafely } from "@/lib/aiNote/staged";
import { assertQuotaOrThrow, QuotaError } from "@/lib/billing/guard";
import { assertNoteRequestAllowed, getNoteQuotaStatus, markNoteAttempt, NoteLimitError, recordNoteGenerateSuccess } from "@/lib/aiNote/quota";
import { devBypassUserId } from "@/lib/auth/devBypass";
import { getRouteSessionUser } from "@/lib/auth/routeSession";
import type { NextRequest } from "next/server";
import { trackFeatureUsage } from "@/lib/analytics/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function friendlyNoteErrorMessage(code: string, fallback: string) {
  switch (code) {
    case "NOTE_DAILY_LIMIT_REACHED":
      return "You've used all AI Note generations for today.";
    case "NOTE_COOLDOWN_ACTIVE":
      return "Please wait a moment before sending another request.";
    case "NOTE_INPUT_TOO_LARGE":
      return "This text is too long for your current plan.";
    case "NOTE_STAGED_TOO_LARGE":
      return "This input is too large to process safely right now.";
    case "AUTH_REQUIRED":
      return "Please sign in to use AI Notes.";
    default:
      return fallback;
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getRouteSessionUser(req);
    const userId = sessionUser?.id ?? devBypassUserId();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "AUTH_REQUIRED", message: "Please sign in to use AI Notes." }, { status: 401 });
    }

    // Text only. Audio must use the chunked flow (/start → /chunk → /finalize), which
    // checks plan limits and verified duration before any transcription runs.
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, error: "UNSUPPORTED_INPUT", message: "Upload audio from the AI Note upload or record tab." },
        { status: 415 }
      );
    }
    const body = await req.json().catch(() => null);
    const inputText = String(body?.text || "").trim();
    const inputType = "text" as const;

    if (!inputText) {
      return NextResponse.json(
        { ok: false, error: "EMPTY_INPUT", message: "Add text or upload audio before generating notes." },
        { status: 400 }
      );
    }

    const quota = await assertNoteRequestAllowed(userId, inputText.length, { allowStaged: true });
    markNoteAttempt(userId);

    if (quota.mode === "staged") {
      const estimatedSeconds = Math.max(1, Math.round(inputText.trim().split(/\s+/).filter(Boolean).length / 2.5));
      try {
        await assertQuotaOrThrow({ userId, action: "note", amount: estimatedSeconds });
      } catch (error) {
        if (error instanceof QuotaError) {
          return NextResponse.json(
            { ok: false, error: error.code, message: "You've reached your AI Note usage limit for now. Please try again later." },
            { status: error.status ?? 429 }
          );
        }
        throw error;
      }
    }

    const isZh = /[\u4e00-\u9fff]/.test(inputText);
    const maxOutputTokens =
      quota.limits.maxItems <= 8 ? 1_400 : quota.limits.maxItems <= 12 ? 1_700 : 2_000;
    const generated = await generateStructuredNotesSafely({
      text: inputText,
      isZh,
      maxItems: quota.limits.maxItems,
      maxOutputTokens,
      preferStaged: quota.mode === "staged",
    });
    const note = generated.note;

    await recordNoteGenerateSuccess(userId);
    const usage = await getNoteQuotaStatus(userId);
    void trackFeatureUsage({ userId, featureKey: "note", featureName: "AI Note", actionType: "NOTE_USED", pagePath: "/ai-note", metadata: { input_chars: generated.meta.inputChars, mode: generated.meta.mode }, request: req });

    return NextResponse.json({
      ok: true,
      note,
      meta: {
        mode: generated.meta.mode,
        chunkCount: generated.meta.chunkCount,
        inputType,
        inputChars: generated.meta.inputChars,
      },
      usage: {
        usedToday: usage.usedToday,
        remainingToday: usage.remainingToday,
        limit: usage.limits.generatesPerDay,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NOTE_STAGED_TOO_LARGE")) {
      return NextResponse.json(
        { ok: false, error: "NOTE_STAGED_TOO_LARGE", message: friendlyNoteErrorMessage("NOTE_STAGED_TOO_LARGE", error.message) },
        { status: 400 }
      );
    }
    if (error instanceof NoteLimitError) {
      return NextResponse.json(
        { ok: false, error: error.code, message: friendlyNoteErrorMessage(error.code, error.message) },
        { status: error.status }
      );
    }
    if (error instanceof QuotaError) {
      return NextResponse.json(
        { ok: false, error: error.code, message: "You've reached your AI Note usage limit for now. Please try again later." },
        { status: error.status ?? 429 }
      );
    }

    console.error("[/api/ai-note] error:", error);
    return NextResponse.json(
      { ok: false, error: "NOTE_GENERATION_FAILED", message: "Unable to generate notes right now. Please try again." },
      { status: 500 }
    );
  }
}
