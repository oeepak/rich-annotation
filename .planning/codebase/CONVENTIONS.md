# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- Components: PascalCase for `.tsx` files (e.g., `FieldInput.tsx`, `OverviewTab.tsx`)
- Utility functions: camelCase for `.ts` files (e.g., `buildText.ts`, `parseText.ts`, `validateField.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useSelection.ts`, `usePluginMessage.ts`)
- Test files: Same base name as source with `.test.ts` or `.test.tsx` suffix (e.g., `parseText.test.ts`, `FieldInput.test.tsx`)

**Functions:**
- Exported functions: camelCase (e.g., `buildText()`, `parseText()`, `validateField()`)
- Component functions: PascalCase (e.g., `FieldInput()`, `OverviewRow()`, `App()`)
- Handler functions: camelCase with `handle` or `on` prefix (e.g., `handleMessage()`, `onEdit()`)
- Utility functions: Descriptive camelCase (e.g., `postToPlugin()`, `renderHook()`)

**Variables:**
- State variables: camelCase (e.g., `fieldValues`, `selectedNodeId`, `pageAnnotations`)
- Constants (module-level): UPPER_SNAKE_CASE for color maps (e.g., `COLOR_MAP`)
- Type aliases for internal state: camelCase (e.g., `BuildValues`, `AllFieldValues`, `GroupValues`)
- Props interfaces: PascalCase ending with `Props` (e.g., `FieldInputProps`, `GroupFieldInputProps`, `OverviewRowProps`)

**Types:**
- Type names: PascalCase (e.g., `FieldSchema`, `ParsedField`, `AnnotationInfo`, `CategorySchema`, `SchemaStore`)
- Type unions/literals: camelCase or quoted (e.g., `FieldType`, `ParseMatch`)
- Interface names: PascalCase (e.g., `FieldInputProps`, `ValidationResult`, `ParseResult`)

## Code Style

**Formatting:**
- No explicit formatter configuration (eslint, prettier) in project root
- Follows TypeScript strict mode settings from `tsconfig.json`
- Consistent 2-space indentation observed
- Max line length: Generally keeps lines under 100 characters

**Linting:**
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`
- Target: ES2020
- Module resolution: bundler
- Type checking during build via `build-figma-plugin --typecheck`

## Import Organization

**Order:**
1. React/Preact imports from library (e.g., `import React from "react"`, `import { useState } from "preact/hooks"`)
2. Type imports (e.g., `import type { FieldSchema } from "@shared/types"`)
3. Local component imports (e.g., `import { FieldInput } from "../../src/ui/components/FieldInput"`)
4. Shared utility imports (e.g., `import { buildText } from "../../src/shared/buildText"`)
5. Side-effect imports (e.g., `import "@testing-library/jest-dom/vitest"`)

**Path Aliases:**
- `@shared/*` → `./src/shared/*` - Used consistently across UI and plugin code
- Relative paths used for component imports (e.g., `../../src/ui/hooks/useSelection`)

**Type imports syntax:**
- Always use `import type` for type-only imports to improve tree-shaking (e.g., `import type { FieldSchema } from "@shared/types"`)

## Error Handling

**Patterns:**
- Validation functions return a `ValidationResult` object with `{ parsedValue, matched }` structure
- Boolean `matched` flag indicates validation success/failure (see `validateField.ts`)
- Empty strings treated as valid (matched: true) for optional fields
- Parse operations return structured results with match status (e.g., `ParseResult` with `fields` and `parseMatch`)
- Type mismatches return `{ parsedValue: null, matched: false }` pattern (e.g., in `validateField()` for number validation)
- No try-catch blocks in data transformation functions; validation happens through type guards and pattern matching

## Logging

**Framework:** No explicit logging framework detected

**Patterns:**
- No logging found in source code
- Focus is on validation and state management rather than runtime diagnostics

## Comments

**When to Comment:**
- Rare use of comments; code is self-documenting through type signatures and function names
- Comments appear only for complex logic (e.g., parsing algorithm in `parseText.ts` line 14)
- Field descriptions in types use inline comments (e.g., `children?: FieldSchema[]; // for group type — only flat children (no nested groups)`)

**JSDoc/TSDoc:**
- Not used in the codebase
- Type definitions provide documentation through interface names and property names

## Function Design

**Size:** Functions are generally small (5-40 lines typical)
- Utility functions focus on single responsibilities (e.g., `buildText()`, `parseText()`, `validateField()`)
- React components divided by field type (e.g., `FieldInput()` has separate logic branches for select/boolean/text)
- Hooks handle multiple related state operations together (e.g., `useSelectionFields()` manages field values, updates, and validation)

**Parameters:**
- Props passed as single object (destructured): `{ schema, value, matched, onChange }`
- Hook options passed as single object: `{ label, fieldData, schemaFields }`
- Validation and parsing functions take minimal parameters: `(rawValue, schema)` or `(text, schemaFields)`

**Return Values:**
- React components return JSX (rendered as `h()` in Preact)
- Utility functions return structured objects: `{ parsedValue, matched }`, `{ fields, parseMatch }`
- Hooks return object with multiple related values: `{ fieldValues, updateField, previewText, currentFieldData, parsedFields, allMatched }`

## Module Design

**Exports:**
- Named exports used consistently (e.g., `export function buildText()`, `export function FieldInput()`)
- Type exports use `export type` (e.g., `export type FieldSchema = "text" | "number" | ...`)
- Interface exports use `export interface` (e.g., `export interface FieldInputProps`)

**Barrel Files:**
- Not used; imports are direct to source files
- Each file exports its main function/component

**Organization by domain:**
- `src/shared/` - Domain logic (parsing, validation, text building, types, messages)
- `src/ui/components/` - React/Preact components
- `src/ui/hooks/` - Custom React/Preact hooks
- `src/plugin/` - Figma plugin code (not analyzed in detail)

## Structural Patterns

**Component Structure:**
- Functional components with hooks (Preact and React)
- Props defined as interfaces above component function
- Conditional rendering using if-checks or ternary operators
- Event handlers defined inline or as arrow functions

**Data Flow:**
- Props down, callbacks up pattern (e.g., `onChange`, `onEdit` handlers)
- Custom hooks manage complex state and return object with values and setters
- No Redux or global state management detected

**Type Safety:**
- Full TypeScript strict mode
- All React imports are typed (React or h from preact)
- Type aliases used for complex state types (e.g., `BuildValues`, `AllFieldValues`, `GroupValues`)

---

*Convention analysis: 2026-03-13*
