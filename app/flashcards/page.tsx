import type { Metadata } from "next";
import { FlashcardsWorkspacePage } from "@/components/workspace/flashcards/FlashcardsWorkspacePage";

export const metadata: Metadata = { title: "Flashcards", description: "Create and study private flashcard sets in AIWoven." };

export default function FlashcardsPage() {
  return <FlashcardsWorkspacePage/>;
}
