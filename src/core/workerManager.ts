/**
 * Worker Manager
 * Handles communication with Web Worker for image processing
 */

import type {
  ConversionOptions,
  ConvertedImage,
  ImageDimensions,
} from "./types";
import { FORMAT_EXTENSIONS } from "./types";
import { loadImage, imageToCanvas, blobToDataUrl } from "./converter";
import ConversionWorker from "./worker?worker";

interface WorkerTask {
  resolve: (result: ConvertedImage) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
  file: File;
  originalDimensions: ImageDimensions;
}

class WorkerManager {
  private worker: Worker | null = null;
  private tasks: Map<string, WorkerTask> = new Map();
  private taskIdCounter = 0;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new ConversionWorker();
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }
    return this.worker;
  }

  private handleMessage(event: MessageEvent) {
    const { type, id, progress, blob, dataUrl, dimensions, error } = event.data;
    const task = this.tasks.get(id);

    if (!task) return;

    switch (type) {
      case "progress":
        task.onProgress?.(progress);
        break;

      case "result":
        this.tasks.delete(id);
        task.resolve({
          blob,
          dataUrl,
          originalName: task.file.name,
          newName: this.generateNewFilename(task.file.name, blob.type),
          originalSize: task.file.size,
          newSize: blob.size,
          originalDimensions: task.originalDimensions,
          newDimensions: dimensions,
        });
        break;

      case "error":
        this.tasks.delete(id);
        task.reject(new Error(error));
        break;
    }
  }

  private handleError(event: ErrorEvent) {
    console.error("Worker error:", event.message);
    // Reject all pending tasks
    this.tasks.forEach((task) => {
      task.reject(new Error("Worker error: " + event.message));
    });
    this.tasks.clear();
  }

  private generateNewFilename(originalName: string, mimeType: string): string {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const format = mimeType.split("/")[1] as keyof typeof FORMAT_EXTENSIONS;
    const formatKey = format === "jpeg" ? "jpeg" : format;
    return `${baseName}${FORMAT_EXTENSIONS[formatKey as keyof typeof FORMAT_EXTENSIONS] || ".webp"}`;
  }

  async convertImage(
    file: File,
    options: ConversionOptions,
    onProgress?: (progress: number) => void
  ): Promise<ConvertedImage> {
    const id = `task-${++this.taskIdCounter}`;

    // Load image and get ImageData
    onProgress?.(5);
    const img = await loadImage(file);
    const canvas = imageToCanvas(img);
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const originalDimensions: ImageDimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight,
    };

    return new Promise((resolve, reject) => {
      this.tasks.set(id, {
        resolve,
        reject,
        onProgress,
        file,
        originalDimensions,
      });

      this.getWorker().postMessage(
        {
          type: "convert",
          id,
          imageData,
          options,
        },
        [imageData.data.buffer]
      );
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.tasks.clear();
    }
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();

/**
 * Convert image using Web Worker (if available) or fallback to main thread
 */
export async function convertImageAsync(
  file: File,
  options: ConversionOptions,
  onProgress?: (progress: number) => void
): Promise<ConvertedImage> {
  // Check if workers are supported
  if (typeof Worker !== "undefined") {
    try {
      return await workerManager.convertImage(file, options, onProgress);
    } catch (error) {
      console.warn(
        "Worker conversion failed, falling back to main thread:",
        error
      );
    }
  }

  // Fallback to main thread conversion
  const { convertImage } = await import("./converter");
  return convertImage(file, options, onProgress);
}
