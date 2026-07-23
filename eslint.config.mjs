// @ts-check
import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: [
      "coverage/**",
      "__tests__/coverage/**",
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "pnpm-lock.yaml",
    ],
  },
];

export default eslintConfig;
