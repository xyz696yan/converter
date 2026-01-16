/**
 * Internationalization (i18n) Module
 * Supports Russian and English languages
 */

export type Language = "ru" | "en";

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;

  // DropZone
  dropTitle: string;
  dropSubtitle: string;
  browseFiles: string;
  browseFolder: string;

  // Settings
  settings: string;
  outputFormat: string;
  quality: string;
  dimensionsOptional: string;
  width: string;
  height: string;
  fitMode: string;
  fitContain: string;
  fitCover: string;
  fitFill: string;
  maintainAspectRatio: string;
  convertImages: string;
  resetSettings: string;

  // File List
  pending: string;
  processing: string;
  done: string;
  error: string;
  download: string;
  remove: string;
  downloadAll: string;
  downloadZip: string;
  compare: string;

  // Stats
  filesConverted: string;
  spaceSaved: string;
  sizeChange: string;

  // Footer
  footerText: string;
}

const ru: Translations = {
  // Header
  appTitle: "Конвертер изображений",
  appSubtitle: "Конвертируй и оптимизируй изображения для веба",

  // DropZone
  dropTitle: "Перетащи изображения сюда",
  dropSubtitle: "или нажми для выбора файлов",
  browseFiles: "Выбрать файлы",
  browseFolder: "Выбрать папку",

  // Settings
  settings: "Настройки",
  outputFormat: "Формат",
  quality: "Качество",
  dimensionsOptional: "Размеры (опционально)",
  width: "Ширина",
  height: "Высота",
  fitMode: "Режим заполнения",
  fitContain: "Вписать (contain)",
  fitCover: "Заполнить (cover)",
  fitFill: "Растянуть (fill)",
  maintainAspectRatio: "Сохранять пропорции",
  convertImages: "Конвертировать",
  resetSettings: "Сбросить настройки",

  // File List
  pending: "Ожидание",
  processing: "Обработка...",
  done: "Готово",
  error: "Ошибка",
  download: "Скачать",
  remove: "Удалить",
  downloadAll: "Скачать все",
  downloadZip: "Скачать ZIP",
  compare: "Сравнить",

  // Stats
  filesConverted: "Файлов обработано",
  spaceSaved: "Сэкономлено",
  sizeChange: "Изменение размера",

  // Footer
  footerText: "Canvas API + Web Workers • Без загрузки на сервер",
};

const en: Translations = {
  // Header
  appTitle: "Image Converter",
  appSubtitle: "Convert and optimize your images for the web",

  // DropZone
  dropTitle: "Drop images here",
  dropSubtitle: "or click to browse files",
  browseFiles: "Choose files",
  browseFolder: "Choose folder",

  // Settings
  settings: "Settings",
  outputFormat: "Output Format",
  quality: "Quality",
  dimensionsOptional: "Dimensions (optional)",
  width: "Width",
  height: "Height",
  fitMode: "Fit Mode",
  fitContain: "Contain (fit inside)",
  fitCover: "Cover (fill area)",
  fitFill: "Fill (stretch)",
  maintainAspectRatio: "Maintain aspect ratio",
  convertImages: "Convert Images",
  resetSettings: "Reset settings",

  // File List
  pending: "Pending",
  processing: "Processing...",
  done: "Done",
  error: "Error",
  download: "Download",
  remove: "Remove",
  downloadAll: "Download All",
  downloadZip: "Download ZIP",
  compare: "Compare",

  // Stats
  filesConverted: "Files Converted",
  spaceSaved: "Space Saved",
  sizeChange: "Size Change",

  // Footer
  footerText: "Canvas API + Web Workers • No server uploads",
};

const translations: Record<Language, Translations> = { ru, en };

// Current language state
let currentLanguage: Language = "ru";

// Language change listeners
type LanguageChangeListener = (lang: Language) => void;
const listeners: LanguageChangeListener[] = [];

/**
 * Get current language
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Set language and notify listeners
 */
export function setLanguage(lang: Language): void {
  if (currentLanguage !== lang) {
    currentLanguage = lang;
    localStorage.setItem("image-converter-lang", lang);
    listeners.forEach((listener) => listener(lang));
  }
}

/**
 * Toggle between languages
 */
export function toggleLanguage(): void {
  setLanguage(currentLanguage === "ru" ? "en" : "ru");
}

/**
 * Get translations for current language
 */
export function t(): Translations {
  return translations[currentLanguage];
}

/**
 * Subscribe to language changes
 */
export function onLanguageChange(listener: LanguageChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Initialize language from localStorage or default to Russian
 */
export function initLanguage(): void {
  const saved = localStorage.getItem("image-converter-lang") as Language | null;
  if (saved && (saved === "ru" || saved === "en")) {
    currentLanguage = saved;
  } else {
    currentLanguage = "ru"; // Default to Russian
  }
}
