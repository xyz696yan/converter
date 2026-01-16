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
      <div class="dropzone__actions">
        <button class="dropzone__action-btn" type="button" data-action="browse-folder">
          ${trans.browseFolder}
        </button>
      </div>
      <input 
        type="file" 
        class="dropzone__input dropzone__input--hidden" 
        id="file-input" 
        multiple 
        accept="${SUPPORTED_INPUT_FORMATS.join(",")}"
      />
      <input 
        type="file" 
        class="dropzone__input dropzone__input--hidden" 
        id="folder-input" 
        multiple 
        webkitdirectory
        directory
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
  const folderInput = dropzoneContainer.querySelector(
    "#folder-input"
  ) as HTMLInputElement;
  const browseFolderBtn = dropzoneContainer.querySelector(
    "[data-action=\"browse-folder\"]"
  ) as HTMLButtonElement | null;

  // Click to open file dialog
  dropzone.addEventListener("click", () => {
    openFilePicker(fileInput);
  });

  browseFolderBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    openFilePicker(folderInput);
  });

  // File input change
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const imageFiles = processFiles(
        Array.from(fileInput.files).map((file) => ({
          file,
          relativePath: getFileRelativePath(file),
        }))
      );
      dropzoneOptions!.onFilesAdded(imageFiles);
      fileInput.value = ""; // Reset for next selection
    }
  });

  // Folder input change
  folderInput.addEventListener("change", () => {
    if (folderInput.files && folderInput.files.length > 0) {
      const imageFiles = processFiles(
        Array.from(folderInput.files).map((file) => ({
          file,
          relativePath: getFileRelativePath(file),
        }))
      );
      dropzoneOptions!.onFilesAdded(imageFiles);
      folderInput.value = "";
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

  dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropzone.classList.remove("dropzone--active");

    if (!e.dataTransfer) return;

    const files = await getFilesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) {
      const imageFiles = processFiles(files);
      dropzoneOptions!.onFilesAdded(imageFiles);
    }
  });
}

interface FileWithRelativePath {
  file: File;
  relativePath?: string;
}

function processFiles(files: FileWithRelativePath[]): ImageFile[] {
  return files
    .filter((item) => isValidImageType(item.file.type))
    .map((item) => ({
      file: item.file,
      id: generateId(),
      relativePath: normalizeRelativePath(
        item.relativePath,
        item.file.name
      ),
      preview: URL.createObjectURL(item.file),
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

function openFilePicker(input: HTMLInputElement): void {
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.click();
}

function normalizeRelativePath(
  relativePath: string | undefined,
  fallbackName: string
): string {
  const normalized = (relativePath || fallbackName).replace(/\\/g, "/");
  return normalized.replace(/^\/+/, "");
}

function getFileRelativePath(file: File): string | undefined {
  const path = (file as File & { webkitRelativePath?: string })
    .webkitRelativePath;
  return path && path.length > 0 ? path : undefined;
}

async function getFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<FileWithRelativePath[]> {
  const items = Array.from(dataTransfer.items || []);

  if (items.length > 0) {
    const entries = items
      .map((item) => item.webkitGetAsEntry?.() || null)
      .filter(Boolean) as FileSystemEntry[];

    if (entries.length > 0) {
      const files = await getFilesFromEntries(entries);
      if (files.length > 0) return files;
    }
  }

  return Array.from(dataTransfer.files).map((file) => ({
    file,
    relativePath: getFileRelativePath(file),
  }));
}

async function getFilesFromEntries(
  entries: FileSystemEntry[]
): Promise<FileWithRelativePath[]> {
  const results = await Promise.all(
    entries.map((entry) => traverseEntry(entry, ""))
  );
  return results.flat();
}

async function traverseEntry(
  entry: FileSystemEntry,
  parentPath: string
): Promise<FileWithRelativePath[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve, reject) => {
      fileEntry.file(
        (file) => {
          resolve([
            {
              file,
              relativePath: normalizeRelativePath(
                `${parentPath}${file.name}`,
                file.name
              ),
            },
          ]);
        },
        (error) => reject(error)
      );
    });
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const nextParent = `${parentPath}${dirEntry.name}/`;
    const results = await Promise.all(
      entries.map((child) => traverseEntry(child, nextParent))
    );
    return results.flat();
  }

  return [];
}

function readAllDirectoryEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        (error) => reject(error)
      );
    };
    readBatch();
  });
}
