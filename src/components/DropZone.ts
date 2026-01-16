/**
 * DropZone Component
 * Handles file drag & drop and selection
 */

import type { ImageFile } from "../core/types";
import { SUPPORTED_INPUT_FORMATS } from "../core/types";
import { t, onLanguageChange } from "../core/i18n";

export interface DropZoneOptions {
  onFilesAdded: (files: ImageFile[]) => void;
}

let dropzoneContainer: HTMLElement | null = null;
let dropzoneOptions: DropZoneOptions | null = null;

export function createDropZone(
  container: HTMLElement,
  options: DropZoneOptions
): void {
  dropzoneContainer = container;
  dropzoneOptions = options;

  render();

  // Re-render on language change
  onLanguageChange(() => render());
}

function render(): void {
  if (!dropzoneContainer || !dropzoneOptions) return;

  const trans = t();

  const html = `
    <div class="dropzone" id="dropzone">
      <svg class="dropzone__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <h3 class="dropzone__title">${trans.dropTitle}</h3>
      <p class="dropzone__subtitle">${trans.dropSubtitle}</p>
      <div class="dropzone__formats">
        <span class="dropzone__format">PNG</span>
        <span class="dropzone__format">JPG</span>
        <span class="dropzone__format">WebP</span>
        <span class="dropzone__format">SVG</span>
        <span class="dropzone__format">GIF</span>
      </div>
      <input 
        type="file" 
        class="dropzone__input" 
        id="file-input" 
        multiple 
        accept="${SUPPORTED_INPUT_FORMATS.join(",")}"
      />
    </div>
  `;

  dropzoneContainer.innerHTML = html;
  attachEventListeners();
}

function attachEventListeners(): void {
  if (!dropzoneContainer || !dropzoneOptions) return;

  const dropzone = dropzoneContainer.querySelector("#dropzone") as HTMLElement;
  const fileInput = dropzoneContainer.querySelector(
    "#file-input"
  ) as HTMLInputElement;

  // Click to open file dialog
  dropzone.addEventListener("click", () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const imageFiles = processFiles(Array.from(fileInput.files));
      dropzoneOptions!.onFilesAdded(imageFiles);
      fileInput.value = ""; // Reset for next selection
    }
  });

  // Drag events
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dropzone--active");
  });

  dropzone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dropzone--active");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dropzone--active");

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const imageFiles = processFiles(Array.from(e.dataTransfer.files));
      dropzoneOptions!.onFilesAdded(imageFiles);
    }
  });
}

function processFiles(files: File[]): ImageFile[] {
  return files
    .filter((file) => isValidImageType(file.type))
    .map((file) => ({
      file,
      id: generateId(),
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
    }));
}

function isValidImageType(type: string): boolean {
  return SUPPORTED_INPUT_FORMATS.includes(
    type as (typeof SUPPORTED_INPUT_FORMATS)[number]
  );
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
