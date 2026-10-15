import { AiNoteWorkspacePage } from "@/components/workspace/public/AiNoteWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Note Taker for Lectures: Audio to Study Notes | AIWoven",
  description:
    "Record or upload a lecture and get transcribed, structured study notes with key definitions, concepts, and takeaways. Free AI note taker for students.",
  path: "/ai-note",
  keywords: ["AI note taker", "AI lecture notes", "audio to notes", "lecture transcription", "transcript to notes"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiNotePage() {
  return <AiNoteWorkspacePage />;
}
