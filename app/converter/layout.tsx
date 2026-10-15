import type { ReactNode } from "react";

import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Free File Converter: PDF, JPG, PNG & WEBP | AIWoven",
  description:
    "Convert PDF pages to JPG, PNG, or WEBP, and images to PDF or other image formats in the AIWoven converter. Free account required.",
  path: "/converter",
  keywords: ["file converter", "pdf converter", "jpg to png", "png to webp", "jpg to pdf"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function ConverterLayout({ children }: { children: ReactNode }) {
  return children;
}
