import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    maxWorkers: '50%',
    minWorkers: 1,
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
