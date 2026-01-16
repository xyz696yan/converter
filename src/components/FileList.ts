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
  onRemoveMany: (ids: string[]) => void;
}

interface TreeNode {
  type: "folder" | "file";
  name: string;
  path: string;
  children?: TreeNode[];
  file?: ImageFile;
}

const folderState = new Map<string, boolean>();

export function createFileList(
  container: HTMLElement,
  files: ImageFile[],
  options: FileListOptions
): void {
  if (files.length === 0) {
    container.innerHTML = "";
    return;
  }

  const tree = buildTree(files);

  const html = `
    <div class="file-list file-tree">
      ${renderTree(tree.children || [], 0)}
    </div>
  `;

  container.innerHTML = html;
  attachEventListeners(container, files, options);
}

function renderFileItem(
  file: ImageFile,
  level: number,
  displayName: string,
  title: string
): string {
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
    <div class="file-item fade-in" data-id="${file.id}" style="margin-left: ${level * 16}px">
      <img 
        class="file-item__preview" 
        src="${previewSrc}" 
        alt="${displayName}"
        loading="lazy"
        data-action="compare"
        data-id="${file.id}"
        style="cursor: ${file.result ? "pointer" : "default"}"
        title="${file.result ? trans.compare : ""}"
      />
      <div class="file-item__info">
        <div class="file-item__name" title="${title}">${displayName}</div>
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

function buildTree(files: ImageFile[]): TreeNode {
  const root: TreeNode = { type: "folder", name: "", path: "", children: [] };
  const folderMap = new Map<string, TreeNode>();
  folderMap.set("", root);

  for (const file of files) {
    const normalizedPath = normalizePath(
      file.relativePath || file.file.name
    );
    const parts = normalizedPath.split("/").filter(Boolean);
    let current = root;
    const pathParts: string[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        const filePath = [...pathParts, part].join("/");
        current.children = current.children || [];
        current.children.push({
          type: "file",
          name: part,
          path: filePath,
          file,
        });
      } else {
        pathParts.push(part);
        const folderPath = pathParts.join("/");
        let folderNode = folderMap.get(folderPath);

        if (!folderNode) {
          folderNode = {
            type: "folder",
            name: part,
            path: folderPath,
            children: [],
          };
          current.children = current.children || [];
          current.children.push(folderNode);
          folderMap.set(folderPath, folderNode);
        }

        current = folderNode;
      }
    }
  }

  return root;
}

function renderTree(nodes: TreeNode[], level: number): string {
  const trans = t();
  const sorted = [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return sorted
    .map((node) => {
      if (node.type === "folder") {
        const isExpanded = getFolderState(node.path);
        const children = node.children || [];
        const count = countFiles(children);

        return `
          <div class="file-tree__node" data-path="${node.path}">
            <div class="file-tree__row" data-action="toggle-folder" data-path="${node.path}" style="padding-left: calc(var(--space-4) + ${level * 16}px)">
              <button class="file-tree__toggle" data-action="toggle-folder" data-path="${node.path}" aria-label="toggle">
                ${
                  isExpanded
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"></polyline></svg>`
                }
              </button>
              <div class="file-tree__folder" data-action="toggle-folder" data-path="${node.path}">
                <svg class="file-tree__folder-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l2 3h8a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="file-tree__folder-name">${node.name}</span>
                <span class="file-tree__count">${count}</span>
              </div>
              <button class="file-item__btn file-tree__btn-remove" data-action="remove-folder" data-path="${node.path}" title="${trans.remove}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            ${isExpanded ? renderTree(children, level + 1) : ""}
          </div>
        `;
      }

      const file = node.file!;
      const title = normalizePath(file.relativePath || file.file.name);
      return renderFileItem(file, level, node.name, title);
    })
    .join("");
}

function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === "file") {
      count += 1;
    } else if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
}

function getFolderState(path: string): boolean {
  if (!folderState.has(path)) {
    folderState.set(path, true);
  }
  return folderState.get(path) ?? true;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
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
  container.onclick = (e) => {
    const target = e.target as HTMLElement;
    const actionElement = target.closest("[data-action]") as HTMLElement;

    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const id = actionElement.dataset.id;
    const path = actionElement.dataset.path;

    if (action === "toggle-folder" && path) {
      const current = folderState.get(path) ?? true;
      folderState.set(path, !current);
      createFileList(container, files, options);
      return;
    }

    if (action === "remove-folder" && path) {
      const normalizedPath = normalizePath(path);
      const ids = files
        .filter((file) => {
          const filePath = normalizePath(
            file.relativePath || file.file.name
          );
          return (
            filePath === normalizedPath ||
            filePath.startsWith(`${normalizedPath}/`)
          );
        })
        .map((file) => file.id);
      if (ids.length > 0) {
        options.onRemoveMany(ids);
      }
      return;
    }

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
  };
}
