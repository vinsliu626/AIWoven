import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import { FlashcardsWorkspacePage } from "@/components/workspace/flashcards/FlashcardsWorkspacePage";

// Personal, sign-in-only workspace: keep it out of search results but let crawlers follow its links.
export const metadata: Metadata = {
  title: "Flashcards",
  description: "Create and study private flashcard sets in AIWoven.",
  alternates: { canonical: absoluteUrl("/flashcards") },
  robots: { index: false, follow: true },
};

export default function FlashcardsPage() {
  return <FlashcardsWorkspacePage/>;
}
