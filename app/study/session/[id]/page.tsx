import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStudySessionById } from "@/lib/study/history";
import { studyCardsFromResult } from "@/lib/study/material";
import { FocusedStudyExperience } from "@/components/workspace/study/FocusedStudyExperience";

export const dynamic = "force-dynamic";

export default async function FocusedStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getServerSession(authOptions);
  const userId = auth?.user?.id;
  if (!userId) redirect("/ai-study");
  const { id } = await params;
  const session = await getStudySessionById(userId, id);
  if (!session || session.status !== "COMPLETED" || !session.resultJson) notFound();
  const cards = studyCardsFromResult(session.resultJson).map((card, index) => ({ id: `${id}-${index}`, ...card }));
  return <FocusedStudyExperience sessionId={id} title={session.title} fileName={session.fileName} cards={cards} notes={session.resultJson.notes ?? []}/>;
}
