/** Dos proyectos: `unit` (sin base de datos) e `integration` (MariaDB de .env.test, en serie).
 *  La BD se recrea con `src/test/resetDb.ts` antes de la suite de integración (ver package.json). */
const base = {
  testEnvironment: "node",
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  setupFiles: ["<rootDir>/src/test/env.ts"],
  rootDir: __dirname,
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: "unit",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      testPathIgnorePatterns: ["/node_modules/", "\\.int\\.test\\.ts$"],
    },
    {
      ...base,
      displayName: "integration",
      testMatch: ["<rootDir>/src/**/*.int.test.ts"],
    },
  ],
};
