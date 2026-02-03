/**
 * SVG Optimizer
 * Simple optimization for SVG files
 */

/**
 * Optimize SVG content
 * - Removes unnecessary whitespace
 * - Removes comments
 * - Ensures proper xmlns
 */
export function optimizeSVG(svgContent: string): string {
  if (!svgContent) return "";

  let optimized = svgContent;

  // Remove comments
  optimized = optimized.replace(/<!--[\s\S]*?-->/g, "");

  // Remove newlines and excess whitespace
  optimized = optimized.replace(/\s+/g, " ");

  // Remove whitespace between tags
  optimized = optimized.replace(/>\s+</g, "><");

  // Trim
  optimized = optimized.trim();

  // Ensure xmlns exists if it's missing (basic check)
  if (!optimized.includes('xmlns="http://www.w3.org/2000/svg"')) {
    optimized = optimized.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
  }

  return optimized;
}
