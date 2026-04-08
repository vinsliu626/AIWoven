"use client";

import type { ConverterFormatId } from "@/lib/converter/config";

export type ConverterResult = {
  blob: Blob;
  downloadUrl: string;
  previewUrl: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type ConvertArgs = {
  file: File;
  from: ConverterFormatId;
  to: ConverterFormatId;
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
  const nextExtension = to === "jpg" ? ".jpg" : to === "png" ? ".png" : to === "webp" ? ".webp" : ".pdf";
  return `${stem}${nextExtension}`;
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
      reject(new Error("IMAGE_LOAD_FAILED"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("CANVAS_EXPORT_FAILED"));
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
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("NO_CANVAS_CONTEXT");
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
  if (!ctx) throw new Error("NO_CANVAS_CONTEXT");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  const jpegUrl = canvas.toDataURL("image/jpeg", 0.92);
  const jpegBytes = jpegDataFromDataUrl(jpegUrl);
  return buildSimplePdf(jpegBytes, canvas.width, canvas.height);
}

async function pdfToImage(file: File, mimeType: "image/jpeg" | "image/png") {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as any;
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  const loadingTask = pdfjs.getDocument({
    data: await fileToUint8Array(file),
    disableWorker: true,
    useWorkerFetch: false,
    isOffscreenCanvasSupported: false,
  } as any);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("NO_CANVAS_CONTEXT");
  await page.render({ canvasContext: context, viewport, canvas: canvas as any } as any).promise;
  const blob = await canvasToBlob(canvas, mimeType, mimeType === "image/jpeg" ? 0.92 : undefined);
  page.cleanup();
  pdf.cleanup();
  return blob;
}

export async function convertFile({ file, from, to }: ConvertArgs): Promise<ConverterResult> {
  let blob: Blob;

  if (from === "pdf" && to === "jpg") {
    blob = await pdfToImage(file, "image/jpeg");
  } else if (from === "pdf" && to === "png") {
    blob = await pdfToImage(file, "image/png");
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
    throw new Error(`UNSUPPORTED_CONVERSION:${from}->${to}`);
  }

  const fileName = replaceExtension(file.name, to);
  const previewUrl = blob.type.startsWith("image/") ? blobToObjectUrl(blob) : null;
  return {
    blob,
    downloadUrl: blobToObjectUrl(blob),
    previewUrl,
    fileName,
    mimeType: blob.type || "application/octet-stream",
    sizeBytes: blob.size,
  };
}
