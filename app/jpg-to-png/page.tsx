import { SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "JPG to PNG Converter | AIWoven",
  description:
    "Convert JPG to PNG with AIWoven. Use the converter workspace for image format changes when you need lossless PNG output.",
  path: "/jpg-to-png",
  keywords: ["jpg to png", "convert jpg to png", "jpg png converter"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function JpgToPngPage() {
  return (
    <SeoLandingPage
      eyebrow="JPG to PNG"
      title="Convert JPG to PNG for cleaner image workflows"
      intro="The AIWoven converter supports image-focused workflows such as JPG to PNG, giving users a simple path when they need PNG output for editing, transparency workflows, or cleaner asset handling."
      paragraphs={[
        "JPG to PNG conversion is useful when you need an image format that won’t lose more quality each time it is saved—for example, a diagram you plan to annotate or reuse in slides.",
        "In AIWoven, open the Converter, choose JPG as the source and PNG as the target, and upload your image. You can also convert JPG to WEBP or PDF. Conversions require a free account and follow your plan’s file-size and daily limits.",
        "Note that converting a JPG to PNG does not restore detail the JPG has already lost; it prevents further loss from future edits.",
      ]}
      ctaHref="/converter"
      ctaLabel="Open Converter"
      secondaryHref="/png-to-webp"
      secondaryLabel="See PNG to WEBP"
      highlights={[
        "Convert JPG images to PNG, WEBP, or PDF.",
        "PNG is lossless—good for images you will edit again.",
        "Free account required; plan limits apply.",
      ]}
      relatedLinks={[
        { href: "/png-to-webp", label: "PNG to WEBP landing page" },
        { href: "/jpg-to-pdf", label: "JPG to PDF landing page" },
        { href: "/convert-pdf-to-jpg", label: "PDF to JPG landing page" },
        { href: "/converter", label: "Converter workspace" },
      ]}
      faq={[
        {
          question: "Why would I convert JPG to PNG?",
          answer: "PNG is lossless, so repeated edits and saves don’t add compression artifacts. It’s a good choice for diagrams, screenshots, and images with text.",
        },
        {
          question: "Will converting to PNG improve image quality?",
          answer: "No. It won’t recover detail lost in the original JPG, but it stops further quality loss when you edit and save again.",
        },
        {
          question: "Are PNG files larger than JPG?",
          answer: "Usually, yes—especially for photos. If file size matters more, consider WEBP.",
        },
      ]}
    />
  );
}
