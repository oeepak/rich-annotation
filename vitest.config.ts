import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    root: path.resolve(__dirname),
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
