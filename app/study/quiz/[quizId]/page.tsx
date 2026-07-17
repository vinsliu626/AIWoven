import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getStudySessionById } from "@/lib/study/history";
import { QuizRunner } from "@/components/workspace/study/QuizRunner";

export const dynamic = "force-dynamic";

export default async function StudyQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/ai-study");
  const { quizId } = await params;
  const studySession = await getStudySessionById(userId, quizId);
  if (!studySession || !studySession.resultJson.quiz?.length) notFound();
  return <div className="min-h-screen bg-[#050505] text-slate-100"><QuizRunner quizId={quizId} title={studySession.title} items={studySession.resultJson.quiz} /></div>;
}
