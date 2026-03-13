# Roadmap: Rich Annotation Plugin — cfp/Preact Migration

## Overview

The plugin is currently in a broken intermediate state after a partial React-to-Preact migration. Three phases restore it to a fully working, well-tested state: first fix the build so anything can be validated, then migrate all UI components to cfp-native equivalents while cleaning up code debt, then cover every module with tests to lock in correctness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Build Recovery** - Restore the broken build to a compiling, runnable state using cfp patterns (completed 2026-03-13)
- [ ] **Phase 2: Migration + Cleanup** - Replace all native HTML form elements with cfp UI components and remove code debt
- [ ] **Phase 3: Testing** - Cover shared logic, plugin handlers, and all UI components with unit and component tests

## Phase Details

### Phase 1: Build Recovery
**Goal**: The plugin compiles and runs correctly using cfp patterns, identical in behavior to pre-WIP commit 9d22d57
**Depends on**: Nothing (first phase)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes with zero errors or warnings
  2. Plugin loads in Figma and all three tabs (Selected, Overview, Schema) are accessible
  3. Annotating a node and reading it back works end-to-end via the cfp emit/on messaging path
  4. No `from "react"` imports remain anywhere in `src/ui/`
**Plans:** 2/2 plans complete
Plans:
- [ ] 01-01-PLAN.md — Fix tsconfig, create usePluginMessage hook, rewrite App.tsx with cfp messaging
- [ ] 01-02-PLAN.md — Fix React imports in all 8 components, cast e.target types, remove schema.required, fix test file, verify full build

### Phase 2: Migration + Cleanup
**Goal**: All interactive form elements render with Figma-native cfp components and code duplication is eliminated
**Depends on**: Phase 1
**Requirements**: UIMIG-01, UIMIG-02, UIMIG-03, UIMIG-04, UIMIG-05, UIMIG-06, CODE-01, CODE-02, CODE-03, CODE-04
**Success Criteria** (what must be TRUE):
  1. Every button, textbox, dropdown, and checkbox in the plugin uses a cfp UI component (no raw `<input>`, `<select>`, `<button>`, `<textarea>`)
  2. Custom CSS rules for `.btn`, `.select`, `.input` and equivalents no longer exist in the stylesheet
  3. `AnnotationCategory` is defined in exactly one place (`src/shared/types.ts`) with no inline duplicates
  4. Category dropdown logic and `buildParsedFieldsFromData` are each defined once and shared across plugin/UI
  5. `npm run build` remains green after all component swaps
**Plans**: TBD

### Phase 3: Testing
**Goal**: Every module — shared logic, plugin message handlers, and UI components — has unit and component test coverage
**Depends on**: Phase 2
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09
**Success Criteria** (what must be TRUE):
  1. `npm run test` passes with zero failures
  2. `buildText`, `parseText`, and `validateField` each have tests covering all field types and edge cases
  3. Plugin message handlers (APPLY_ANNOTATION, SAVE_SCHEMAS, and other major handlers) have tests asserting correct Figma API calls
  4. OverviewTab, SelectedTab, SchemaTab, FieldInput, and shared components each have rendering and interaction tests
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Build Recovery | 2/2 | Complete   | 2026-03-13 |
| 2. Migration + Cleanup | 0/? | Not started | - |
| 3. Testing | 0/? | Not started | - |
