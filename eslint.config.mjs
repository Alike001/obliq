import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/.next/**", "**/coverage/**", "**/dist/**", "**/drizzle/**"] },
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["vitest.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    settings: { next: { rootDir: "apps/web/" } },
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
);
