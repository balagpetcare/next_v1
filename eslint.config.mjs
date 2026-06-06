import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Production lint gate (CI): strict on hook-order and undefined JSX; legacy Larkon
 * theme paths excluded. React 19 hooks-plugin strict rules and styling rules are
 * tracked debt — see docs/audits/LINT_CLASSIFICATION_REPORT.md.
 */
const LEGACY_IGNORES = [
  ".next/**",
  ".next-*/**",
  "node_modules/**",
  "src/larkon-admin/**",
  "src/larkon-ui/**",
  "_vendor_templates/**",
  "demo/**",
  "examples/**",
  "legacy/**",
  "**/*.generated.*",
  "build-output.txt",
  "build-result.txt",
  "lint-output.txt",
  "lint-audit.json",
  "lint-analysis.json",
  "lint-errors.json",
  "tsc-output.txt",
  "_full_original.jsx",
];

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: LEGACY_IGNORES },
  ...nextCoreWebVitals,
  {
    name: "bpa/production-lint-policy",
    rules: {
      // React 19 hooks plugin strictness: tracked debt, non-blocking
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/exhaustive-deps": "off",

      // --- Styling / perf / a11y suggestions: non-blocking ---
      "@next/next/no-img-element": "off",
      "@next/next/no-css-tags": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/role-has-required-aria-props": "off",
      "jsx-a11y/role-supports-aria-props": "off",
      "jsx-a11y/alt-text": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
];
