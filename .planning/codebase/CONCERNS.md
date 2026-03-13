# Codebase Concerns

**Analysis Date:** 2026-03-13

## Build Failure - Critical

**Incomplete Preact Migration:**
- Issue: UI components reverted to React imports while migration to Preact/cfp was underway. Build fails with 40+ TypeScript errors.
- Files affected: `src/ui/App.tsx`, `src/ui/components/AnnotationPreview.tsx`, `src/ui/components/FieldInput.tsx`, `src/ui/components/OverviewRow.tsx`, `src/ui/components/OverviewTab.tsx`, `src/ui/components/SchemaCategory.tsx`, `src/ui/components/SchemaTab.tsx`, `src/ui/components/SelectedTab.tsx`, `src/ui/components/SchemaFieldRow.tsx`
- Impact: Build completely broken. Plugin cannot be tested or deployed. No compilation possible.
- Trigger: Commit 5fd2686 is marked "WIP: partial cfp/preact migration - broken state"
- Root cause: UI components accidentally reverted to pre-migration React code instead of migrated Preact/cfp code
- Fix approach:
  1. Revert UI components to the Preact + cfp pattern that was working in commit 9d22d57
  2. Ensure all imports use `preact/hooks` not `react`
  3. Recreate missing `src/ui/hooks/usePluginMessage.ts` (last working version stored in git history at 9d22d57)
  4. Change all JSX imports to use `h` from preact (or add proper pragma)
  5. Re-test build after each component is updated

## Missing Module/File

**Missing Hook Implementation:**
- Issue: `src/ui/hooks/usePluginMessage.ts` imported by multiple components but file doesn't exist in current state
- Files affected: `src/ui/App.tsx`, `src/ui/components/OverviewRow.tsx`, `src/ui/components/OverviewTab.tsx`, `src/ui/components/SchemaTab.tsx`, `src/ui/components/SelectedTab.tsx`
- Impact: Cannot compile. TypeScript error TS2307 on all imports of this module.
- Last working version: Git commit 9d22d57 contains working implementation (95 lines, exports `postToPlugin` function and `usePluginMessage` hook)
- Workaround: None - requires file to be restored
- Fix approach: Restore from git history or rebuild using Preact+cfp pattern (using `preact/hooks` instead of React hooks)

## Type Definition Mismatches

**Missing PluginMessage Type Export:**
- Issue: `src/shared/messages.ts` doesn't export `PluginMessage` type but `src/ui/App.tsx` imports it
- Files: `src/shared/messages.ts`, `src/ui/App.tsx` (line 6)
- Impact: TypeScript error TS2305 - blocks compilation
- Cause: Messages file likely incomplete after partial migration
- Fix: Define and export `PluginMessage` type in `src/shared/messages.ts` as union of all plugin→UI message handlers

**Invalid Schema Field Property:**
- Issue: `FieldInput.tsx` references `schema.required` property (lines 26, 47, 67, 84) but `FieldSchema` type in `src/shared/types.ts` doesn't have this property
- Files: `src/ui/components/FieldInput.tsx`, `src/shared/types.ts`
- Impact: TypeScript errors TS2339 - 4 occurrences. Code attempts to show asterisk for required fields that don't exist
- History: Recent refactor (commit 9d22d57) "remove required field" indicates this was intentionally removed
- Fix: Remove all `schema.required` checks from `FieldInput.tsx` or re-add property to schema type if required field validation is needed

**Event Target Type Errors:**
- Issue: Multiple onChange handlers don't properly type-cast event targets
- Files: `src/ui/components/FieldInput.tsx` (lines 31, 52, 73), `src/ui/components/OverviewTab.tsx` (lines 145, 162)
- Impact: TypeScript errors TS18047, TS2339 (6 total) - blocks compilation
- Pattern: `onChange={(e) => onChange(e.target.value)}` without proper typing
- Fix: Cast `e.target` as `HTMLInputElement | HTMLSelectElement` or use type-safe event handling from cfp/preact

## Code Duplication - Category Dropdown

**Duplicate Category Dropdown Logic:**
- Issue: Category dropdown selection logic duplicated in two places
- Files: `src/ui/components/SelectedTab.tsx` (lines 92-109), `src/ui/components/SchemaTab.tsx` (lines 69-82)
- Impact: Inconsistent styling or behavior changes require updates in both places. Maintenance burden.
- Current pattern: Both build dropdown from `categories` array with "Select Category" placeholder
- Fix approach: Extract to shared component `<CategorySelect />` in `src/ui/components/CategorySelect.tsx`
- Priority: Medium - doesn't block functionality but creates maintenance debt

## Code Duplication - Parsed Field Building

**Duplicate Field Parsing Logic:**
- Issue: `buildParsedFieldsFromData` function duplicated between two modules
- Files: `src/plugin/code.ts` (lines 113-141), `src/ui/hooks/useSelection.ts` (implied by similar structure)
- Impact: Field parsing changes must be synced in two places. Risk of divergence.
- Cause: Both plugin and UI need to reconstruct ParsedField arrays from field data
- Fix approach: Extract `buildParsedFieldsFromData` to `src/shared/parsedFields.ts` and import in both locations
- Priority: Medium - high maintenance risk for core logic

## Fragile Areas

**Annotation Data Storage - Plugin Data Keys:**
- Files: `src/plugin/code.ts` (lines 24-27, 75, 253, 270)
- Why fragile: Magic string key pattern `rich-annotation-data:${categoryId}` used in four places. If key format changes, data is lost.
- Safe modification: Centralize key generation with `annotationDataKey()` helper (already exists on line 25-27, but should be exported to shared module)
- Current mitigation: Helper function exists but only used in plugin
- Risk: UI cannot access or validate stored data. Deserialization happens blindly without recovery for bad keys.

**Category Label Resolution:**
- Files: `src/plugin/code.ts` (lines 54-58), `src/ui/components/OverviewTab.tsx` (line 150), `src/ui/components/SchemaTab.tsx` (line 50)
- Why fragile: Three different ways to resolve category label (from schema, from cached categories, fallback to ID). Inconsistent behavior.
- Safe modification: Centralize label resolution in shared utility `getCategoryLabel(catId, schemas, categories)`
- Current state: Plugin has `getCategoryLabel` (lines 54-58) but UI components reimplement logic

**Modal/Dropdown Value Validation:**
- Files: Multiple select dropdowns in SelectedTab, SchemaTab, OverviewTab
- Why fragile: Selects store value that might not be in available options if categories/schemas change. Memory notes document "Dropdown crashing - defense added: value validity check added to all Dropdowns" but this is a patch, not root cause fix
- Risk: UI can show invalid selected state if data is refreshed while modal is open

## Missing Test Coverage

**Plugin Code (code.ts) Not Tested:**
- Files: `src/plugin/code.ts` (296 lines)
- What's not tested: Message handlers, annotation building logic, schema loading/saving, field data storage/retrieval
- Test files: None exist for plugin code
- Risk: Schema persistence, annotation parsing, field validation changes can break plugin without detection
- Priority: High - core business logic with side effects on user data

**UI Component Integration:**
- Files: `src/ui/App.tsx` (106 lines) - main orchestrator
- What's not tested: Message flow between components, view switching (auto/schema), selection changes triggering data refresh
- Current coverage: Individual component tests exist (`OverviewTab.test.tsx`, `FieldInput.test.tsx`, etc.) but no integration tests
- Risk: Navigation bugs, state inconsistency, message handler ordering issues can slip through
- Priority: High - affects user experience

## Performance Concerns

**Page Annotation Traversal:**
- Files: `src/plugin/code.ts` (lines 143-167, `getAnnotationsForPage()`)
- Problem: Linear walk through entire page tree to find all annotations. No caching. O(n) where n = all nodes on page
- Trigger: Called on every view switch to Overview tab, on selection change
- Cause: Figma API doesn't provide quick annotation query
- Improvement path: Cache results with invalidation on annotation changes, or use annotation event listeners if available
- Current impact: Acceptable for small pages (~100 nodes), becomes slow for large designs (1000+ nodes)

**Category Caching - Unbounded:**
- Files: `src/plugin/code.ts` (line 45, `cachedCategories`)
- Problem: `cachedCategories` global variable cached once and never refreshed
- Risk: If user adds categories in Figma while plugin is open, plugin won't see new categories
- Improvement: Add category refresh on UI_READY or periodic refresh (every 5 minutes)
- Trigger: User must reload plugin to see new categories

## Security Considerations

**Plugin Data Serialization - No Validation:**
- Risk: `fieldData` stored as JSON string in plugin data, deserialized without schema validation
- Files: `src/plugin/code.ts` (lines 78-80, parse without validation), `src/shared/validateField.ts` (validates individual fields but not structure)
- Current mitigation: None. Bad JSON crashes silently, undefined behavior with extra keys
- Recommendation: Add `validateFieldData(data: unknown, schema: FieldSchema[]): FieldData` function to validate structure before deserializing

**No Access Control:**
- Risk: All nodes can be annotated by any user with plugin access. No owner/edit permission checks.
- Scope: Figma permission model handles this, but plugin doesn't add additional safeguards
- Current state: Acceptable - relies on Figma file sharing permissions
- Recommendation: Document that anyone with edit access can modify all annotations

## Schema Type Extraction Debt

**Hardcoded Category Type Definition:**
- Issue: Category type `{ id: string; label: string; color: string }` defined inline in 5+ locations instead of centralized
- Files: `src/plugin/code.ts` (line 45), `src/ui/App.tsx` (line 14), `src/ui/components/SelectedTab.tsx` (line 15), `src/ui/components/SchemaTab.tsx`, `src/ui/components/OverviewTab.tsx`
- Impact: Type changes must be synced everywhere. Inconsistent naming (sometimes called `categories`, sometimes inferred type)
- Memory note documents: "인라인 카테고리 타입 `{ id: string; label: string; color: string }` → shared `AnnotationCategory` 타입 추출 (5곳)"
- Fix approach: Define `type AnnotationCategory = { id: string; label: string; color: string }` in `src/shared/types.ts` and import everywhere
- Priority: Low - doesn't affect functionality but improves maintainability

## Known Limitations

**No Nested Field Groups:**
- Files: `src/shared/types.ts` (line 7 comment: "only flat children (no nested groups)")
- Impact: Can't define schema groups that contain other groups. Limits schema expressiveness
- Current: By design decision. Flat groups keep parsing logic simple.
- If changing: Would require recursive ParsedField handling

**No Field Validation Rules:**
- Files: `src/shared/validateField.ts` (49 lines)
- What works: Type validation (number must be parseable as integer, boolean must match pattern)
- What's missing: Min/max ranges, regex patterns beyond boolean hint, custom validators
- Impact: Can't enforce "month field must be 1-12" or "SKU must match pattern"
- Priority: Low - covers 80% of use cases

## Unverified Behavior

**Badge Color Mapping - Unconfirmed Issue:**
- Files: Memory note references "뱃지 색상 이슈 원인 미확인 (COLOR_MAP lowercase 키 + toLowerCase 룩업은 적용됨)"
- Symptoms: Badge colors may not match annotation category colors
- Last attempt: Added `toLowerCase()` lookup with lowercase COLOR_MAP keys
- Status: Issue status unknown - needs verification after build is fixed
- Files involved: `src/ui/styles.ts` (CSS color mapping), `src/ui/components/OverviewRow.tsx` (badge rendering)

---

*Concerns audit: 2026-03-13*
