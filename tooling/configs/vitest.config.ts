import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".turbo", "coverage"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**", "src/**/types.ts", "src/**/index.ts"],
    },
    clearMocks: true,
    restoreMocks: true,
    unhandledRejections: "throw",
    testTimeout: 10_000,
  },
})
