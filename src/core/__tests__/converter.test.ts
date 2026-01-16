/**
 * Tests for converter module
 */

import { describe, it, expect } from "vitest";
import {
  generateNewFilename,
  formatFileSize,
  calculateCompressionRatio,
} from "../converter";

describe("generateNewFilename", () => {
  it("replaces extension with webp", () => {
    expect(generateNewFilename("image.png", "webp")).toBe("image.webp");
    expect(generateNewFilename("photo.jpg", "webp")).toBe("photo.webp");
    expect(generateNewFilename("picture.jpeg", "webp")).toBe("picture.webp");
  });

  it("replaces extension with png", () => {
    expect(generateNewFilename("image.webp", "png")).toBe("image.png");
    expect(generateNewFilename("photo.jpg", "png")).toBe("photo.png");
  });

  it("replaces extension with jpeg", () => {
    expect(generateNewFilename("image.png", "jpeg")).toBe("image.jpg");
    expect(generateNewFilename("photo.webp", "jpeg")).toBe("photo.jpg");
  });

  it("handles filenames with multiple dots", () => {
    expect(generateNewFilename("my.photo.2024.png", "webp")).toBe(
      "my.photo.2024.webp"
    );
  });

  it("handles filenames with no extension", () => {
    expect(generateNewFilename("image", "webp")).toBe("image.webp");
  });
});

describe("formatFileSize", () => {
  it("formats bytes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10240)).toBe("10 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
    expect(formatFileSize(5242880)).toBe("5 MB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });
});

describe("calculateCompressionRatio", () => {
  it("calculates positive compression", () => {
    expect(calculateCompressionRatio(1000, 500)).toBe(50);
    expect(calculateCompressionRatio(1000, 250)).toBe(75);
    expect(calculateCompressionRatio(1000, 100)).toBe(90);
  });

  it("calculates no compression", () => {
    expect(calculateCompressionRatio(1000, 1000)).toBe(0);
  });

  it("calculates negative compression (file grew)", () => {
    expect(calculateCompressionRatio(1000, 1500)).toBe(-50);
  });

  it("handles zero original size", () => {
    expect(calculateCompressionRatio(0, 100)).toBe(0);
  });
});
