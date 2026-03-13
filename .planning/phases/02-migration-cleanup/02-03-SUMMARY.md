---
phase: 02-migration-cleanup
plan: "03"
subsystem: shared-code-extraction
tags: [refactor, types, css-cleanup, components]
dependency_graph:
  requires: ["02-02"]
  provides: ["AnnotationCategory type", "buildParsedFieldsFromData shared function", "CategoryDropdown component", "cleaned CSS"]
  affects: ["src/plugin/code.ts", "src/ui/hooks/useSelection.ts", "src/ui/components/SelectedTab.tsx", "src/ui/components/SchemaTab.tsx"]
tech_stack:
  added: ["src/shared/buildParsedFieldsFromData.ts", "src/ui/components/CategoryDropdown.tsx"]
  patterns: ["shared type single-source-of-truth", "shared utility function", "shared UI component"]
key_files:
  created:
    - src/shared/buildParsedFieldsFromData.ts
    - src/ui/components/CategoryDropdown.tsx
  modified:
    - src/shared/types.ts
    - src/plugin/code.ts
    - src/ui/hooks/useSelection.ts
    - src/ui/App.tsx
    - src/ui/components/SelectedTab.tsx
    - src/ui/components/SchemaTab.tsx
    - src/ui/components/OverviewTab.tsx
    - src/ui/styles/global.css
    - src/ui/styles/global.css.d.ts
decisions:
  - "AnnotationCategory defined once in shared/types.ts — no more inline { id, label, color } objects at call sites"
  - "buildParsedFieldsFromData extracted to shared/ — plugin/code.ts and useSelection.ts both import it"
  - "CategoryDropdown wraps cfp Dropdown with AnnotationCategory[] input — SelectedTab and SchemaTab use it"
  - "Removed dead CSS classes (.btn, .input, .select, .required) and generic element font rule — cfp components own their styling"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-13"
  tasks_completed: 2
  files_modified: 9
  files_created: 2
---

# Phase 02 Plan 03: Shared Code Extraction and CSS Cleanup Summary

**One-liner:** Extracted AnnotationCategory type, buildParsedFieldsFromData function, and CategoryDropdown component to shared locations; removed dead CSS rules left over from cfp migration.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Extract AnnotationCategory type and buildParsedFieldsFromData function | bba6464 | Done |
| 2 | Extract CategoryDropdown component and clean up CSS | cec569d | Done |

## What Was Built

### Task 1: Type and Function Extraction

- Added `AnnotationCategory` interface to `src/shared/types.ts` — single definition replaces 5 inline `{ id: string; label: string; color: string }` objects
- Created `src/shared/buildParsedFieldsFromData.ts` — moved the field parsing function that was duplicated between `src/plugin/code.ts` (lines 113-141) and `src/ui/hooks/useSelection.ts` (lines 74-91)
- `src/plugin/code.ts`: removed local function, imports shared version via `@shared/buildParsedFieldsFromData`
- `src/ui/hooks/useSelection.ts`: replaced 17 lines of inline parsedFields computation with single `buildParsedFieldsFromData(currentFieldData, schemaFields)` call; removed `validateField` import
- `src/ui/App.tsx`, `src/ui/components/SelectedTab.tsx`, `src/ui/components/SchemaTab.tsx`, `src/ui/components/OverviewTab.tsx`: updated `categories` prop type to `AnnotationCategory[]`

### Task 2: CategoryDropdown Component and CSS Cleanup

- Created `src/ui/components/CategoryDropdown.tsx` — wraps cfp `Dropdown` with `AnnotationCategory[]` input and `string` value/callback interface
- `src/ui/components/SelectedTab.tsx`: replaced `categoryOptions` const + cfp `Dropdown` JSX with `<CategoryDropdown>`; removed `Dropdown` and `DropdownOption` imports
- `src/ui/components/SchemaTab.tsx`: same pattern; removed `categoryOptions` const and cfp `Dropdown` JSX
- `src/ui/styles/global.css`: removed 13 dead CSS rule blocks: `.field-label .required`, `.input`, `.input:focus`, `.input.error`, `.select`, `textarea.input`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-secondary:hover`, `.btn-danger`, `.btn:disabled`, `.schema-field-row .input,.select`; also removed generic `input, select, textarea, button` font rule
- `src/ui/styles/global.css.d.ts`: removed `"btn"`, `"btn-danger"`, `"btn-primary"`, `"btn-secondary"`, `"input"`, `"required"`, `"select"` entries

## Verification

```
Build: PASSED (0 typecheck errors, 0 build errors)
AnnotationCategory defined once: src/shared/types.ts:44 (1 match)
buildParsedFieldsFromData defined once: src/shared/buildParsedFieldsFromData.ts:4 (1 match)
CategoryDropdown in SelectedTab: 2 matches (import + JSX)
CategoryDropdown in SchemaTab: 2 matches (import + JSX)
Dead CSS classes: 0 matches
Inline AnnotationCategory types: 0 matches
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/shared/types.ts` exists with `AnnotationCategory` interface
- [x] `src/shared/buildParsedFieldsFromData.ts` exists with `buildParsedFieldsFromData` export
- [x] `src/ui/components/CategoryDropdown.tsx` exists with `CategoryDropdown` export
- [x] `src/ui/styles/global.css` has no `.btn`, `.input`, `.select`, `.required` rules
- [x] Commit bba6464 exists (Task 1)
- [x] Commit cec569d exists (Task 2)

## Self-Check: PASSED
