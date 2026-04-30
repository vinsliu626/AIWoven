"use client";

import JSZip from "jszip";

import {
  getPdfPageLimit,
  getSupportedConversionPair,
  type ConverterFormatId,
  type ConverterPlanId,
} from "@/lib/converter/config";

export type ConverterResult = {
  blob: Blob;
  downloadUrl: string;
  previewUrl: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ConverterProgress =
  | {
      stage: "loading";
      message: string;
    }
  | {
      stage: "rendering";
      current: number;
      total: number;
      message: string;
    }
  | {
      stage: "packaging";
      current: number;
      total: number;
      message: string;
    };

export class ConverterError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "ConverterError";
    this.code = code;
  }
}

type ConvertArgs = {
  file: File;
  from: ConverterFormatId;
  to: ConverterFormatId;
  plan?: ConverterPlanId | null;
  onProgress?: (progress: ConverterProgress) => void;
};

const formatExtensions: Record<ConverterFormatId, string[]> = {
  pdf: [".pdf"],
  docx: [".docx"],
  txt: [".txt"],
  pptx: [".pptx"],
  jpg: [".jpg", ".jpeg"],
  png: [".png"],
  webp: [".webp"],
  mp3: [".mp3"],
  wav: [".wav"],
  m4a: [".m4a"],
  mp4: [".mp4"],
  mov: [".mov"],
  extract_audio: [],
};

function extensionForFormat(format: ConverterFormatId) {
  return format === "jpg"
    ? ".jpg"
    : format === "png"
      ? ".png"
      : format === "webp"
        ? ".webp"
        : format === "pdf"
          ? ".pdf"
          : format === "docx"
            ? ".docx"
            : format === "txt"
              ? ".txt"
              : format === "pptx"
                ? ".pptx"
                : format === "mp3"
                  ? ".mp3"
                  : format === "wav"
                    ? ".wav"
                    : format === "m4a"
                      ? ".m4a"
                      : format === "mp4"
                        ? ".mp4"
                        : format === "mov"
                          ? ".mov"
                          : "";
}

export function getConverterAccept(format: ConverterFormatId) {
  return formatExtensions[format].join(",");
}

export function isFileCompatibleWithFormat(file: File, format: ConverterFormatId) {
  const lowered = file.name.toLowerCase();
  return formatExtensions[format].some((extension) => lowered.endsWith(extension));
}

function replaceExtension(fileName: string, to: ConverterFormatId) {
  const lastDot = fileName.lastIndexOf(".");
  const stem = lastDot >= 0 ? fileName.slice(0, lastDot) : fileName;
  return `${stem}${extensionForFormat(to)}`;
}

function replaceWithZip(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  const stem = lastDot >= 0 ? fileName.slice(0, lastDot) : fileName;
  return `${stem}.zip`;
}

async function fileToUint8Array(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

function blobToObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ConverterError("INVALID_IMAGE_FILE"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new ConverterError("CANVAS_EXPORT_FAILED"));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

async function rasterImageToImage(file: File, mimeType: "image/png" | "image/webp" | "image/jpeg") {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { alpha: mimeType !== "image/jpeg" });
  if (!ctx) throw new ConverterError("NO_CANVAS_CONTEXT");
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0);
  return canvasToBlob(canvas, mimeType, mimeType === "image/png" ? undefined : 0.92);
}

function binaryStringFromBytes(bytes: Uint8Array) {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += String.fromCharCode(bytes[index]);
  }
  return result;
}

function jpegDataFromDataUrl(dataUrl: string) {
  const encoded = dataUrl.split(",")[1] ?? "";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildSimplePdf(jpegBytes: Uint8Array, widthPx: number, heightPx: number) {
  const widthPt = Math.max(72, widthPx * 0.75);
  const heightPt = Math.max(72, heightPx * 0.75);
  const imageBinary = binaryStringFromBytes(jpegBytes);
  const content = `q\n${widthPt} 0 0 ${heightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n${imageBinary}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function imageToPdf(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ConverterError("NO_CANVAS_CONTEXT");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = jpegDataFromDataUrl(jpegUrl);
  return buildSimplePdf(jpegBytes, canvas.width, canvas.height);
}

function normalizePdfError(error: unknown) {
  if (error instanceof ConverterError) return error;
  const name = typeof error === "object" && error && "name" in error ? String((error as { name?: string }).name) : "";
  if (name === "PasswordException") return new ConverterError("PDF_ENCRYPTED");
  if (name === "InvalidPDFException") return new ConverterError("INVALID_PDF_FILE");
  return new ConverterError("PDF_RENDER_FAILED");
}

async function renderPdfPage(
  page: {
    getViewport: (args: { scale: number }) => { width: number; height: number };
    render: (args: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      canvas: HTMLCanvasElement;
    }) => { promise: Promise<void> };
    cleanup: () => void;
  },
  mimeType: "image/jpeg" | "image/png" | "image/webp"
) {
  const viewport = page.getViewport({ scale: 1.75 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new ConverterError("NO_CANVAS_CONTEXT");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport, canvas }).promise;
  return canvasToBlob(canvas, mimeType, mimeType === "image/jpeg" || mimeType === "image/webp" ? 0.92 : undefined);
}

async function pdfToImage({
  file,
  to,
  plan,
  onProgress,
}: {
  file: File;
  to: "jpg" | "png" | "webp";
  plan?: ConverterPlanId | null;
  onProgress?: (progress: ConverterProgress) => void;
}) {
  const mimeType = to === "jpg" ? "image/jpeg" : to === "png" ? "image/png" : "image/webp";
  type PdfPageHandle = {
    getViewport: (args: { scale: number }) => { width: number; height: number };
    render: (args: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
      canvas: HTMLCanvasElement;
    }) => { promise: Promise<void> };
    cleanup: () => void;
  };

  try {
    onProgress?.({ stage: "loading", message: "Loading PDF pages..." });
    const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as {
      GlobalWorkerOptions: { workerSrc?: string };
      getDocument: (args: {
        data: Uint8Array;
        disableWorker: boolean;
        useWorkerFetch: boolean;
        isOffscreenCanvasSupported: boolean;
      }) => { promise: Promise<{ numPages: number; getPage: (pageNumber: number) => Promise<PdfPageHandle>; cleanup: () => void; destroy: () => Promise<void> }> };
    };

    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
    }

    const loadingTask = pdfjs.getDocument({
      data: await fileToUint8Array(file),
      disableWorker: true,
      useWorkerFetch: false,
      isOffscreenCanvasSupported: false,
    });
    const pdf = await loadingTask.promise;

    const pageLimit = getPdfPageLimit(plan);
    if (pdf.numPages > pageLimit) {
      await pdf.destroy();
      throw new ConverterError("PDF_PAGE_LIMIT_EXCEEDED");
    }

    if (pdf.numPages === 1) {
      onProgress?.({ stage: "rendering", current: 1, total: 1, message: "Rendering page 1 of 1..." });
      const page = await pdf.getPage(1);
      try {
        const blob = await renderPdfPage(page, mimeType);
        const fileName = replaceExtension(file.name, to);
        pdf.cleanup();
        await pdf.destroy();
        return {
          blob,
          fileName,
          previewUrl: blobToObjectUrl(blob),
        };
      } finally {
        page.cleanup();
      }
    }

    const zip = new JSZip();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onProgress?.({
        stage: "rendering",
        current: pageNumber,
        total: pdf.numPages,
        message: `Rendering page ${pageNumber} of ${pdf.numPages}...`,
      });
      const page = await pdf.getPage(pageNumber);
      try {
        const blob = await renderPdfPage(page, mimeType);
        const buffer = await blob.arrayBuffer();
        const pageFileName = `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}${extensionForFormat(to)}`;
        zip.file(pageFileName, buffer);
      } finally {
        page.cleanup();
      }
    }

    onProgress?.({
      stage: "packaging",
      current: pdf.numPages,
      total: pdf.numPages,
      message: `Packaging ${pdf.numPages} pages for download...`,
    });
    const blob = await zip.generateAsync({ type: "blob" });
    pdf.cleanup();
    await pdf.destroy();
    return {
      blob,
      fileName: replaceWithZip(file.name),
      previewUrl: null,
    };
  } catch (error) {
    throw normalizePdfError(error);
  }
}

export async function convertFile({ file, from, to, plan, onProgress }: ConvertArgs): Promise<ConverterResult> {
  const pair = getSupportedConversionPair(from, to);
  if (!pair) {
    throw new ConverterError(`UNSUPPORTED_CONVERSION:${from}->${to}`);
  }

  let blob: Blob;
  let fileName = replaceExtension(file.name, to);
  let previewUrl: string | null = null;

  if (from === "pdf" && (to === "jpg" || to === "png" || to === "webp")) {
    const result = await pdfToImage({ file, to, plan, onProgress });
    blob = result.blob;
    fileName = result.fileName;
    previewUrl = result.previewUrl;
  } else if (from === "jpg" && to === "png") {
    blob = await rasterImageToImage(file, "image/png");
  } else if (from === "jpg" && to === "webp") {
    blob = await rasterImageToImage(file, "image/webp");
  } else if (from === "jpg" && to === "pdf") {
    blob = await imageToPdf(file);
  } else if (from === "png" && to === "jpg") {
    blob = await rasterImageToImage(file, "image/jpeg");
  } else if (from === "png" && to === "webp") {
    blob = await rasterImageToImage(file, "image/webp");
  } else if (from === "png" && to === "pdf") {
    blob = await imageToPdf(file);
  } else if (from === "webp" && to === "jpg") {
    blob = await rasterImageToImage(file, "image/jpeg");
  } else if (from === "webp" && to === "png") {
    blob = await rasterImageToImage(file, "image/png");
  } else if (from === "webp" && to === "pdf") {
    blob = await imageToPdf(file);
  } else {
    throw new ConverterError(`UNSUPPORTED_CONVERSION:${from}->${to}`);
  }

  const finalPreviewUrl = previewUrl ?? (blob.type.startsWith("image/") ? blobToObjectUrl(blob) : null);
  return {
    blob,
    downloadUrl: blobToObjectUrl(blob),
    previewUrl: finalPreviewUrl,
    fileName,
    mimeType: blob.type || pair.outputMimeType || "application/octet-stream",
    sizeBytes: blob.size,
  };
}
