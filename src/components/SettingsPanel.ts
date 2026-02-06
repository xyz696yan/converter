/**
 * Settings Panel Component
 * Controls for conversion options
 */

import type { ConversionOptions, FitMode, OutputFormat } from "../core/types";
import type { Translations } from "../core/i18n";
import { t, onLanguageChange } from "../core/i18n";

export interface SettingsPanelOptions {
  onChange: (settings: ConversionOptions) => void;
  onConvert: () => void;
  hasFiles: boolean;
}

const DEFAULT_SETTINGS: ConversionOptions = {
  format: "webp",
  quality: 0.85,
  maintainAspectRatio: true,
  fit: "contain",
};

let currentSettings: ConversionOptions = { ...DEFAULT_SETTINGS };
let settingsContainer: HTMLElement | null = null;
let settingsOptions: SettingsPanelOptions | null = null;

export function createSettingsPanel(
  container: HTMLElement,
  options: SettingsPanelOptions,
): void {
  settingsContainer = container;
  settingsOptions = options;

  render();

  // Re-render on language change
  onLanguageChange(() => render());
}

export function updateSettingsPanel(
  container: HTMLElement,
  hasFiles: boolean,
): void {
  if (settingsOptions) {
    settingsOptions.hasFiles = hasFiles;
  }
  const convertBtn = container.querySelector(
    "#convert-btn",
  ) as HTMLButtonElement;
  if (convertBtn) {
    convertBtn.disabled = !hasFiles;
  }
}

export function getSettings(): ConversionOptions {
  return { ...currentSettings };
}

export function setSettings(settings: Partial<ConversionOptions>): void {
  currentSettings = { ...currentSettings, ...settings };
  render();
}

function getFitHint(
  trans: Translations,
  fit: FitMode | undefined,
  maintainAspectRatio: boolean | undefined,
): string {
  if (maintainAspectRatio === false) return trans.fitHintNoAspect;
  if (fit === "cover") return trans.fitHintCover;
  if (fit === "fill") return trans.fitHintFill;
  return trans.fitHintContain;
}

function updateFitHint(): void {
  if (!settingsContainer) return;
  const hint = settingsContainer.querySelector("#fit-hint");
  if (hint) {
    hint.textContent = getFitHint(
      t(),
      currentSettings.fit,
      currentSettings.maintainAspectRatio,
    );
  }
}

function render(): void {
  if (!settingsContainer || !settingsOptions) return;

  const trans = t();
  const qualityPercent = Math.round(currentSettings.quality * 100);

  const html = `
    <div class="card">
      <h3 class="card__title">${trans.settings}</h3>
      <div class="settings">
        
        <!-- Output Format -->
        <div class="settings__group">
          <label class="settings__label">${trans.outputFormat}</label>
          <select class="settings__select" id="format-select">
            <option value="webp" ${currentSettings.format === "webp" ? "selected" : ""}>WebP</option>
            <option value="png" ${currentSettings.format === "png" ? "selected" : ""}>PNG</option>
            <option value="jpeg" ${currentSettings.format === "jpeg" ? "selected" : ""}>JPEG</option>
            <option value="svg" ${currentSettings.format === "svg" ? "selected" : ""}>SVG</option>
          </select>
        </div>
        
        <!-- Quality -->
        <div class="settings__group range-group">
          <div class="range-group__header">
            <label class="settings__label">${trans.quality}</label>
            <span class="range-group__value" id="quality-value">${qualityPercent}%</span>
          </div>
          <input 
            type="range" 
            class="settings__range" 
            id="quality-range"
            min="1" 
            max="100" 
            value="${qualityPercent}"
          />
        </div>
        
        <!-- Dimensions -->
        <div class="settings__group">
          <label class="settings__label">${trans.dimensionsOptional}</label>
          <div class="dimension-inputs">
            <input 
              type="number" 
              class="settings__input" 
              id="width-input"
              placeholder="${trans.width}"
              min="1"
              max="10000"
              value="${currentSettings.width || ""}"
            />
            <input 
              type="number" 
              class="settings__input" 
              id="height-input"
              placeholder="${trans.height}"
              min="1"
              max="10000"
              value="${currentSettings.height || ""}"
            />
          </div>
        </div>
        
        <!-- Fit Mode -->
        <div class="settings__group">
          <label class="settings__label">${trans.fitMode}</label>
          <select class="settings__select" id="fit-select">
            <option value="contain" ${currentSettings.fit === "contain" ? "selected" : ""}>${trans.fitContain}</option>
            <option value="cover" ${currentSettings.fit === "cover" ? "selected" : ""}>${trans.fitCover}</option>
            <option value="fill" ${currentSettings.fit === "fill" ? "selected" : ""}>${trans.fitFill}</option>
          </select>
          <span class="settings__hint" id="fit-hint">${getFitHint(trans, currentSettings.fit, currentSettings.maintainAspectRatio)}</span>
        </div>
        
        <!-- Maintain Aspect Ratio -->
        <label class="checkbox">
          <input 
            type="checkbox" 
            class="checkbox__input" 
            id="aspect-ratio-checkbox"
            ${currentSettings.maintainAspectRatio ? "checked" : ""}
          />
          <span class="checkbox__label">${trans.maintainAspectRatio}</span>
        </label>
        
        <!-- Generate 2x -->
        <label class="checkbox">
          <input 
            type="checkbox" 
            class="checkbox__input" 
            id="generate-2x-checkbox"
            ${currentSettings.generate2x ? "checked" : ""}
          />
          <span class="checkbox__label">${trans.generate2x}</span>
        </label>
        
        <!-- Reset Button -->
        <button class="btn btn--secondary btn--full" id="reset-btn">
          ${trans.resetSettings}
        </button>

        <!-- Convert Button -->
        <button class="btn btn--primary btn--full btn--lg" id="convert-btn" ${
          settingsOptions.hasFiles ? "" : "disabled"
        }>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          ${trans.convertImages}
        </button>
        
      </div>
    </div>
  `;

  settingsContainer.innerHTML = html;
  attachEventListeners();
}

function attachEventListeners(): void {
  if (!settingsContainer || !settingsOptions) return;

  const formatSelect = settingsContainer.querySelector(
    "#format-select",
  ) as HTMLSelectElement;
  const qualityRange = settingsContainer.querySelector(
    "#quality-range",
  ) as HTMLInputElement;
  const qualityValue = settingsContainer.querySelector(
    "#quality-value",
  ) as HTMLSpanElement;
  const widthInput = settingsContainer.querySelector(
    "#width-input",
  ) as HTMLInputElement;
  const heightInput = settingsContainer.querySelector(
    "#height-input",
  ) as HTMLInputElement;
  const fitSelect = settingsContainer.querySelector(
    "#fit-select",
  ) as HTMLSelectElement;
  const aspectRatioCheckbox = settingsContainer.querySelector(
    "#aspect-ratio-checkbox",
  ) as HTMLInputElement;
  const resetBtn = settingsContainer.querySelector(
    "#reset-btn",
  ) as HTMLButtonElement;
  const convertBtn = settingsContainer.querySelector(
    "#convert-btn",
  ) as HTMLButtonElement;

  // Format change
  formatSelect.addEventListener("change", () => {
    currentSettings.format = formatSelect.value as OutputFormat;
    settingsOptions!.onChange(currentSettings);
  });

  // Quality change
  qualityRange.addEventListener("input", () => {
    const value = parseInt(qualityRange.value, 10);
    qualityValue.textContent = `${value}%`;
    currentSettings.quality = value / 100;
    settingsOptions!.onChange(currentSettings);
  });

  // Width change
  widthInput.addEventListener("input", () => {
    const value = widthInput.value ? parseInt(widthInput.value, 10) : undefined;
    currentSettings.width = value;
    settingsOptions!.onChange(currentSettings);
  });

  // Height change
  heightInput.addEventListener("input", () => {
    const value = heightInput.value
      ? parseInt(heightInput.value, 10)
      : undefined;
    currentSettings.height = value;
    settingsOptions!.onChange(currentSettings);
  });

  // Fit mode change
  fitSelect.addEventListener("change", () => {
    currentSettings.fit = fitSelect.value as FitMode;
    updateFitHint();
    settingsOptions!.onChange(currentSettings);
  });

  // Aspect ratio toggle
  aspectRatioCheckbox.addEventListener("change", () => {
    currentSettings.maintainAspectRatio = aspectRatioCheckbox.checked;
    updateFitHint();
    settingsOptions!.onChange(currentSettings);
  });

  // Generate 2x toggle
  const generate2xCheckbox = settingsContainer.querySelector(
    "#generate-2x-checkbox",
  ) as HTMLInputElement;
  if (generate2xCheckbox) {
    generate2xCheckbox.addEventListener("change", () => {
      currentSettings.generate2x = generate2xCheckbox.checked;
      settingsOptions!.onChange(currentSettings);
    });
  }

  // Reset button
  resetBtn.addEventListener("click", () => {
    currentSettings = { ...DEFAULT_SETTINGS };
    settingsOptions!.onChange(currentSettings);
    render();
  });

  // Convert button
  convertBtn.addEventListener("click", () => {
    settingsOptions!.onConvert();
  });
}
