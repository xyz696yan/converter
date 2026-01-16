/**
 * Image Conversion Web Worker
 * Handles image processing in background thread
 */

import type { ConversionOptions, OutputFormat } from "./types";
import { FORMAT_MIME_TYPES } from "./types";
import { calculateDimensions, resizeImageData } from "./resizer";

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  const { type, id, imageData, options } = event.data;

  if (type !== "convert") {
    return;
  }

  try {
    postProgress(id, 10);

    const result = await processImage(imageData, options, (progress) => {
      postProgress(id, progress);
    });

    self.postMessage({
      type: "result",
      id,
      blob: result.blob,
      dataUrl: result.dataUrl,
      dimensions: result.dimensions,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

function postProgress(id: string, progress: number) {
  self.postMessage({ type: "progress", id, progress });
}

interface ProcessResult {
  blob: Blob;
  dataUrl: string;
  dimensions: { width: number; height: number };
}

async function processImage(
  imageData: ImageData,
  options: ConversionOptions,
  onProgress: (progress: number) => void
): Promise<ProcessResult> {
  onProgress(20);

  // Calculate new dimensions
  const originalDimensions = {
    width: imageData.width,
    height: imageData.height,
  };
  const newDimensions = calculateDimensions(
    originalDimensions,
    { width: options.width, height: options.height },
    options.fit,
    options.maintainAspectRatio ?? true
  );

  onProgress(30);

  // Resize if needed
  let processedData = imageData;
  if (
    newDimensions.width !== originalDimensions.width ||
    newDimensions.height !== originalDimensions.height
  ) {
    processedData = resizeImageData(imageData, newDimensions);
  }

  onProgress(50);

  // Create canvas and draw image data
  const canvas = new OffscreenCanvas(processedData.width, processedData.height);
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(processedData, 0, 0);

  onProgress(70);

  // Convert to blob
  const blob = await canvasToBlob(canvas, options.format, options.quality);

  onProgress(85);

  // Convert to data URL
  const dataUrl = await blobToDataUrl(blob);

  onProgress(100);

  return {
    blob,
    dataUrl,
    dimensions: newDimensions,
  };
}

async function canvasToBlob(
  canvas: OffscreenCanvas,
  format: OutputFormat,
  quality: number
): Promise<Blob> {
  const blob = await canvas.convertToBlob({
    type: FORMAT_MIME_TYPES[format],
    quality,
  });
  return blob;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

export {};
