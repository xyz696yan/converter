/**
 * Image Converter Types
 */

/** Supported output formats */
export type OutputFormat = "webp" | "png" | "jpeg";

/** Resize fit modes */
export type FitMode = "contain" | "cover" | "fill";

/** Conversion options */
export interface ConversionOptions {
  /** Output format */
  format: OutputFormat;
  /** Quality from 0 to 1 (only for webp and jpeg) */
  quality: number;
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** How to fit the image when resizing */
  fit?: FitMode;
  /** Maintain aspect ratio when only width or height is specified */
  maintainAspectRatio?: boolean;
}

/** Result of image conversion */
export interface ConvertedImage {
  /** Converted image as Blob */
  blob: Blob;
  /** Data URL for preview */
  dataUrl: string;
  /** Original filename */
  originalName: string;
  /** New filename with correct extension */
  newName: string;
  /** Relative path within a folder (optional) */
  relativePath?: string;
  /** Original file size in bytes */
  originalSize: number;
  /** New file size in bytes */
  newSize: number;
  /** Original dimensions */
  originalDimensions: ImageDimensions;
  /** New dimensions */
  newDimensions: ImageDimensions;
}

/** Image dimensions */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** File with preview for UI */
export interface ImageFile {
  /** Original File object */
  file: File;
  /** Unique ID for tracking */
  id: string;
  /** Relative path within a folder (optional) */
  relativePath?: string;
  /** Preview data URL */
  preview: string;
  /** Processing status */
  status: "pending" | "processing" | "done" | "error";
  /** Processing progress 0-100 */
  progress: number;
  /** Conversion result */
  result?: ConvertedImage;
  /** Error message if failed */
  error?: string;
}

/** Worker message types */
export type WorkerMessage =
  | {
      type: "convert";
      id: string;
      imageData: ImageData;
      options: ConversionOptions;
    }
  | { type: "progress"; id: string; progress: number }
  | { type: "result"; id: string; blob: Blob; dataUrl: string }
  | { type: "error"; id: string; error: string };

/** Supported input formats */
export const SUPPORTED_INPUT_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

/** MIME types for output formats */
export const FORMAT_MIME_TYPES: Record<OutputFormat, string> = {
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
};

/** File extensions for output formats */
export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  webp: ".webp",
  png: ".png",
  jpeg: ".jpg",
};
