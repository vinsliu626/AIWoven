import { AIWovenHome } from "@/components/marketing/AIWovenHome";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AIWoven: AI Study Assistant for Lecture Notes, Flashcards & Quizzes",
  description:
    "Turn lecture recordings into structured study notes, and course documents into flashcards and explained quizzes. Free AI study assistant for students.",
  path: "/",
  keywords: ["AI study assistant", "AI note taker", "AI lecture notes", "AI flashcards", "study tools for students"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function Home() {
  return <AIWovenHome />;
}
