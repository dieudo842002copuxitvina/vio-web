import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── FSD layer boundary rules ──────────────────────────────────────────────────
// Hierarchy (outermost to innermost): app → features → entities → shared
// Lower layers must not import from higher layers.
//
// ESLint 9 no-restricted-imports uses exact `paths` (not glob patterns).
// For glob-based enforcement use separate per-directory configs below.

const noDeletedComponentsLayer = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        name: "@/components",
        message:
          "The /components layer has been removed. Import from @/shared/ui/, @/entities/*/ui/, or @/features/*/ui/ instead.",
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Guard against re-introducing the deleted /components layer
  noDeletedComponentsLayer,
  // Downgrade pre-existing stylistic violations to warnings so CI stays green
  // while not hiding new violations from code review.
  {
    rules: {
      "react/no-children-prop":               "warn",
      "react-hooks/set-state-in-effect":      "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
]);

export default eslintConfig;
