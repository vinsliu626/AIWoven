import { AiStudyWorkspacePage } from "@/components/workspace/public/AiStudyWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Study Tools | AIWoven",
  description:
    "Use AIWoven AI Study to turn uploaded documents into notes, flashcards, and quiz sets for faster revision and exam prep.",
  path: "/ai-study",
  keywords: ["AI study tool", "study notes generator", "flashcard generator", "quiz generator"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiStudyPage() {
  return <AiStudyWorkspacePage />;
}
