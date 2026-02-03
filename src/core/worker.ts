/**
 * Image Conversion Web Worker
 * Handles image processing in background thread
 */

import type { ConversionOptions } from "./types";
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

    let result: ProcessResult;

    // Handle SVG special case
    if (options.format === "svg" && typeof imageData === "string") {
      result = await processSVG(imageData, (progress) => {
        postProgress(id, progress);
      });
    } else {
      // Normal raster image processing
      result = await processImage(
        imageData as ImageData,
        options,
        (progress) => {
          postProgress(id, progress);
        },
      );
    }

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

async function processSVG(
  svgContent: string,
  onProgress: (progress: number) => void,
): Promise<ProcessResult> {
  onProgress(20);

  // Dynamic import for optimizer
  const { optimizeSVG } = await import("./svgOptimizer");
  onProgress(40);

  const optimizedContent = optimizeSVG(svgContent);
  onProgress(60);

  const blob = new Blob([optimizedContent], { type: "image/svg+xml" });
  onProgress(80);

  const dataUrl = await blobToDataUrl(blob);

  // Parse dimensions from SVG string (basic regex)
  const widthMatch = svgContent.match(/width=["'](\d+(\.\d+)?)["']/);
  const heightMatch = svgContent.match(/height=["'](\d+(\.\d+)?)["']/);

  // Default to what we can find, or 0 if missing (UI might handle this)
  const dimensions = {
    width: widthMatch ? parseFloat(widthMatch[1]) : 0,
    height: heightMatch ? parseFloat(heightMatch[1]) : 0,
  };

  onProgress(100);

  return {
    blob,
    dataUrl,
    dimensions,
  };
}

async function processImage(
  imageData: ImageData,
  options: ConversionOptions,
  onProgress: (progress: number) => void,
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
    options.maintainAspectRatio ?? true,
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
  // For SVG output from raster, we can't really "convert" effectively without tracing,
  // but if the user selected SVG for a raster input, we might just fail or fallback.
  // However, options.format is strictly typed.
  // If the user selected SVG, we generally expect SVG input for this simple app.
  // If we really needed raster->SVG, we'd embed it as base64 in SVG image tag, but that's rarely what users want.
  // For now we assume the UI filters valid combinations or we fallback to PNG if trying to save raster as SVG.
  // Actually, let's just handle standard formats here.

  const blob = await canvasToBlob(
    canvas,
    options.format as "webp" | "png" | "jpeg",
    options.quality,
  );

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
  format: "webp" | "png" | "jpeg",
  quality: number,
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
