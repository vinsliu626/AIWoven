import type { Metadata } from "next";
import { QuizMeWorkspacePage } from "@/components/workspace/quiz-me/QuizMeWorkspacePage";

export const metadata: Metadata = { title: "Quiz Me", description: "Practice your AIWoven flashcard sets with matching, fill-in-the-blank, and multiple-choice activities." };

export default function QuizMePage() {
  return <QuizMeWorkspacePage/>;
}
