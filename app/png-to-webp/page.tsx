import { SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "PNG to WEBP Converter | AIWoven",
  description:
    "Convert PNG to WEBP with AIWoven to prepare lighter image files for web delivery and modern asset pipelines.",
  path: "/png-to-webp",
  keywords: ["png to webp", "convert png to webp", "png webp converter"],
  robots: {
    index: true,
    follow: true,
  },
});

export default function PngToWebpPage() {
  return (
    <SeoLandingPage
      eyebrow="PNG to WEBP"
      title="Convert PNG to WEBP for lighter web-ready images"
      intro="PNG to WEBP is a high-intent conversion path for people optimizing images for sites, apps, and performance-focused delivery. This AIWoven page explains the workflow and links to the converter."
      paragraphs={[
        "WEBP images are typically smaller than PNG files at similar visual quality, which makes them a good choice for websites, portfolios, and anywhere upload size matters.",
        "In AIWoven, open the Converter, choose PNG as the source and WEBP as the target, and upload your image. PNG can also be converted to JPG or PDF. Conversions require a free account and follow your plan’s file-size and daily limits.",
        "Most modern browsers support WEBP, but some older apps and editors don’t—keep the original PNG if you might need to edit the image later.",
      ]}
      ctaHref="/converter"
      ctaLabel="Open Converter"
      secondaryHref="/jpg-to-png"
      secondaryLabel="See JPG to PNG"
      highlights={[
        "Convert PNG images to WEBP, JPG, or PDF.",
        "Smaller files for web pages and uploads.",
        "Free account required; plan limits apply.",
      ]}
      relatedLinks={[
        { href: "/jpg-to-png", label: "JPG to PNG landing page" },
        { href: "/jpg-to-pdf", label: "JPG to PDF landing page" },
        { href: "/convert-pdf-to-jpg", label: "PDF to JPG landing page" },
        { href: "/converter", label: "Converter workspace" },
      ]}
      faq={[
        {
          question: "Why convert PNG to WEBP?",
          answer: "WEBP usually produces smaller files than PNG for the same image, which speeds up web pages and makes uploads lighter.",
        },
        {
          question: "Does WEBP work everywhere?",
          answer: "Modern browsers support it, but some older software doesn’t. Keep your original PNG if compatibility matters.",
        },
        {
          question: "How do I start the conversion?",
          answer: "Open the AIWoven Converter, choose PNG as the source format, select WEBP as the target, and upload your file.",
        },
      ]}
    />
  );
}
