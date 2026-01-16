/**
 * Stats Component
 * Shows conversion statistics
 */

import type { ImageFile } from "../core/types";
import { formatFileSize, calculateCompressionRatio } from "../core/converter";
import { t } from "../core/i18n";

export function createStats(container: HTMLElement, files: ImageFile[]): void {
  const completedFiles = files.filter((f) => f.result);

  if (completedFiles.length === 0) {
    container.innerHTML = "";
    return;
  }

  const trans = t();

  const totalOriginal = completedFiles.reduce(
    (sum, f) => sum + (f.result?.originalSize || 0),
    0
  );
  const totalNew = completedFiles.reduce(
    (sum, f) => sum + (f.result?.newSize || 0),
    0
  );
  const avgRatio = calculateCompressionRatio(totalOriginal, totalNew);

  const html = `
    <div class="stats fade-in">
      <div class="stat">
        <div class="stat__value">${completedFiles.length}</div>
        <div class="stat__label">${trans.filesConverted}</div>
      </div>
      <div class="stat">
        <div class="stat__value">${formatFileSize(Math.abs(totalOriginal - totalNew))}</div>
        <div class="stat__label">${trans.spaceSaved}</div>
      </div>
      <div class="stat">
        <div class="stat__value">${avgRatio >= 0 ? "-" : "+"}${Math.abs(avgRatio)}%</div>
        <div class="stat__label">${trans.sizeChange}</div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}
