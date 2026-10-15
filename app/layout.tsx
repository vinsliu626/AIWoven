import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import Providers from "./providers";
import { SITE_NAME, getSiteUrl } from "@/lib/seo";
import { SiteVisitTracker } from "@/components/analytics/SiteVisitTracker";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "AIWoven: AI Study Assistant for Lecture Notes, Flashcards & Quizzes",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Turn lecture recordings into structured study notes, and course documents into flashcards and explained quizzes. Free AI study assistant for students.",
  keywords: [
    "AIWoven",
    "AI note generator",
    "AI detector",
    "AI study tools",
    "AI humanizer",
    "file converter",
  ],
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
    title: "AIWoven: AI Study Assistant for Lecture Notes, Flashcards & Quizzes",
    description: "Turn lectures into study notes, flashcards, and explained quizzes.",
    url: getSiteUrl(),
    locale: "en_US",
    images: [{ url: "/brand/aiwoven-image2-concept.png", width: 1536, height: 1024, alt: "AIWoven interwoven W brand identity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIWoven: AI Study Assistant for Lecture Notes, Flashcards & Quizzes",
    description: "Turn lectures into study notes, flashcards, and explained quizzes.",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-[var(--background)] text-slate-900 antialiased">
        <Providers><SiteVisitTracker />{children}</Providers>
      </body>
    </html>
  );
}
