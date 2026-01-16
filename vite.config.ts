import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/core/**/*.ts"],
      exclude: ["**/*.test.ts", "**/types.ts"],
    },
  },
});
