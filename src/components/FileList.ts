/**
 * File List Component
 * Displays uploaded files with progress and actions
 */

import type { ImageFile } from "../core/types";
import {
  formatFileSize,
  calculateCompressionRatio,
  downloadImage,
} from "../core/converter";
import { t } from "../core/i18n";
import { showComparison } from "./ImageComparison";

export interface FileListOptions {
  onRemove: (id: string) => void;
}

export function createFileList(
  container: HTMLElement,
  files: ImageFile[],
  options: FileListOptions
): void {
  if (files.length === 0) {
    container.innerHTML = "";
    return;
  }

  const html = `
    <div class="file-list">
      ${files.map((file) => renderFileItem(file)).join("")}
    </div>
  `;

  container.innerHTML = html;
  attachEventListeners(container, files, options);
}

function renderFileItem(file: ImageFile): string {
  const trans = t();
  const statusClass = `status--${file.status}`;
  const statusText = getStatusText(file.status);

  let sizeInfo = `<span class="file-item__size">${formatFileSize(file.file.size)}</span>`;

  if (file.result) {
    const ratio = calculateCompressionRatio(
      file.result.originalSize,
      file.result.newSize
    );
    const sizeClass =
      ratio >= 0 ? "file-item__size--new" : "file-item__size--bigger";
    const arrow = "→";
    const ratioText = ratio >= 0 ? `(-${ratio}%)` : `(+${Math.abs(ratio)}%)`;

    sizeInfo = `
      <span class="file-item__size">${formatFileSize(file.result.originalSize)}</span>
      <span>${arrow}</span>
      <span class="${sizeClass}">${formatFileSize(file.result.newSize)} ${ratioText}</span>
    `;
  }

  const previewSrc = file.result?.dataUrl || file.preview;

  return `
    <div class="file-item fade-in" data-id="${file.id}">
      <img 
        class="file-item__preview" 
        src="${previewSrc}" 
        alt="${file.file.name}"
        loading="lazy"
        data-action="compare"
        data-id="${file.id}"
        style="cursor: ${file.result ? "pointer" : "default"}"
        title="${file.result ? trans.compare : ""}"
      />
      <div class="file-item__info">
        <div class="file-item__name" title="${file.file.name}">${file.file.name}</div>
        <div class="file-item__meta">
          ${sizeInfo}
          <span class="status ${statusClass}">${statusText}</span>
        </div>
        ${file.status === "processing" ? renderProgress(file.progress) : ""}
        ${file.error ? `<div class="status status--error">${file.error}</div>` : ""}
      </div>
      <div class="file-item__actions">
        ${
          file.result
            ? `
          <button class="file-item__btn file-item__btn--compare" data-action="compare" data-id="${file.id}" title="${trans.compare}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>
          </button>
          <button class="file-item__btn" data-action="download" data-id="${file.id}" title="${trans.download}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
        `
            : ""
        }
        <button class="file-item__btn file-item__btn--remove" data-action="remove" data-id="${file.id}" title="${trans.remove}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderProgress(progress: number): string {
  return `
    <div class="progress">
      <div class="progress__bar" style="width: ${progress}%"></div>
    </div>
  `;
}

function getStatusText(status: ImageFile["status"]): string {
  const trans = t();
  switch (status) {
    case "pending":
      return trans.pending;
    case "processing":
      return trans.processing;
    case "done":
      return trans.done;
    case "error":
      return trans.error;
    default:
      return "";
  }
}

function attachEventListeners(
  container: HTMLElement,
  files: ImageFile[],
  options: FileListOptions
): void {
  container.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const actionElement = target.closest("[data-action]") as HTMLElement;

    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const id = actionElement.dataset.id;

    if (!id) return;

    const file = files.find((f) => f.id === id);
    if (!file) return;

    if (action === "remove") {
      options.onRemove(id);
    } else if (action === "download") {
      if (file.result) {
        downloadImage(file.result);
      }
    } else if (action === "compare") {
      if (file.result) {
        showComparison(file, { onClose: () => {} });
      }
    }
  });
}
