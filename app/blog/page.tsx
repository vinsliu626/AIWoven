import { BlogIndexPage } from "@/components/blog/BlogIndexPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Study Guides: Lecture Notes, Active Recall & Exam Prep | AIWoven",
  description:
    "Practical study guides for students: turn lecture recordings into notes, study with active recall, prepare for exams, and understand AI detector limits.",
  path: "/blog",
  keywords: ["study guides", "lecture notes", "active recall", "exam preparation", "AI detector accuracy"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function BlogPage() {
  return <BlogIndexPage />;
}
