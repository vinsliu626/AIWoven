import { BlogIndexPage } from "@/components/blog/BlogIndexPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Blog | AIWoven",
  description:
    "Read AIWoven blog articles on AI study tools, note-taking, AI writing detection, humanizing text, and practical student workflows.",
  path: "/blog",
  keywords: [
    "AIWoven blog",
    "AI tools for students",
    "AI study blog",
    "AI note-taking blog",
    "AI detector guide",
  ],
  robots: {
    index: true,
    follow: true,
  },
});

export default function BlogPage() {
  return <BlogIndexPage />;
}

