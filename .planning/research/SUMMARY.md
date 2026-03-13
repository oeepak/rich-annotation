# Project Research Summary

**Project:** Rich Annotation — Figma Plugin cfp/Preact Migration
**Domain:** Figma Plugin Development — @create-figma-plugin v4 migration (React to Preact)
**Researched:** 2026-03-13
**Confidence:** HIGH

## Executive Summary

The Rich Annotation Figma plugin is in a broken intermediate state after a partial React-to-Preact migration (commit 5fd2686). The plugin uses @create-figma-plugin (cfp) v4, which mandates Preact as the UI rendering layer with a specific set of conventions: a `jsxFactory: 'h'` classic JSX transform, explicit per-file `h` imports, cfp-managed build tooling (esbuild under the hood), and a type-safe `emit`/`on` messaging protocol. The plugin code (`src/plugin/code.ts`) and entry point (`src/ui/main.tsx`) are already correctly implemented. The breakage is localized to `src/ui/App.tsx` importing from `"react"`, a missing `usePluginMessage.ts` hook, and stale message type references that no longer exist.

The recommended approach is a focused Phase 1 to restore the build to a green state before anything else. This means: replacing `react` imports with `preact/hooks` equivalents in all UI components, recreating `usePluginMessage.ts` using cfp's `on`/`emit` (not raw `postMessage`), removing the obsolete `PluginMessage` union type references, and eliminating `schema.required` ghost references. Once the build passes, a Phase 2 can replace native HTML form elements (`input`, `select`, `button`, `textarea`) with cfp UI library components for Figma-native appearance. A Phase 3 adds polish (icons, collapsibles, form state management).

The primary risk is the temptation to migrate components incrementally while leaving the build broken. Research confirms the last clean commit was `9d22d57`. The correct recovery strategy is to restore that foundation first, then migrate component-by-component, committing only when the build is green after each step. Every pitfall identified in this research traces back to the same root cause: two messaging systems and two import conventions coexisting in the same codebase.

## Key Findings

### Recommended Stack

The project already has all required packages installed. No new dependencies are needed. The core build tool is `@create-figma-plugin/build` v4.0.3, which uses a bundled esbuild and hardcodes `jsxFactory: 'h'`. This means the current `tsconfig.json` setting of `"jsx": "react-jsx"` / `"jsxImportSource": "preact"` is wrong for cfp — the correct configuration is `"jsx": "react"` with `"jsxFactory": "h"`. Every `.tsx` file must explicitly `import { h } from 'preact'` (or from `'preact/hooks'` for hooks). The `react` package is not installed and must not be imported directly in UI code.

**Core technologies:**
- `@create-figma-plugin/build` v4.0.3: build system — do not replace with Vite or raw tsc
- `@create-figma-plugin/ui` v4.0.3: Figma-native Preact component library + `render()` entry point
- `@create-figma-plugin/utilities` v4.0.3: type-safe `emit`/`on` messaging, `showUI`
- `preact` v10.29.0: UI rendering — must be a `dependencies` entry, not `devDependencies`
- `typescript` v5.9.3: type checking runs before every build via `--typecheck` flag

### Expected Features

The migration is not adding new user-facing features. It is a technical migration that replaces React-era implementation patterns with cfp-native equivalents, improving visual consistency with the Figma editor and eliminating custom CSS overhead.

**Must have (table stakes — blocks the build without these):**
- Restored `usePluginMessage.ts` using cfp `on`/`emit` — primary build blocker
- All `import from "react"` replaced with `preact/hooks` equivalents in UI files
- Unified message schema: cfp `EventHandler` interfaces only, no `PluginMessage` union
- `schema.required` references removed from `FieldInput.tsx`

**Should have (component migration — high visual value, low risk):**
- `Button` replacing custom `.btn` CSS classes across all tabs
- `Textbox` / `TextboxNumeric` replacing `<input>` elements in `FieldInput`
- `Dropdown` replacing `<select>` for category selection (note: no color in options — color badge stays custom)
- `SearchTextbox` replacing search `<input>` in OverviewTab
- `TextboxMultiline` replacing `<textarea>` in RawTextEditor
- `Checkbox` replacing boolean `<select>` workaround in FieldInput
- `Banner` replacing inline warning `<div>` in SelectedTab

**Defer (v2+, out of scope for migration):**
- `useWindowResize` — not a current feature
- `SegmentedControl` for Raw/Fields toggle — current button pair works
- `traverseNode` utility to replace manual `walk()` — no functional benefit
- `useForm` for SchemaTab dirty-state — current approach works

### Architecture Approach

The plugin follows the standard two-thread Figma plugin architecture: a sandboxed main thread (`src/plugin/code.ts`) with exclusive Figma API access, and an iframe UI thread (`src/ui/main.tsx`) with a Preact component tree. These communicate exclusively via cfp's typed `emit`/`on` messaging bridge. Shared business logic (schema parsing, annotation text building, field validation) lives in `src/shared/` with zero dependencies and is imported by both threads. UI state is local Preact state; persistent state is Figma `pluginData`; all writes to Figma go through the plugin thread via message.

**Major components:**
1. `src/plugin/code.ts` — Figma API, schema persistence, annotation management; already fully cfp-compliant
2. `src/ui/main.tsx` — cfp UI entry point (`export default render(Plugin)`); already correct
3. `src/ui/App.tsx` — global state, view routing, message handling; primary fix target
4. `src/ui/hooks/usePluginMessage.ts` — MISSING; must be created with cfp `on`/`emit`
5. `src/ui/components/` — tab views and form components; need React import sweep
6. `src/shared/` — domain types, message contracts, pure business logic; already correct

### Critical Pitfalls

1. **Mixing raw postMessage with cfp emit/on** — The UI hook must use `on<Handler>` from `@create-figma-plugin/utilities`, not `window.addEventListener("message", ...)`. The two protocols use different message envelope formats; messages are silently lost when mismatched. Prevention: never import or call raw postMessage APIs anywhere in `src/ui/`.

2. **React imports after JSX pragma set to Preact** — IDE auto-import suggests `from "react"` when typing `useState`. Every accepted suggestion re-introduces a missing module import that breaks the build. Prevention: after migration, run `grep -r 'from "react"' src/ui/` as part of every commit check.

3. **Two incompatible message schema formats** — `App.tsx` expects a discriminated union (`PluginMessage`/`UIMessage` with `switch(msg.type)`), but `code.ts` already emits cfp-structured `EventHandler` events. The `PluginMessage` type no longer exists in `messages.ts`. Prevention: keep only cfp `EventHandler` interfaces in `messages.ts`; rewrite `App.tsx` to use individual `on<Handler>` subscriptions.

4. **Partial migration commits leaving build broken** — Committing incomplete work creates a broken foundation where no change can be validated. Prevention: restore the missing `usePluginMessage.ts` and fix schema format first (load-bearing foundations), then migrate each component one at a time with a green build before committing.

5. **cfp Dropdown cannot render colored options** — `DropdownOptionValue` has no color field. Category color badges must remain as a custom element (color dot rendered separately from the `Dropdown`). Also: `Dropdown` value is `null | string`, not `string` — initial state must be `null`, not `""`.

## Implications for Roadmap

Based on research, the migration has a clear three-phase dependency structure:

### Phase 1: Restore Build Integrity

**Rationale:** The build has been broken since commit 5fd2686. Nothing can be validated — no manual testing, no component tests — until the build is green. All Phase 2 work depends on a working foundation. This phase addresses every critical pitfall simultaneously.
**Delivers:** A compiling, runnable plugin that behaves identically to the pre-WIP state (commit 9d22d57), but fully using cfp patterns.
**Addresses:** Rebuild `usePluginMessage.ts` with cfp `on`/`emit`; fix all `from "react"` imports in `src/ui/`; remove `PluginMessage` union type; remove `schema.required` references; verify `tsconfig.json` JSX configuration.
**Avoids:** Pitfalls 1 (messaging mismatch), 2 (React imports), 3 (schema format divergence), 4 (broken build policy), 5 (schema.required ghost references).

### Phase 2: Component Migration to cfp UI Library

**Rationale:** With a green build, component-by-component replacement of native HTML elements with cfp UI library components is safe and independently testable. Each swap is mechanical and low-risk. Components with correct cfp inputs improve Figma-native visual consistency and eliminate the custom CSS `.btn`, `.select`, `.input` rules.
**Delivers:** All interactive form elements (buttons, textboxes, dropdowns, checkboxes) rendered with Figma-native styling via cfp components.
**Uses:** `Button`, `Textbox`, `TextboxNumeric`, `TextboxMultiline`, `Dropdown`, `SearchTextbox`, `Checkbox`, `Banner` from `@create-figma-plugin/ui`.
**Implements:** FieldInput, SelectedTab, SchemaTab, OverviewTab, RawTextEditor component updates.
**Note on Dropdown:** Category `{ id, label, color }[]` must be reshaped to `{ value: string, text: string }[]` for cfp Dropdown. Color badge rendered as a separate element. Initial state must be `null` not `""`.
**Note on Checkbox:** Value type is `boolean`, not `string` — needs wrapper to convert to/from `validateField` string format.

### Phase 3: Polish and Hardening

**Rationale:** After core migration is complete, lower-priority improvements can be made safely. These address UX polish, edge cases, and security gaps identified in research.
**Delivers:** `Disclosure` collapsibles for group fields, cfp icons on buttons, category refresh reliability, plugin data validation, and centralized annotation data key helper.
**Addresses:** `cachedCategories` refresh on `UI_READY`, `validateFieldData` guard before deserializing `pluginData` JSON, centralized `annotationDataKey()` helper to prevent key format drift, color badge consistency in `OverviewRow`.

### Phase Ordering Rationale

- Phase 1 must be first because the build is currently broken and no other work can be validated without it. The missing `usePluginMessage.ts` is imported by `App.tsx` which is the root of the UI tree — it blocks compilation of everything.
- Phase 2 can only start after Phase 1 because component tests require a compiling codebase. Each component swap in Phase 2 is independently testable once the build is green.
- Phase 3 is decoupled from Phase 2 and could partially overlap, but is lower priority. The hardening items (data validation, key centralization) are independent of the component migration.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1:** All fixes are precisely identified from forensic analysis of the broken commit. No unknowns remain. Implementation is mechanical.
- **Phase 2:** cfp component APIs are fully verified from installed `node_modules` type definitions at v4.0.3. Component swap patterns are documented in STACK.md and FEATURES.md.
- **Phase 3:** Each item is either a performance optimization with known solution or a security hardening with a clear implementation pattern.

No phases require a `research-phase` step — all research has been resolved from local source verification.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against installed `node_modules` source code and official cfp template files |
| Features | HIGH | All cfp component APIs verified from v4.0.3 type definitions in `node_modules/@create-figma-plugin/ui/lib/index.d.ts` |
| Architecture | HIGH | Verified against `src/plugin/code.ts` (already cfp-correct), `src/ui/main.tsx` (already cfp-correct), and cfp official docs |
| Pitfalls | HIGH | Derived from direct forensic analysis of broken commit 5fd2686 vs clean commit 9d22d57; not speculative |

**Overall confidence:** HIGH

### Gaps to Address

- **tsconfig.json JSX configuration conflict:** Research identifies a conflict between `"jsxImportSource": "preact"` (current tsconfig) and cfp's esbuild `jsxFactory: 'h'`. The STACK.md recommends changing to `"jsx": "react"` + `"jsxFactory": "h"`. The current tsconfig setting may work for tests (vitest uses jsdom, not esbuild) but conflicts with cfp build. Needs empirical verification during Phase 1 — try changing tsconfig and confirm both `npm run build` and `npm run test` pass.

- **Category color badge rendering approach:** cfp `Dropdown` options cannot carry color data. The exact implementation of "color dot next to Dropdown" has not been prototyped. The approach is clear conceptually but the exact JSX structure and CSS needs to be determined during Phase 2 implementation.

- **Checkbox boolean/string conversion:** `validateField` and `buildText` accept string values for boolean fields ("true"/"false"). cfp `Checkbox` emits `boolean`. The wrapper conversion is simple but needs a specific implementation decision in `FieldInput.tsx` — confirm the conversion does not break `parseText` round-trips.

## Sources

### Primary (HIGH confidence)
- `node_modules/@create-figma-plugin/build/lib/utilities/build-bundles-async/build-bundles-async.js` — confirmed `jsxFactory: 'h'` esbuild config
- `node_modules/@create-figma-plugin/ui/lib/index.d.ts` — complete component exports at v4.0.3
- `node_modules/@create-figma-plugin/utilities/lib/index.d.ts` — complete utility exports at v4.0.3
- Official cfp template `preact-rectangles/src/ui.tsx` and `tsconfig.json` — import patterns
- `src/plugin/code.ts` — confirmed correct cfp `emit`/`on` usage (direct evidence)
- `src/shared/messages.ts` — confirmed correct `EventHandler` interfaces (direct evidence)
- `git show 9d22d57` vs `git show 5fd2686` — forensic diff identifying exact breakage

### Secondary (MEDIUM confidence)
- [Create Figma Plugin official docs](https://yuanqing.github.io/create-figma-plugin/) — render(), emit/on, configuration (sparse documentation, but consistent with node_modules source)

### Tertiary (LOW confidence)
- None — all findings were verified at the source level.

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
