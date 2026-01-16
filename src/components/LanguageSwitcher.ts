/**
 * Language Switcher Component
 */

import { getLanguage, toggleLanguage, onLanguageChange } from "../core/i18n";

export function createLanguageSwitcher(container: HTMLElement): void {
  render(container);

  // Re-render on language change
  onLanguageChange(() => render(container));
}

function render(container: HTMLElement): void {
  const currentLang = getLanguage();

  const html = `
    <button class="lang-switcher" id="lang-switcher" title="Switch language">
      <span class="lang-switcher__flag">${currentLang === "ru" ? "🇷🇺" : "🇬🇧"}</span>
      <span class="lang-switcher__code">${currentLang.toUpperCase()}</span>
    </button>
  `;

  container.innerHTML = html;

  const button = container.querySelector("#lang-switcher") as HTMLButtonElement;
  button.addEventListener("click", toggleLanguage);
}
