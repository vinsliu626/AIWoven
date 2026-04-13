import { AiHumanizerWorkspacePage } from "@/components/workspace/public/AiHumanizerWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Humanizer | NexusDesk",
  description:
    "Rewrite text with the NexusDesk AI Humanizer to improve flow, readability, and natural phrasing while keeping the original meaning intact.",
  path: "/ai-humanizer",
  keywords: ["AI humanizer", "rewrite AI text", "make AI text sound natural", "AI writing humanizer"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiHumanizerPage() {
  return <AiHumanizerWorkspacePage />;
}
