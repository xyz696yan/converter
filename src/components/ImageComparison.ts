/**
 * Image Comparison Slider Component
 * Before/After comparison with draggable slider
 */

import type { ImageFile } from "../core/types";
import { t, onLanguageChange } from "../core/i18n";

export interface ComparisonOptions {
  onClose: () => void;
}

let currentFile: ImageFile | null = null;
let modalContainer: HTMLElement | null = null;

export function showComparison(
  file: ImageFile,
  options: ComparisonOptions
): void {
  if (!file.result) return;

  currentFile = file;

  // Create modal container if not exists
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "comparison-modal";
    document.body.appendChild(modalContainer);
  }

  render(options);

  // Re-render on language change
  const unsubscribe = onLanguageChange(() => render(options));

  // Store unsubscribe for cleanup
  (modalContainer as any).__unsubscribe = unsubscribe;
}

export function hideComparison(): void {
  if (modalContainer) {
    // Call unsubscribe if exists
    if ((modalContainer as any).__unsubscribe) {
      (modalContainer as any).__unsubscribe();
    }
    modalContainer.innerHTML = "";
    modalContainer.classList.remove("comparison-modal--visible");
  }
  currentFile = null;
}

function render(options: ComparisonOptions): void {
  if (!modalContainer || !currentFile?.result) return;

  const trans = t();
  const file = currentFile;

  modalContainer.innerHTML = `
    <div class="comparison-modal__backdrop" id="comparison-backdrop"></div>
    <div class="comparison-modal__content">
      <button class="comparison-modal__close" id="comparison-close" title="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <h3 class="comparison-modal__title">${file.file.name}</h3>
      
      <div class="comparison-slider" id="comparison-slider">
        <div class="comparison-slider__before" id="comparison-before">
          <img src="${file.preview}" alt="Before" class="comparison-slider__image" />
          <span class="comparison-slider__label comparison-slider__label--before">Before</span>
        </div>
        <div class="comparison-slider__after">
          <img src="${file.result.dataUrl}" alt="After" class="comparison-slider__image" />
          <span class="comparison-slider__label comparison-slider__label--after">After</span>
        </div>
        <div class="comparison-slider__handle" id="comparison-handle">
          <div class="comparison-slider__handle-line"></div>
          <div class="comparison-slider__handle-circle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </div>
      
      <div class="comparison-modal__info">
        <div class="comparison-modal__stat">
          <span class="comparison-modal__stat-label">Original:</span>
          <span>${formatSize(file.result.originalSize)}</span>
          <span class="comparison-modal__stat-dim">${file.result.originalDimensions.width} × ${file.result.originalDimensions.height}</span>
        </div>
        <div class="comparison-modal__stat">
          <span class="comparison-modal__stat-label">Converted:</span>
          <span>${formatSize(file.result.newSize)}</span>
          <span class="comparison-modal__stat-dim">${file.result.newDimensions.width} × ${file.result.newDimensions.height}</span>
        </div>
      </div>
    </div>
  `;

  modalContainer.classList.add("comparison-modal--visible");

  // Attach event listeners
  attachEventListeners(options);
}

function attachEventListeners(options: ComparisonOptions): void {
  if (!modalContainer) return;

  const backdrop = modalContainer.querySelector("#comparison-backdrop");
  const closeBtn = modalContainer.querySelector("#comparison-close");
  const slider = modalContainer.querySelector(
    "#comparison-slider"
  ) as HTMLElement;
  const handle = modalContainer.querySelector(
    "#comparison-handle"
  ) as HTMLElement;
  const beforeContainer = modalContainer.querySelector(
    "#comparison-before"
  ) as HTMLElement;

  // Close handlers
  backdrop?.addEventListener("click", () => {
    hideComparison();
    options.onClose();
  });

  closeBtn?.addEventListener("click", () => {
    hideComparison();
    options.onClose();
  });

  // Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      hideComparison();
      options.onClose();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);

  // Slider drag functionality
  let isDragging = false;

  const updateSlider = (clientX: number) => {
    const rect = slider.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    beforeContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    handle.style.left = `${percentage}%`;
  };

  handle.addEventListener("mousedown", (e) => {
    isDragging = true;
    e.preventDefault();
  });

  slider.addEventListener("click", (e) => {
    updateSlider(e.clientX);
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      updateSlider(e.clientX);
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Touch support
  handle.addEventListener("touchstart", (e) => {
    isDragging = true;
    e.preventDefault();
  });

  document.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length > 0) {
      updateSlider(e.touches[0].clientX);
    }
  });

  document.addEventListener("touchend", () => {
    isDragging = false;
  });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
