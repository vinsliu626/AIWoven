import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import { QuizMeWorkspacePage } from "@/components/workspace/quiz-me/QuizMeWorkspacePage";

// Personal, sign-in-only workspace: keep it out of search results but let crawlers follow its links.
export const metadata: Metadata = {
  title: "Quiz Me",
  description: "Practice your AIWoven flashcard sets with matching, fill-in-the-blank, and multiple-choice activities.",
  alternates: { canonical: absoluteUrl("/quiz-me") },
  robots: { index: false, follow: true },
};

export default function QuizMePage() {
  return <QuizMeWorkspacePage/>;
}
