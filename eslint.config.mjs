import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ── FSD layer boundary rules ──────────────────────────────────────────────────
// Hierarchy (outermost to innermost): app → features → entities → shared
// Lower layers must not import from higher layers.
const fsdBoundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          // shared/ must not import features or entities
          {
            group: ["*/shared/**"],
            importNames: [],
            message: "shared/ layers must not import from features/ or entities/",
          },
          // entities/ must not import features
          {
            group: ["@/features/*", "@/features/*/*"],
            message: "entities/ must not import from features/",
          },
          // No imports from the deleted /components layer
          {
            group: ["@/components", "@/components/*"],
            message:
              "The /components layer has been removed. Import from @/shared/ui/, @/entities/*/ui/, or @/features/*/ui/ instead.",
          },
        ],
      },
    ],
  },
  files: ["shared/**/*.ts", "shared/**/*.tsx"],
};

const fsdEntitiesNoFeatures = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/features/*", "@/features/*/*"],
            message: "entities/ must not import from features/",
          },
          {
            group: ["@/components", "@/components/*"],
            message:
              "The /components layer has been removed. Import from @/shared/ui/, @/entities/*/ui/, or @/features/*/ui/ instead.",
          },
        ],
      },
    ],
  },
  files: ["entities/**/*.ts", "entities/**/*.tsx"],
};

// Global rule: nobody imports from the deleted /components
const noComponents = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/components", "@/components/*"],
            message:
              "The /components layer has been removed. Import from @/shared/ui/, @/entities/*/ui/, or @/features/*/ui/ instead.",
          },
        ],
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
  // FSD boundary enforcement
  noComponents,
  fsdBoundaries,
  fsdEntitiesNoFeatures,
]);

export default eslintConfig;
