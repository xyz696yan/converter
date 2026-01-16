/**
 * Main Application
 * Coordinates all components and state
 */

import type { ConversionOptions, ImageFile } from "./core/types";
import { convertImageAsync } from "./core/workerManager";
import { downloadAllImages } from "./core/converter";
import { initLanguage, onLanguageChange, t } from "./core/i18n";
import { createDropZone } from "./components/DropZone";
import {
  createSettingsPanel,
  updateSettingsPanel,
} from "./components/SettingsPanel";
import { createFileList } from "./components/FileList";
import { createStats } from "./components/Stats";
import { createLanguageSwitcher } from "./components/LanguageSwitcher";

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
              <button class="btn btn--secondary btn--full" id="download-all-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span id="download-all-text">${trans.downloadAll}</span>
              </button>
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
    "download-all-btn"
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

  // Re-render header on language change
  onLanguageChange(() => {
    const trans = t();
    const title = document.querySelector(".header__title");
    const subtitle = document.querySelector(".header__subtitle");
    const footer = document.querySelector(".footer p");
    const downloadAllText = document.getElementById("download-all-text");

    if (title) title.textContent = trans.appTitle;
    if (subtitle) subtitle.textContent = trans.appSubtitle;
    if (footer) footer.textContent = trans.footerText;
    if (downloadAllText) downloadAllText.textContent = trans.downloadAll;

    // Re-render file list and stats with new translations
    render();
  });
}

function handleFilesAdded(newFiles: ImageFile[]): void {
  state.files = [...state.files, ...newFiles];
  render();
}

function handleSettingsChange(settings: ConversionOptions): void {
  state.settings = settings;
}

async function handleConvert(): Promise<void> {
  if (state.isConverting || state.files.length === 0) return;

  state.isConverting = true;

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
      const result = await convertImageAsync(
        file.file,
        state.settings,
        (progress) => {
          updateFileProgress(file.id, progress);
        }
      );

      updateFileResult(file.id, result);
    } catch (error) {
      updateFileError(
        file.id,
        error instanceof Error ? error.message : "Unknown error"
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

function render(): void {
  // Update file list
  createFileList(fileListContainer, state.files, {
    onRemove: handleRemoveFile,
  });

  // Update stats
  createStats(statsContainer, state.files);

  // Update settings panel button state
  updateSettingsPanel(settingsContainer, state.files.length > 0);

  // Update download all visibility
  const downloadAllContainer = document.getElementById(
    "download-all-container"
  );
  if (downloadAllContainer) {
    const hasCompletedFiles = state.files.some((f) => f.result);
    downloadAllContainer.style.display = hasCompletedFiles ? "block" : "none";
  }
}
