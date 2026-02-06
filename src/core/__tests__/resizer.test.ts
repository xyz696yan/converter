/**
 * Tests for resizer module
 */

import { describe, it, expect } from "vitest";
import { calculateDimensions } from "../resizer";
import type { ImageDimensions } from "../types";

describe("calculateDimensions", () => {
  const original: ImageDimensions = { width: 1000, height: 500 };

  describe("no target dimensions", () => {
    it("returns original dimensions when no target specified", () => {
      const result = calculateDimensions(original, {});
      expect(result).toEqual({ width: 1000, height: 500 });
    });
  });

  describe("contain mode", () => {
    it("scales down wide image to fit width", () => {
      const result = calculateDimensions(
        original,
        { width: 500, height: 500 },
        "contain"
      );
      expect(result.width).toBe(500);
      expect(result.height).toBe(250); // maintains 2:1 ratio
    });

    it("scales down tall image to fit height", () => {
      const tall: ImageDimensions = { width: 500, height: 1000 };
      const result = calculateDimensions(
        tall,
        { width: 500, height: 500 },
        "contain"
      );
      expect(result.width).toBe(250); // maintains 1:2 ratio
      expect(result.height).toBe(500);
    });

    it("handles only width specified", () => {
      const result = calculateDimensions(original, { width: 500 }, "contain");
      expect(result.width).toBe(500);
      expect(result.height).toBe(250);
    });

    it("handles only height specified", () => {
      const result = calculateDimensions(original, { height: 250 }, "contain");
      expect(result.width).toBe(500);
      expect(result.height).toBe(250);
    });
  });

  describe("cover mode", () => {
    it("scales wide image to cover target area", () => {
      const result = calculateDimensions(
        original,
        { width: 500, height: 500 },
        "cover"
      );
      expect(result.width).toBe(1000);
      expect(result.height).toBe(500);
    });

    it("scales tall image to cover target area", () => {
      const tall: ImageDimensions = { width: 500, height: 1000 };
      const result = calculateDimensions(
        tall,
        { width: 500, height: 500 },
        "cover"
      );
      expect(result.width).toBe(500);
      expect(result.height).toBe(1000);
    });
  });

  describe("fill mode", () => {
    it("uses target dimensions exactly when maintainAspectRatio is false", () => {
      const result = calculateDimensions(
        original,
        { width: 300, height: 300 },
        "fill",
        false
      );
      expect(result).toEqual({ width: 300, height: 300 });
    });

    it("maintains aspect ratio when maintainAspectRatio is true", () => {
      const result = calculateDimensions(
        original,
        { width: 300, height: 300 },
        "fill",
        true
      );
      expect(result).toEqual({ width: 300, height: 300 });
    });
  });

  describe("maintainAspectRatio=false (center-crop output size)", () => {
    it("contain mode returns exact target dimensions for crop", () => {
      const result = calculateDimensions(
        original,
        { width: 600, height: 605 },
        "contain",
        false
      );
      expect(result).toEqual({ width: 600, height: 605 });
    });

    it("cover mode returns exact target dimensions for crop", () => {
      const result = calculateDimensions(
        original,
        { width: 600, height: 605 },
        "cover",
        false
      );
      expect(result).toEqual({ width: 600, height: 605 });
    });

    it("fill mode returns exact target dimensions for crop", () => {
      const result = calculateDimensions(
        original,
        { width: 300, height: 300 },
        "fill",
        false
      );
      expect(result).toEqual({ width: 300, height: 300 });
    });
  });

  describe("edge cases", () => {
    it("handles square images", () => {
      const square: ImageDimensions = { width: 500, height: 500 };
      const result = calculateDimensions(
        square,
        { width: 250, height: 250 },
        "contain"
      );
      expect(result).toEqual({ width: 250, height: 250 });
    });

    it("handles very small target dimensions", () => {
      const result = calculateDimensions(
        original,
        { width: 10, height: 10 },
        "contain"
      );
      expect(result.width).toBe(10);
      expect(result.height).toBe(5);
    });

    it("handles 1:1 aspect ratio target", () => {
      const result = calculateDimensions(
        original,
        { width: 100, height: 100 },
        "contain"
      );
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
    });
  });
});
