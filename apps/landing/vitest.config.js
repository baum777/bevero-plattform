import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const localModule = (path) => fileURLToPath(new URL(`./node_modules/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^react$/, replacement: localModule("react/index.js") },
      { find: /^react\/jsx-runtime$/, replacement: localModule("react/jsx-runtime.js") },
      { find: /^react-dom$/, replacement: localModule("react-dom/index.js") },
      { find: /^react-dom\/client$/, replacement: localModule("react-dom/client.js") },
      { find: /^react-dom\/test-utils$/, replacement: localModule("react-dom/test-utils.js") },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
    coverage: {
      reporter: ["text", "json-summary"],
      include: ["src/sandbox/**/*.{js,jsx}"],
      thresholds: {
        statements: 80,
        branches: 80,
        lines: 80,
      },
    },
  },
});
