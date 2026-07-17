import { AiDetectorWorkspacePage } from "@/components/workspace/public/AiDetectorWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Detector | AIWoven",
  description:
    "Check text with the AIWoven AI Detector. Review AI-like writing patterns, highlight suspicious passages, and inspect content before publishing.",
  path: "/ai-detector",
  keywords: ["AI detector", "AI content detector", "detect AI writing", "AI text checker"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function AiDetectorPage() {
  return <AiDetectorWorkspacePage />;
}
