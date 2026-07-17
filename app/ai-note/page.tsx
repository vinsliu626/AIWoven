import { AiNoteWorkspacePage } from "@/components/workspace/public/AiNoteWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Note Generator | AIWoven",
  description:
    "Turn transcripts, lecture recordings, and source text into structured AI notes with AIWoven. Generate cleaner study notes from audio or text.",
  path: "/ai-note",
  keywords: ["AI note generator", "lecture note generator", "transcript to notes", "audio to notes"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiNotePage() {
  return <AiNoteWorkspacePage />;
}
