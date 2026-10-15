import { AiDetectorWorkspacePage } from "@/components/workspace/public/AiDetectorWorkspacePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Detector for Essays & Student Writing | AIWoven",
  description:
    "Check English writing for AI-like patterns with a probability breakdown and highlighted passages. A review signal, not proof of authorship.",
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
