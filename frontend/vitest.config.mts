import { defineConfig } from "vitest/config";

// Explicit ESM keeps the test runner independent of the Next.js package module mode.
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"], restoreMocks: true },
});
