/**
 * Image Resizer Module
 * Handles resizing images with different fit modes
 */

import type { FitMode, ImageDimensions } from "./types";

/**
 * Calculate new dimensions based on fit mode
 */
export function calculateDimensions(
  original: ImageDimensions,
  target: { width?: number; height?: number },
  fit: FitMode = "contain",
  maintainAspectRatio = true
): ImageDimensions {
  // If no target dimensions, return original
  if (!target.width && !target.height) {
    return { ...original };
  }

  const targetWidth = target.width || original.width;
  const targetHeight = target.height || original.height;

  // If not maintaining aspect ratio, use exact target dimensions
  if (!maintainAspectRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  const originalRatio = original.width / original.height;
  const targetRatio = targetWidth / targetHeight;

  let newWidth: number;
  let newHeight: number;

  if (fit === "contain") {
    // Fit inside the target area, maintaining aspect ratio
    if (originalRatio > targetRatio) {
      // Original is wider, constrain by width
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / originalRatio);
    } else {
      // Original is taller, constrain by height
      newHeight = targetHeight;
      newWidth = Math.round(targetHeight * originalRatio);
    }
  } else if (fit === "cover") {
    // Cover the target area, maintaining aspect ratio
    if (originalRatio > targetRatio) {
      // Original is wider, constrain by height
      newHeight = targetHeight;
      newWidth = Math.round(targetHeight * originalRatio);
    } else {
      // Original is taller, constrain by width
      newWidth = targetWidth;
      newHeight = Math.round(targetWidth / originalRatio);
    }
  } else {
    // fill with maintainAspectRatio - just use target dimensions
    newWidth = targetWidth;
    newHeight = targetHeight;
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Resize image data using Canvas
 */
export function resizeImageData(
  imageData: ImageData,
  newDimensions: ImageDimensions
): ImageData {
  // Create source canvas with original image
  const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext("2d")!;
  sourceCtx.putImageData(imageData, 0, 0);

  // Create destination canvas with new dimensions
  const destCanvas = new OffscreenCanvas(
    newDimensions.width,
    newDimensions.height
  );
  const destCtx = destCanvas.getContext("2d")!;

  // Enable image smoothing for better quality
  destCtx.imageSmoothingEnabled = true;
  destCtx.imageSmoothingQuality = "high";

  // Draw resized image
  destCtx.drawImage(
    sourceCanvas,
    0,
    0,
    imageData.width,
    imageData.height,
    0,
    0,
    newDimensions.width,
    newDimensions.height
  );

  return destCtx.getImageData(0, 0, newDimensions.width, newDimensions.height);
}

/**
 * Resize image using canvas (for main thread)
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  newDimensions: ImageDimensions
): HTMLCanvasElement {
  const newCanvas = document.createElement("canvas");
  newCanvas.width = newDimensions.width;
  newCanvas.height = newDimensions.height;

  const ctx = newCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    canvas,
    0,
    0,
    canvas.width,
    canvas.height,
    0,
    0,
    newDimensions.width,
    newDimensions.height
  );

  return newCanvas;
}

/**
 * Calculate source rectangle for center-crop (cover-scale + crop)
 */
function calcCropSourceRect(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const sw = targetW / scale;
  const sh = targetH / scale;
  const sx = (srcW - sw) / 2;
  const sy = (srcH - sh) / 2;
  return { sx, sy, sw, sh };
}

/**
 * Cover-scale and center-crop ImageData to target dimensions (for worker)
 */
export function cropAndResizeImageData(
  imageData: ImageData,
  targetDimensions: ImageDimensions
): ImageData {
  const sourceCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext("2d")!;
  sourceCtx.putImageData(imageData, 0, 0);

  const destCanvas = new OffscreenCanvas(
    targetDimensions.width,
    targetDimensions.height
  );
  const destCtx = destCanvas.getContext("2d")!;
  destCtx.imageSmoothingEnabled = true;
  destCtx.imageSmoothingQuality = "high";

  const { sx, sy, sw, sh } = calcCropSourceRect(
    imageData.width,
    imageData.height,
    targetDimensions.width,
    targetDimensions.height
  );

  destCtx.drawImage(
    sourceCanvas,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    targetDimensions.width,
    targetDimensions.height
  );

  return destCtx.getImageData(
    0,
    0,
    targetDimensions.width,
    targetDimensions.height
  );
}

/**
 * Cover-scale and center-crop canvas to target dimensions (for main thread)
 */
export function cropAndResizeCanvas(
  canvas: HTMLCanvasElement,
  targetDimensions: ImageDimensions
): HTMLCanvasElement {
  const newCanvas = document.createElement("canvas");
  newCanvas.width = targetDimensions.width;
  newCanvas.height = targetDimensions.height;

  const ctx = newCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const { sx, sy, sw, sh } = calcCropSourceRect(
    canvas.width,
    canvas.height,
    targetDimensions.width,
    targetDimensions.height
  );

  ctx.drawImage(
    canvas,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    targetDimensions.width,
    targetDimensions.height
  );

  return newCanvas;
}
