import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe/it/expect available without imports (jest-compatible)
    environment: "node",
    include: ["src/test/**/*.test.ts"],
  },
});
