import { Prisma, PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the E2E seed`);
  return value;
}

function assertTestAddress(email: string, name: string) {
  if (!email.toLowerCase().endsWith(".test")) throw new Error(`${name} must use a reserved .test address`);
}

const studyResult: Prisma.InputJsonValue = {
  notes: ["E2E fixture: photosynthesis converts light energy into stored chemical energy."],
  flashcards: [
    { front: "What is photosynthesis?", back: "A process that converts light energy into chemical energy in plants, algae, and some bacteria." },
    { front: "Where do light-dependent reactions occur?", back: "They occur in the thylakoid membranes of chloroplasts, where pigments capture light and produce ATP and NADPH." },
    { front: "Explain how ATP and NADPH support the Calvin cycle without allowing a long explanation to overflow the flashcard viewport.", back: "ATP supplies energy and NADPH supplies reducing power. Together they support carbon fixation and the synthesis of carbohydrate precursors in the chloroplast stroma." },
  ],
  quiz: [
    { type: "multiple_choice", question: "Which organelle performs photosynthesis in plants?", options: ["Chloroplast", "Mitochondrion", "Nucleus", "Ribosome"], answer: "Chloroplast", explanation: "Chloroplasts contain thylakoids and chlorophyll used to capture light energy." },
    { type: "multiple_choice", question: "Which molecule provides reducing power to the Calvin cycle?", options: ["NADPH", "Oxygen", "Carbon dioxide", "Water"], answer: "NADPH", explanation: "NADPH carries high-energy electrons from the light-dependent reactions to the Calvin cycle." },
  ],
  meta: { selectedModes: ["notes", "flashcards", "quiz"], selectedQuizTypes: ["multiple_choice"], difficulty: "medium", generatedCounts: { notes: 1, flashcards: 3, quiz: 2 }, truncated: false, originalCharCount: 1540, usedCharCount: 1540, cached: false, title: "E2E Photosynthesis Study Set", provider: "structured-e2e-fixture", model: "deterministic" },
};

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("E2E seed is disabled in production");
  if (process.env.E2E_AUTH_ENABLED !== "true") throw new Error("E2E_AUTH_ENABLED=true is required");

  const userEmail = required("E2E_USER_EMAIL").toLowerCase();
  const ownerEmail = required("E2E_OWNER_EMAIL").toLowerCase();
  required("E2E_USER_PASSWORD");
  required("E2E_OWNER_PASSWORD");
  assertTestAddress(userEmail, "E2E_USER_EMAIL");
  assertTestAddress(ownerEmail, "E2E_OWNER_EMAIL");
  if (userEmail === ownerEmail) throw new Error("E2E user and owner identities must differ");
  if (required("OWNER_EMAIL").toLowerCase() !== ownerEmail) throw new Error("OWNER_EMAIL must match E2E_OWNER_EMAIL");

  await prisma.$transaction(async (tx) => {
    await tx.userEntitlement.upsert({ where: { userId: userEmail }, create: { userId: userEmail, role: "USER", plan: "basic" }, update: { role: "USER", plan: "basic", unlimited: false, developerBypass: false } });
    await tx.userEntitlement.upsert({ where: { userId: ownerEmail }, create: { userId: ownerEmail, role: "OWNER", plan: "basic" }, update: { role: "OWNER", plan: "basic", unlimited: false, developerBypass: false } });
    await tx.usageEvent.deleteMany({ where: { userId: { in: [userEmail, ownerEmail] }, type: { in: ["study_count", "converter_count"] } } });
    await tx.usageEvent.create({ data: { userId: userEmail, type: "study_count", amount: 100 } });
    await tx.studySession.upsert({
      where: { id: "e2e-owner-study-session" },
      create: { id: "e2e-owner-study-session", userId: ownerEmail, title: "E2E Photosynthesis Study Set", fileName: "photosynthesis-e2e.pdf", fileSizeBytes: 2048, mimeType: "application/pdf", selectedModes: ["notes", "flashcards", "quiz"], selectedQuizTypes: ["multiple_choice"], resultJson: studyResult },
      update: { userId: ownerEmail, title: "E2E Photosynthesis Study Set", selectedModes: ["notes", "flashcards", "quiz"], selectedQuizTypes: ["multiple_choice"], resultJson: studyResult },
    });
    await tx.featureUsageEvent.deleteMany({ where: { id: { in: ["e2e-owner-feature", "e2e-user-feature"] } } });
    await tx.featureUsageEvent.createMany({ data: [
      { id: "e2e-owner-feature", userId: ownerEmail, featureKey: "ai-study", featureName: "AI Study", pagePath: "/ai-study", actionType: "generate", success: true },
      { id: "e2e-user-feature", userId: userEmail, featureKey: "converter", featureName: "Converter", pagePath: "/converter", actionType: "complete", success: true },
    ] });
  });

  console.log("E2E users and deterministic study fixture are ready.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "E2E seed failed");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
