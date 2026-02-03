/**
 * Main Application
 * Coordinates all components and state
 */

import type { ConversionOptions, ImageFile } from "./core/types";
import { convertImageAsync } from "./core/workerManager";
import { downloadAllImages } from "./core/converter";
import { downloadAsZip, generateZipName } from "./core/zipDownload";
import { initLanguage, onLanguageChange, t } from "./core/i18n";
import { createDropZone } from "./components/DropZone";
import {
  createSettingsPanel,
  updateSettingsPanel,
  setSettings,
  getSettings,
} from "./components/SettingsPanel";
import { createFileList } from "./components/FileList";
import { createStats } from "./components/Stats";
import { createLanguageSwitcher } from "./components/LanguageSwitcher";
import { loadImage } from "./core/converter";

// Application State
interface AppState {
  files: ImageFile[];
  settings: ConversionOptions;
  isConverting: boolean;
}

const state: AppState = {
  files: [],
  settings: {
    format: "webp",
    quality: 0.85,
    maintainAspectRatio: true,
    fit: "contain",
    generate2x: false,
  },
  isConverting: false,
};

// DOM Elements
let dropzoneContainer: HTMLElement;
let settingsContainer: HTMLElement;
let fileListContainer: HTMLElement;
let statsContainer: HTMLElement;
let downloadAllBtn: HTMLButtonElement;

export function initApp(): void {
  // Initialize language from localStorage
  initLanguage();

  const trans = t();

  // Create app structure
  const app = document.getElementById("app")!;
  app.innerHTML = `
    <div class="app">
      <header class="header">
        <div class="header__lang" id="lang-container"></div>
        <h1 class="header__title">${trans.appTitle}</h1>
        <p class="header__subtitle">${trans.appSubtitle}</p>
      </header>
      
      <main class="main">
        <div class="converter-layout">
          <div class="converter-main">
            <div id="dropzone-container"></div>
            <div id="stats-container"></div>
            <div id="file-list-container"></div>
            <div id="download-all-container" style="margin-top: var(--space-4); display: none;">
              <div style="display: flex; gap: var(--space-3);">
                <button class="btn btn--secondary" style="flex: 1;" id="download-all-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span id="download-all-text">${trans.downloadAll}</span>
                </button>
                <button class="btn btn--primary" style="flex: 1;" id="download-zip-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <rect x="7" y="3" width="10" height="12" rx="2"></rect>
                    <path d="M10 7h4"></path>
                    <path d="M10 11h4"></path>
                  </svg>
                  <span id="download-zip-text">${trans.downloadZip}</span>
                </button>
              </div>
            </div>
          </div>
          <aside id="settings-container"></aside>
        </div>
      </main>
      
      <footer class="footer">
        <p>${trans.footerText}</p>
      </footer>
    </div>
  `;

  // Get container references
  const langContainer = document.getElementById("lang-container")!;
  dropzoneContainer = document.getElementById("dropzone-container")!;
  settingsContainer = document.getElementById("settings-container")!;
  fileListContainer = document.getElementById("file-list-container")!;
  statsContainer = document.getElementById("stats-container")!;
  downloadAllBtn = document.getElementById(
    "download-all-btn",
  ) as HTMLButtonElement;

  // Initialize language switcher
  createLanguageSwitcher(langContainer);

  // Initialize components
  createDropZone(dropzoneContainer, {
    onFilesAdded: handleFilesAdded,
  });

  createSettingsPanel(settingsContainer, {
    onChange: handleSettingsChange,
    onConvert: handleConvert,
    hasFiles: state.files.length > 0,
  });

  // Download all button
  downloadAllBtn.addEventListener("click", () => {
    const completedFiles = state.files.filter((f) => f.result);
    if (completedFiles.length > 0) {
      downloadAllImages(completedFiles.map((f) => f.result!));
    }
  });

  // Download ZIP button
  const downloadZipBtn = document.getElementById(
    "download-zip-btn",
  ) as HTMLButtonElement;
  downloadZipBtn.addEventListener("click", async () => {
    const completedFiles = state.files.filter((f) => f.result);
    if (completedFiles.length > 0) {
      await downloadAsZip(
        completedFiles.map((f) => f.result!),
        generateZipName("converted"),
      );
    }
  });

  // Re-render header on language change
  onLanguageChange(() => {
    const trans = t();
    const title = document.querySelector(".header__title");
    const subtitle = document.querySelector(".header__subtitle");
    const footer = document.querySelector(".footer p");
    const downloadAllText = document.getElementById("download-all-text");
    const downloadZipText = document.getElementById("download-zip-text");

    if (title) title.textContent = trans.appTitle;
    if (subtitle) subtitle.textContent = trans.appSubtitle;
    if (footer) footer.textContent = trans.footerText;
    if (downloadAllText) downloadAllText.textContent = trans.downloadAll;
    if (downloadZipText) downloadZipText.textContent = trans.downloadZip;

    // Re-render file list and stats with new translations
    render();
  });
}

function handleFilesAdded(newFiles: ImageFile[]): void {
  // Auto-fill dimensions if it's the first file and settings don't have dims yet
  // OR if the user just wants current image dims.
  // The requirement is "Заполняй сразу размеры картинки которую импортировали"
  // (Fill dimensions immediately of the imported picture)
  // We'll update settings based on the FIRST imported file if settings are empty.

  // NOTE: This runs async because loading image takes time
  if (newFiles.length > 0) {
    const firstFile = newFiles[0];
    // Only if not SVG or if we can get dims (SVG handled by loadImage too)
    if (
      typeof getSettings().width === "undefined" &&
      typeof getSettings().height === "undefined"
    ) {
      loadImage(firstFile.file)
        .then((img) => {
          // Update settings UI
          setSettings({
            width: img.naturalWidth,
            height: img.naturalHeight,
            maintainAspectRatio: true,
          });
          // Update local state is handled by the onChange callback from SettingsPanel
        })
        .catch((err) => console.warn("Could not auto-fill dimensions", err));
    }
  }

  state.files = [...state.files, ...newFiles];
  render();
}

function handleSettingsChange(settings: ConversionOptions): void {
  state.settings = settings;
}

async function handleConvert(): Promise<void> {
  if (state.isConverting || state.files.length === 0) return;

  state.isConverting = true;

  // If 2x generation is enabled, create 2x variants for pending files
  if (state.settings.generate2x) {
    const newVariants: ImageFile[] = [];

    state.files.forEach((file) => {
      if (file.status === "pending" && !file.customOptions) {
        // Calculate 2x dimensions
        // We need the TARGET dimensions.
        // If width/height are set in settings, we use those * 2.
        // If not set, we can't easily guess 2x without knowing original,
        // BUT worker will calculate dynamic dimensions if width/height are undefined.
        // So for 2x, if settings are set, we multiply. If not, we might need to rely on worker?
        // Existing worker/resizer handles "undefined" as "keep original".
        // So "original * 2" is what we want if undefined.
        // But we can't express "original * 2" in ConversionOptions directly if it expects exact numbers.
        // Wait, ConversionOptions takes numbers.
        // If width is undefined, it uses original.
        // To support logic "2x of original" without knowing original, we need to know original.
        // Which means we might need to lazy-calculate this INSIDE the loop or pass a flag.
        // But current architecture passes resolved options.

        // Simplest approach: We rely on the fact we Auto-Fill dimensions now.
        // So width/height are likely set.
        // If they are NOT set, it means user removed them.
        // If user removed them, they probably want original size.
        // So 2x would be original * 2.
        // But we don't have original size here yet (it's in the loop).

        // Let's create the variant, and resolve the dimensions inside the loop below or
        // assume width/height are set due to Auto-Fill.
        // If they are not set, we can't do 2x easily without loading image first.

        const baseWidth = state.settings.width;
        const baseHeight = state.settings.height;

        const opts: Partial<ConversionOptions> = {
          generate2x: false, // Don't recurse
        };

        if (baseWidth) opts.width = baseWidth * 2;
        if (baseHeight) opts.height = baseHeight * 2;

        // If neither is set, we can't specify "2x" easily unless we inspect file.
        // BUT, we can inspect file inside the loop.

        // Parse filename to insert @2x before extension for the label
        const lastDotIndex = file.file.name.lastIndexOf(".");
        let labelName = file.file.name;
        if (lastDotIndex !== -1) {
          labelName =
            file.file.name.substring(0, lastDotIndex) +
            "@2x" +
            file.file.name.substring(lastDotIndex);
        } else {
          labelName = file.file.name + "@2x";
        }

        const variantId = `${file.id}-2x`;
        const variant: ImageFile = {
          ...file,
          id: variantId,
          label: labelName,
          customOptions: opts,
          status: "pending",
          progress: 0,
          result: undefined,
          error: undefined,
        };

        newVariants.push(variant);
      }
    });

    state.files = [...state.files, ...newVariants];
    render();
  }

  // Mark all pending files as processing
  state.files = state.files.map((file) => {
    if (file.status === "pending") {
      return { ...file, status: "processing" as const, progress: 0 };
    }
    return file;
  });
  render();

  // Process files sequentially
  for (const file of state.files) {
    if (file.status !== "processing") continue;

    try {
      // Determine effective options
      let effectiveSettings = { ...state.settings };

      // Apply custom options (e.g. for 2x)
      if (file.customOptions) {
        effectiveSettings = { ...effectiveSettings, ...file.customOptions };

        // Special case for "2x of original" if width/height missing
        if (!effectiveSettings.width && !effectiveSettings.height) {
          const img = await loadImage(file.file);
          effectiveSettings.width = img.naturalWidth * 2;
          effectiveSettings.height = img.naturalHeight * 2;
        }
      }

      // Make sure we handle filename for 2x
      // (The worker logic currently renames based on format, but doesn't append @2x)
      // We can intercept the result and rename it.

      console.log(
        `[App] Starting conversion for ${file.id} (${file.label || file.file.name})`,
      );

      const result = await convertImageAsync(
        file.file,
        effectiveSettings,
        (progress) => {
          updateFileProgress(file.id, progress);
        },
      );
      console.log(`[App] Finished conversion for ${file.id}`);

      // If this is a 2x variant (or just checking if dimensions match 2x logic), append suffix
      if (file.customOptions) {
        // Modify result.newName to include @2x
        const parts = result.newName.split(".");
        const ext = parts.pop();
        result.newName = `${parts.join(".")}@2x.${ext}`;

        // Also update blob/dataUrl if needed? No, content is fine, just name.
        result.originalName = result.newName; // For display? No.
      }

      updateFileResult(file.id, {
        ...result,
        relativePath: file.relativePath,
      });
    } catch (error) {
      updateFileError(
        file.id,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  state.isConverting = false;
  render();
}

function updateFileProgress(id: string, progress: number): void {
  state.files = state.files.map((file) => {
    if (file.id === id) {
      return { ...file, progress };
    }
    return file;
  });
  render();
}

function updateFileResult(id: string, result: ImageFile["result"]): void {
  state.files = state.files.map((file) => {
    if (file.id === id) {
      return { ...file, status: "done" as const, progress: 100, result };
    }
    return file;
  });
  render();
}

function updateFileError(id: string, error: string): void {
  state.files = state.files.map((file) => {
    if (file.id === id) {
      return { ...file, status: "error" as const, error };
    }
    return file;
  });
  render();
}

function handleRemoveFile(id: string): void {
  const file = state.files.find((f) => f.id === id);
  if (file) {
    // Revoke object URL to free memory
    URL.revokeObjectURL(file.preview);
  }
  state.files = state.files.filter((f) => f.id !== id);
  render();
}

function handleRemoveMany(ids: string[]): void {
  const idSet = new Set(ids);
  state.files.forEach((file) => {
    if (idSet.has(file.id)) {
      URL.revokeObjectURL(file.preview);
    }
  });
  state.files = state.files.filter((file) => !idSet.has(file.id));
  render();
}

function render(): void {
  // Update file list
  createFileList(fileListContainer, state.files, {
    onRemove: handleRemoveFile,
    onRemoveMany: handleRemoveMany,
  });

  // Update stats
  createStats(statsContainer, state.files);

  // Update settings panel button state
  updateSettingsPanel(settingsContainer, state.files.length > 0);

  // Update download all visibility
  const downloadAllContainer = document.getElementById(
    "download-all-container",
  );
  if (downloadAllContainer) {
    const hasCompletedFiles = state.files.some((f) => f.result);
    downloadAllContainer.style.display = hasCompletedFiles ? "block" : "none";
  }
}
