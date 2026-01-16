import type { ImageFile } from "../core/types";

export interface ComparisonOptions {
  onClose: () => void;
}

let currentFile: ImageFile | null = null;
let modalContainer: HTMLElement | null = null;
let cleanupListeners: (() => void) | null = null;

// Zoom state
let zoom = 1;
let pan = { x: 0, y: 0 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;

export function showComparison(
  file: ImageFile,
  options: ComparisonOptions
): void {
  if (!file.result) return;

  // Cleanup previous if exists (safety)
  if (cleanupListeners) {
    cleanupListeners();
    cleanupListeners = null;
  }

  currentFile = file;

  // Reset state
  zoom = 1;
  pan = { x: 0, y: 0 };

  // Create modal container if not exists
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "comparison-modal";
    document.body.appendChild(modalContainer);
  }

  render(options);
}

export function hideComparison(): void {
  if (cleanupListeners) {
    cleanupListeners();
    cleanupListeners = null;
  }

  if (modalContainer) {
    modalContainer.innerHTML = "";
    modalContainer.classList.remove("comparison-modal--visible");
  }
  currentFile = null;
}

function render(options: ComparisonOptions): void {
  if (!modalContainer || !currentFile?.result) return;

  const file = currentFile;
  const result = file.result!;

  modalContainer.innerHTML = `
    <div class="comparison-modal__backdrop" id="comparison-backdrop"></div>
    <div class="comparison-modal__content">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); gap: var(--space-4);">
        <h3 class="comparison-modal__title" style="margin-bottom: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.file.name}</h3>
        
        <div class="comparison-modal__controls">
          <button class="comparison-control-btn" id="zoom-out" title="Zoom Out">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button class="comparison-control-btn" id="zoom-reset" title="Reset Zoom">
            <span id="zoom-label" style="font-size: 10px; font-weight: bold;">100%</span>
          </button>
          <button class="comparison-control-btn" id="zoom-in" title="Zoom In">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <button class="comparison-modal__close" id="comparison-close" title="Close" style="position: static; margin: 0;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="comparison-slider" id="comparison-slider">
        <div class="comparison-slider__before" id="comparison-before">
          <img src="${file.preview}" alt="Before" class="comparison-slider__image" />
          <span class="comparison-slider__label comparison-slider__label--before">Before</span>
        </div>
        <div class="comparison-slider__after">
          <img src="${result.dataUrl}" alt="After" class="comparison-slider__image" />
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
          <span>${formatSize(result.originalSize)}</span>
          <span class="comparison-modal__stat-dim">${result.originalDimensions.width} × ${result.originalDimensions.height}</span>
        </div>
        <div class="comparison-modal__stat">
          <span class="comparison-modal__stat-label">Converted:</span>
          <span>${formatSize(result.newSize)}</span>
          <span class="comparison-modal__stat-dim">${result.newDimensions.width} × ${result.newDimensions.height}</span>
        </div>
      </div>
    </div>
  `;

  modalContainer.classList.add("comparison-modal--visible");

  attachEventListeners(options);
}

function updateImageTransform() {
  if (!modalContainer) return;
  const images = modalContainer.querySelectorAll(".comparison-slider__image");
  images.forEach((img) => {
    (img as HTMLElement).style.transform =
      `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  });

  // Update label
  const label = modalContainer.querySelector("#zoom-label");
  if (label) {
    label.textContent = `${Math.round(zoom * 100)}%`;
  }
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

  // Controls
  const zoomIn = modalContainer.querySelector("#zoom-in");
  const zoomOut = modalContainer.querySelector("#zoom-out");
  const zoomReset = modalContainer.querySelector("#zoom-reset");

  const close = () => {
    hideComparison();
    options.onClose();
  };

  backdrop?.addEventListener("click", close);
  closeBtn?.addEventListener("click", close);

  // Zoom handlers
  const setZoom = (newZoom: number) => {
    zoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    if (zoom === 1) pan = { x: 0, y: 0 };
    updateImageTransform();
  };

  zoomIn?.addEventListener("click", () => setZoom(zoom * 1.5));
  zoomOut?.addEventListener("click", () => setZoom(zoom / 1.5));
  zoomReset?.addEventListener("click", () => setZoom(1));

  // Wheel Zoom
  slider.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    },
    { passive: false }
  );

  // Event handlers for document/global events need to be named for removal
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close();
    }
  };

  let isDraggingHandle = false;
  let isPanning = false;
  let dragStart = { x: 0, y: 0 };
  let panStart = { x: 0, y: 0 };

  const updateSlider = (clientX: number) => {
    const rect = slider.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    beforeContainer.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    handle.style.left = `${percentage}%`;
  };

  // Handler for handle drag
  handle.addEventListener("mousedown", (e) => {
    isDraggingHandle = true;
    e.stopPropagation();
    e.preventDefault();
  });

  handle.addEventListener("touchstart", (e) => {
    isDraggingHandle = true;
    e.stopPropagation();
    e.preventDefault();
  });

  // Handler for pan start
  slider.addEventListener("mousedown", (e) => {
    isPanning = true;
    dragStart = { x: e.clientX, y: e.clientY };
    panStart = { ...pan };
    e.preventDefault();
  });

  // Global Mouse Move
  const onMouseMove = (e: MouseEvent) => {
    if (isDraggingHandle) {
      updateSlider(e.clientX);
    } else if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      pan = { x: panStart.x + dx, y: panStart.y + dy };
      updateImageTransform();
    }
  };

  const onMouseUp = () => {
    isDraggingHandle = false;
    isPanning = false;
  };

  // Global Touch Move
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      if (isDraggingHandle) {
        updateSlider(e.touches[0].clientX);
      } else if (isPanning || (!isDraggingHandle && e.touches.length === 1)) {
        // If we didn't start panning explicitly (e.g. touch start on slider),
        // maybe check logic. But touch start on slider calls the handler below.
        const dx = e.touches[0].clientX - dragStart.x;
        const dy = e.touches[0].clientY - dragStart.y;
        pan = { x: panStart.x + dx, y: panStart.y + dy };
        updateImageTransform();
      }
    }
  };

  const onTouchEnd = () => {
    isDraggingHandle = false;
    isPanning = false;
  };

  // Touch start on slider for panning
  slider.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1 && !isDraggingHandle) {
      isPanning = true;
      dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart = { ...pan };
    }
  });

  // Add global listeners
  document.addEventListener("keydown", handleEscape);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("touchmove", onTouchMove, { passive: false }); // passive false for preventing scroll if needed
  document.addEventListener("touchend", onTouchEnd);

  // Register cleanup
  cleanupListeners = () => {
    document.removeEventListener("keydown", handleEscape);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
  };
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}
