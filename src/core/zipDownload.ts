/**
 * ZIP Download Module
 * Downloads multiple converted images as a ZIP archive
 */

import JSZip from "jszip";
import type { ConvertedImage } from "./types";

/**
 * Download multiple images as a ZIP file
 */
export async function downloadAsZip(
  images: ConvertedImage[],
  zipName: string = "converted-images.zip"
): Promise<void> {
  if (images.length === 0) return;

  const zip = new JSZip();

  // Add each image to the ZIP
  for (const image of images) {
    zip.file(image.newName, image.blob);
  }

  // Generate ZIP blob
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Calculate total size of images
 */
export function calculateTotalSize(images: ConvertedImage[]): number {
  return images.reduce((sum, img) => sum + img.newSize, 0);
}

/**
 * Format ZIP filename with timestamp
 */
export function generateZipName(prefix: string = "images"): string {
  const date = new Date();
  const timestamp = date.toISOString().slice(0, 10);
  return `${prefix}-${timestamp}.zip`;
}
