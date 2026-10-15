import { AiStudyWorkspacePage } from "@/components/workspace/public/AiStudyWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Flashcard & Quiz Generator from PDF, DOCX, PPTX | AIWoven",
  description:
    "Upload lecture slides or readings and generate AI flashcards, study notes, or a quiz with explanations for every answer. Free for students.",
  path: "/ai-study",
  keywords: ["AI flashcards", "AI flashcard generator", "AI quiz generator", "flashcards from PDF"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiStudyPage() {
  return <AiStudyWorkspacePage />;
}
