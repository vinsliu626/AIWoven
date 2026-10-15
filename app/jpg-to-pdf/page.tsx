import { SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "JPG to PDF Converter | AIWoven",
  description:
    "Convert JPG to PDF with AIWoven when you need image files packaged as a shareable document format.",
  path: "/jpg-to-pdf",
  keywords: ["jpg to pdf", "convert jpg to pdf", "image to pdf converter"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function JpgToPdfPage() {
  return (
    <SeoLandingPage
      eyebrow="JPG to PDF"
      title="Convert JPG to PDF for shareable document output"
      intro="JPG to PDF is useful when you need image files turned into a document that is easier to send, archive, or include in a workflow that expects PDF output."
      paragraphs={[
        "JPG to PDF is the quickest way to turn photos of handouts, whiteboards, or handwritten notes into a document you can file, share, or submit.",
        "In AIWoven, open the Converter, choose JPG as the source and PDF as the target, and upload your image. PNG images can be converted to PDF too. Conversions require a free account and follow your plan’s file-size and daily limits.",
        "Keeping scans as PDFs makes them easier to organize alongside lecture slides—and a PDF can later be uploaded to AI Study to generate flashcards or a quiz.",
      ]}
      ctaHref="/converter"
      ctaLabel="Open Converter"
      secondaryHref="/convert-pdf-to-jpg"
      secondaryLabel="See PDF to JPG"
      highlights={[
        "Turn photos of notes and handouts into PDFs.",
        "Works with JPG and PNG images.",
        "Free account required; plan limits apply.",
      ]}
      relatedLinks={[
        { href: "/convert-pdf-to-jpg", label: "PDF to JPG landing page" },
        { href: "/jpg-to-png", label: "JPG to PNG landing page" },
        { href: "/png-to-webp", label: "PNG to WEBP landing page" },
        { href: "/converter", label: "Converter workspace" },
      ]}
      faq={[
        {
          question: "Why would I convert JPG to PDF?",
          answer: "PDF is a better format for storing and sharing documents: it keeps pages together, prints predictably, and is accepted by most submission systems.",
        },
        {
          question: "Can I convert a PNG to PDF as well?",
          answer: "Yes. Choose PNG as the source format and PDF as the target in the Converter.",
        },
        {
          question: "Can AI Study read a scanned PDF?",
          answer: "AI Study extracts text that is embedded in the PDF. Photos of handwriting usually contain no extractable text, so typed or digital documents work best.",
        },
      ]}
    />
  );
}
