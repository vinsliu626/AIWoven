import { SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Convert PDF to JPG | AIWoven",
  description:
    "Use AIWoven to convert PDF to JPG with a clean file conversion workflow. Open the converter and move from PDF pages to JPG output.",
  path: "/convert-pdf-to-jpg",
  keywords: ["convert pdf to jpg", "pdf to jpg converter", "pdf page to jpg"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function ConvertPdfToJpgPage() {
  return (
    <SeoLandingPage
      eyebrow="PDF to JPG"
      title="Convert PDF to JPG with the AIWoven converter"
      intro="Need to convert PDF to JPG for sharing, previews, or image-based workflows? This page explains the AIWoven PDF to JPG path and links directly to the converter workspace."
      paragraphs={[
        "A PDF to JPG converter turns each page of a PDF into an image. Students use it to drop a lecture slide into notes or a presentation, share a single page of a handout in a group chat, or add a diagram to a flashcard.",
        "In AIWoven, open the Converter, choose PDF as the source and JPG as the target, then upload your file. PDF can also be converted to PNG (sharper text and line art) or WEBP (smaller files). Conversions require a free account and follow your plan’s file-size and daily limits.",
        "Tip: if you want flashcards or a quiz from a PDF rather than images, upload it to AI Study instead—it reads the document text directly.",
      ]}
      ctaHref="/converter"
      ctaLabel="Open Converter"
      secondaryHref="/jpg-to-pdf"
      secondaryLabel="See JPG to PDF"
      highlights={[
        "Turn PDF pages into JPG, PNG, or WEBP images.",
        "Useful for slides, handouts, and diagrams you want to reuse.",
        "Free account required; plan limits apply.",
      ]}
      relatedLinks={[
        { href: "/jpg-to-png", label: "JPG to PNG landing page" },
        { href: "/png-to-webp", label: "PNG to WEBP landing page" },
        { href: "/jpg-to-pdf", label: "JPG to PDF landing page" },
        { href: "/converter", label: "Converter workspace" },
      ]}
      faq={[
        {
          question: "Why convert PDF to JPG?",
          answer: "JPG images are easy to paste into notes, slides, chats, and flashcards, and they open on almost any device without a PDF reader.",
        },
        {
          question: "Should I choose JPG or PNG?",
          answer: "JPG gives smaller files for photos and scanned pages. PNG keeps text and line drawings sharper, which is often better for slides and diagrams.",
        },
        {
          question: "Can I make flashcards from a PDF instead?",
          answer: "Yes. Upload the PDF to AI Study to generate notes, flashcards, or an explained quiz from its text.",
        },
      ]}
    />
  );
}
