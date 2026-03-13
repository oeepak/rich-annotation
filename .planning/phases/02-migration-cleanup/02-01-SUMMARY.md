---
phase: 02-migration-cleanup
plan: "01"
subsystem: ui
tags: [preact, create-figma-plugin, Textbox, TextboxNumeric, Dropdown, Checkbox, Button]

# Dependency graph
requires:
  - phase: 01-build-recovery
    provides: Preact-based build system with cfp emit/on messaging, green build baseline
provides:
  - FieldInput uses cfp Textbox/TextboxNumeric/Dropdown/Checkbox for all field types
  - SchemaFieldRow/FieldOptionsEditor use cfp Textbox/Dropdown/Button
  - OverviewRow uses cfp Button for edit action
  - SchemaCategory uses cfp Button for add field
  - Zero raw <input>, <select>, <button> elements in all 4 leaf component files
affects: [03-css-cleanup, future-wave-B-container-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cfp Dropdown: value=null|string, options=[{value, text?}], onValueChange callback (not DOM onChange)"
    - "cfp Textbox: onValueInput callback receives string directly (not DOM event)"
    - "cfp Checkbox: value=boolean, onValueChange=(val: boolean)=>void; converts to/from string boundary"
    - "cfp Button: secondary/danger props replace className='btn btn-secondary/btn-danger'"
    - "Error display: separate <div className='field-error'> below input, not className concat on cfp component"

key-files:
  created: []
  modified:
    - src/ui/components/FieldInput.tsx
    - src/ui/components/SchemaFieldRow.tsx
    - src/ui/components/OverviewRow.tsx
    - src/ui/components/SchemaCategory.tsx

key-decisions:
  - "cfp Textbox/TextboxNumeric have no error variant — use a separate field-error div below input for error indication"
  - "boolean fields use Checkbox (not Dropdown) with boolean<->string conversion at boundary: value===true -> onChange('true')"
  - "Wrap Textbox in a <div style={{ flex: N }}> when flex sizing is needed (cfp Textbox does not accept style prop)"
  - "Dropdown value must be null (not empty string) to show placeholder; convert with value || null"

patterns-established:
  - "cfp callback pattern: onValueInput/onValueChange fire the value directly, not a DOM Event object"
  - "cfp component import: named imports from @create-figma-plugin/ui, type imports for DropdownOption"

requirements-completed: [UIMIG-01, UIMIG-02, UIMIG-03, UIMIG-04]

# Metrics
duration: 2min
completed: 2026-03-13
---

# Phase 2 Plan 01: Leaf Component cfp Migration Summary

**Replaced all raw HTML form elements in 4 leaf components with cfp Textbox, TextboxNumeric, Dropdown, Checkbox, and Button — build green with zero raw input/select/button remaining.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-13T09:44:36Z
- **Completed:** 2026-03-13T09:46:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- FieldInput: all 4 field types (text, number, select, boolean) use cfp components with correct callback patterns
- SchemaFieldRow and FieldOptionsEditor: all raw form elements replaced with cfp Textbox, Dropdown, and Button
- OverviewRow and SchemaCategory: raw `<button>` elements replaced with cfp Button with correct variant props
- Error indication pattern established: `.field-error` div below input (aligns with existing test expectations in FieldInput.test.tsx)

## Task Commits

Each task was committed atomically:

1. **Task 1: Swap FieldInput.tsx to cfp components** - `71d8834` (feat)
2. **Task 2: Swap SchemaFieldRow, OverviewRow, SchemaCategory to cfp components** - `7815dfc` (feat)

## Files Created/Modified

- `src/ui/components/FieldInput.tsx` - Textbox/TextboxNumeric for text/number, Dropdown for select, Checkbox for boolean; field-error div for error display
- `src/ui/components/SchemaFieldRow.tsx` - Textbox for field name, Dropdown for type selector, Button danger for delete; FieldOptionsEditor group children use same patterns
- `src/ui/components/OverviewRow.tsx` - Button secondary for Edit action
- `src/ui/components/SchemaCategory.tsx` - Button secondary for + Add action

## Decisions Made

- cfp Textbox has no error/variant prop — error indication moved to a `<div className="field-error">` text node below the input. This matches the existing test expectations in FieldInput.test.tsx which already query for `.field-error`.
- boolean fields: use Checkbox (not Dropdown with true/false options), with string↔boolean conversion at the component boundary.
- When flex sizing is needed on Textbox, wrap in `<div style={{ flex: N }}>` since cfp Textbox does not forward style prop.
- Dropdown `value` must be `null` (not `""`) to display the placeholder. Converted with `value || null`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 leaf components are fully cfp-native; container components (SelectedTab, SchemaTab, OverviewTab) still use raw HTML elements
- Wave B container component migration (02-02) can proceed immediately
- CSS classes `.btn`, `.btn-secondary`, `.btn-danger`, `.input`, `.select` are no longer referenced in these 4 files but remain in global.css — cleanup deferred to Wave D (CSS cleanup plan)

---
*Phase: 02-migration-cleanup*
*Completed: 2026-03-13*
