import { describe, it, expect } from "vitest";
import { optimizeSVG } from "../svgOptimizer";

describe("SVG Optimizer", () => {
  it("should remove comments", () => {
    const input = "<!-- comment --><svg>content</svg>";
    const output = optimizeSVG(input);
    expect(output).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg">content</svg>',
    );
  });

  it("should remove extra whitespace", () => {
    const input = "<svg>   content   </svg>  ";
    const output = optimizeSVG(input);
    expect(output).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg"> content </svg>',
    );
  });

  it("should add xmlns if missing", () => {
    const input = "<svg>content</svg>";
    const output = optimizeSVG(input);
    expect(output).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("should handle empty input", () => {
    expect(optimizeSVG("")).toBe("");
  });
});
