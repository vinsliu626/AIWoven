import { NextResponse } from "next/server";
import { z } from "zod";
import type { NextRequest } from "next/server";

import { getRouteSessionUser } from "@/lib/auth/routeSession";
import { QuotaError } from "@/lib/billing/guard";
import { isTransientPrismaConnectionError } from "@/lib/prismaRetry";
import { assertConverterQuotaOrThrow } from "@/lib/converter/quota";
import { validateConverterRequest } from "@/lib/converter/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const requestSchema = z.object({
  from: z.enum(["pdf", "docx", "txt", "pptx", "jpg", "png", "webp", "mp3", "wav", "m4a", "mp4", "mov", "extract_audio"]),
  to: z.enum(["pdf", "docx", "txt", "pptx", "jpg", "png", "webp", "mp3", "wav", "m4a", "mp4", "mov", "extract_audio"]),
  fileSizeBytes: z.number().int().min(0).max(200 * 1024 * 1024),
  fileCount: z.number().int().min(1).max(10),
});

function validationErrorMessage(code: string) {
  switch (code) {
    case "FILE_TOO_LARGE":
      return "This file is too large for your current Converter plan.";
    case "BATCH_LIMIT_EXCEEDED":
      return "This plan does not allow that many files in one conversion.";
    case "PLAN_REQUIRED":
    case "ADVANCED_VIDEO_REQUIRED":
      return "This conversion requires a higher Converter plan.";
    default:
      return "This conversion pair is not supported.";
  }
}

function quotaErrorMessage(error: QuotaError) {
  if (error.code === "CONVERTER_QUOTA_EXCEEDED") {
    return "You've used all Converter runs for today. Upgrade your plan or try again tomorrow.";
  }
  return error.message || "Converter is unavailable right now.";
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getRouteSessionUser(req);
    const userId = sessionUser?.id;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
    }

    const body = requestSchema.parse(await req.json());
    const status = await assertConverterQuotaOrThrow(userId);

    const validation = validateConverterRequest({
      plan: status.plan,
      allowAdvancedVideo: status.limits.allowAdvancedVideo,
      from: body.from,
      to: body.to,
      fileSizeBytes: body.fileSizeBytes,
      maxFileSizeBytes: status.limits.maxFileSizeBytes,
      fileCount: body.fileCount,
      batchMaxFiles: status.limits.batchMaxFiles,
    });

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.code, message: validationErrorMessage(validation.code) },
        { status: validation.code === "PLAN_REQUIRED" || validation.code === "ADVANCED_VIDEO_REQUIRED" ? 403 : 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "CONVERTER_NOT_IMPLEMENTED",
        message: "Converter validation passed, but file processing is not enabled in this environment yet.",
        limits: status.limits,
        usage: {
          usedToday: status.usedToday,
          remainingToday: status.remainingToday,
          limit: status.limits.conversionsPerDay,
        },
      },
      { status: 501 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "INVALID_REQUEST", message: error.issues[0]?.message || "Invalid converter request." },
        { status: 400 }
      );
    }
    if (error instanceof QuotaError) {
      return NextResponse.json({ ok: false, error: error.code, message: quotaErrorMessage(error) }, { status: error.status });
    }
    if (isTransientPrismaConnectionError(error)) {
      return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE", message: "Database temporarily unavailable." }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "Converter request failed.";
    console.error("[converter] unexpected error", { message });
    return NextResponse.json({ ok: false, error: "CONVERTER_FAILED", message: "Unable to validate this conversion right now." }, { status: 500 });
  }
}
