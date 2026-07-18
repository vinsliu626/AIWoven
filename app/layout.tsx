import type { Metadata } from "next";

import "./globals.css";
import Providers from "./providers";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";
import { SiteVisitTracker } from "@/components/analytics/SiteVisitTracker";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "AIWoven | AI Note, AI Detector, AI Study, and Converter Tools",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Every study tool, woven into one AI workspace. Record lectures, organize notes, build flashcards and explained quizzes, improve writing, convert files, and work with AIWoven Assistant.",
  keywords: [
    "AIWoven",
    "AI note generator",
    "AI detector",
    "AI study tools",
    "AI humanizer",
    "file converter",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "-V_q2yY-OlZKMUhdL8jAvanAfn1_EIhnFzWLdL-0oRc",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "AIWoven | AI Note, AI Detector, AI Study, and Converter Tools",
    description: "Every study tool, woven into one AI workspace.",
    url: getSiteUrl(),
    locale: "en_US",
    images: [{ url: "/brand/aiwoven-image2-concept.png", width: 1536, height: 1024, alt: "AIWoven interwoven W brand identity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIWoven | AI Note, AI Detector, AI Study, and Converter Tools",
    description: "Every study tool, woven into one AI workspace.",
    images: ["/brand/aiwoven-image2-concept.png"],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950">
        <Providers><SiteVisitTracker />{children}</Providers>
      </body>
    </html>
  );
}
