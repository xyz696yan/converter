/**
 * Image Converter Core Module
 * Handles image conversion between formats
 */

import type {
  ConversionOptions,
  ConvertedImage,
  ImageDimensions,
  OutputFormat,
} from "./types";
import { FORMAT_EXTENSIONS, FORMAT_MIME_TYPES } from "./types";
import {
  calculateDimensions,
  resizeCanvas,
  cropAndResizeCanvas,
} from "./resizer";

/**
 * Load an image file into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = url;
  });
}

/**
 * Draw image onto canvas
 */
export function imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  return canvas;
}

/**
 * Convert canvas to blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      FORMAT_MIME_TYPES[format],
      quality
    );
  });
}

/**
 * Convert blob to data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate new filename with correct extension
 */
export function generateNewFilename(
  originalName: string,
  format: OutputFormat
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  return `${baseName}${FORMAT_EXTENSIONS[format]}`;
}

/**
 * Main conversion function
 */
export async function convertImage(
  file: File,
  options: ConversionOptions,
  onProgress?: (progress: number) => void
): Promise<ConvertedImage> {
  onProgress?.(10);

  // Load image
  const img = await loadImage(file);
  onProgress?.(30);

  // Get original dimensions
  const originalDimensions: ImageDimensions = {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };

  // Calculate new dimensions
  const newDimensions = calculateDimensions(
    originalDimensions,
    { width: options.width, height: options.height },
    options.fit,
    options.maintainAspectRatio ?? true
  );
  onProgress?.(40);

  // Draw to canvas
  let canvas = imageToCanvas(img);
  onProgress?.(50);

  // Resize if needed
  if (
    newDimensions.width !== originalDimensions.width ||
    newDimensions.height !== originalDimensions.height
  ) {
    const shouldCrop = !(options.maintainAspectRatio ?? true);
    canvas = shouldCrop
      ? cropAndResizeCanvas(canvas, newDimensions)
      : resizeCanvas(canvas, newDimensions);
  }
  onProgress?.(70);

  // Convert to blob
  const blob = await canvasToBlob(canvas, options.format, options.quality);
  onProgress?.(85);

  // Get data URL for preview
  const dataUrl = await blobToDataUrl(blob);
  onProgress?.(95);

  const result: ConvertedImage = {
    blob,
    dataUrl,
    originalName: file.name,
    newName: generateNewFilename(file.name, options.format),
    originalSize: file.size,
    newSize: blob.size,
    originalDimensions,
    newDimensions,
  };

  onProgress?.(100);
  return result;
}

/**
 * Batch convert multiple images
 */
export async function convertImages(
  files: File[],
  options: ConversionOptions,
  onFileProgress?: (fileIndex: number, progress: number) => void
): Promise<ConvertedImage[]> {
  const results: ConvertedImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await convertImage(files[i], options, (progress) => {
      onFileProgress?.(i, progress);
    });
    results.push(result);
  }

  return results;
}

/**
 * Download converted image
 */
export function downloadImage(image: ConvertedImage): void {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(image.blob);
  link.download = image.newName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Download all converted images as individual files
 */
export function downloadAllImages(images: ConvertedImage[]): void {
  images.forEach((image) => downloadImage(image));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalSize: number,
  newSize: number
): number {
  if (originalSize === 0) return 0;
  return Math.round((1 - newSize / originalSize) * 100);
}
