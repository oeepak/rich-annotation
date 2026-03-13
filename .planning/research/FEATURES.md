# Feature Research: @create-figma-plugin Migration

**Domain:** Figma Plugin — cfp/preact migration of annotation management tool
**Researched:** 2026-03-13
**Confidence:** HIGH (verified directly from installed node_modules type definitions at v4.0.3)

---

## What cfp Provides vs What We Build

This file is structured around the migration question: what can we replace with cfp built-ins, and what do we custom-build?

---

## Table Stakes: cfp-Provided (Use, Don't Reinvent)

### UI Components — @create-figma-plugin/ui v4.0.3

All components are Preact functional components. They produce Figma-native styling automatically. Requires `render()` from `@create-figma-plugin/ui` as the entry point (already done in `src/ui/main.tsx`).

| Component | Replace Current | Props Summary | Notes |
|-----------|----------------|---------------|-------|
| `Button` | `<button className="btn btn-primary/secondary/danger">` | `secondary`, `danger`, `disabled`, `loading`, `fullWidth`, `onClick` | Covers all three button variants in use |
| `Dropdown` | `<select className="select">` in SelectedTab, SchemaTab | `options: DropdownOption[]`, `value: null\|string`, `onValueChange` | Used for category selection; options typed as `{ value: string, text?: string }` |
| `Textbox` | `<input className="input" type="text">` | `value`, `onValueInput`, `placeholder`, `icon?` | Used in FieldInput for text type fields |
| `TextboxNumeric` | `<input className="input" type="number">` | `value`, `onValueInput`, `validateOnBlur?` | Used in FieldInput for number type fields |
| `TextboxMultiline` | `<textarea>` in RawTextEditor | `value`, `onValueInput`, `rows`, `grow`, `validateOnBlur?` | Raw text editor uses textarea |
| `SearchTextbox` | `<input className="input" placeholder="Search...">` in OverviewTab | `value`, `onValueInput`, `clearOnEscapeKeyDown` | Drop-in for search bar |
| `Checkbox` | `<select>` for boolean fields (current workaround) | `value: boolean \| MIXED_BOOLEAN`, `onValueChange`, `children` | Better replacement for boolean field input |
| `Disclosure` | None (new pattern for group fields) | `open: boolean`, `title: string`, `children`, `onClick` | Collapsible group sections in SchemaCategory/FieldInput |
| `Banner` | Inline `<div style={{ color: '#d93025' }}>` warning | `icon`, `variant: 'success'\|'warning'`, `children` | Parse mismatch warnings in SelectedTab |
| `Divider` | `<hr>` or border styling | None | Section separators |
| `Text` | Inline `<div style={{ fontSize, color }}>` | `alignment`, standard text props | All small helper text blocks |
| `SegmentedControl` | None (new) | `options: { value, children? }[]`, `onValueChange` | Could replace Raw/Fields toggle button pair |

**Components not applicable to this plugin:**
`Layer`, `Modal`, `RangeSlider`, `RadioButtons`, `Toggle`, `FileUpload*`, `IconButton`, `IconToggleButton`, `Tabs`, `SelectableItem`, `LoadingIndicator` — none of these map to current UI patterns.

### UI Hooks — @create-figma-plugin/ui

| Hook | Purpose | How We Use It |
|------|---------|---------------|
| `useForm` | Manages form state, validation, submit/close lifecycle | Could replace manual `dirty` state + `handleSave`/`handleReset` in SchemaTab |
| `useWindowResize` | Lets user drag-resize the plugin window | Optional UX improvement; not current feature |
| `useInitialFocus` | Sets initial keyboard focus target | Accessibility; set focus on first field when annotation loads |
| `useFocusTrap` | Traps focus within a region | Not currently needed |
| `useWindowKeyDown` | Global key handler | Could add Cmd+S shortcut for save |

### Icons — @create-figma-plugin/ui

150+ Figma-native SVG icons at 16px and 24px. Available as individual named exports (e.g., `IconPlus16`, `IconClose16`, `IconCheck16`, `IconWarning16`, `IconChevronDown16`). Currently all buttons are text-only; icons can replace or supplement button labels where space is tight.

### Messaging — @create-figma-plugin/utilities v4.0.3

The plugin code (`src/plugin/code.ts`) **already uses cfp utilities**. The UI layer does not yet.

| Utility | Status | Usage |
|---------|--------|-------|
| `emit<Handler>(name, data)` | Already used in plugin code | Send messages from plugin thread to UI |
| `on<Handler>(name, handler)` | Already used in plugin code | Receive messages in plugin thread |
| `once<Handler>(name, handler)` | Not yet used | One-shot message (not needed currently) |
| `showUI(options)` | Already used in plugin code | `showUI({ width: 360, height: 560 })` |
| `EventHandler` | Used in `src/shared/messages.ts` | Base type for all message handler interfaces |

**UI side gap:** The UI currently uses a custom `usePluginMessage` hook and `postToPlugin` function (from a file that is currently missing — see `src/ui/hooks/usePluginMessage.ts` as missing). These should be rebuilt using cfp's `emit`/`on` pattern instead of raw `parent.postMessage`.

### Storage — @create-figma-plugin/utilities

| Utility | Purpose | Current Approach |
|---------|---------|-----------------|
| `loadSettingsAsync(defaults, key?)` | Load plugin-level settings from Figma storage | We use `figma.root.getPluginData(SCHEMA_KEY)` directly |
| `saveSettingsAsync(settings, key?)` | Persist plugin-level settings | We use `figma.root.setPluginData(SCHEMA_KEY, ...)` directly |

**Decision:** Keep current approach (`figma.root.getPluginData/setPluginData`) for schema storage because:
1. We also store per-node `fieldData` on individual nodes via `node.setPluginData()` — cfp settings storage is document-level only
2. Current implementation is already working and well-understood
3. cfp settings uses the same Figma pluginData API under the hood

### Node Utilities — @create-figma-plugin/utilities

| Utility | Purpose | Use In Migration |
|---------|---------|-----------------|
| `traverseNode(node, callback)` | Walk node tree with callback | Could replace manual `walk()` function in `getAnnotationsForPage()` |
| `traverseNodeAsync(node, callback)` | Async variant | Not needed for current read-only traversal |
| `getSceneNodeById(id)` | Sync node lookup | Current code uses async `figma.getNodeByIdAsync()` — keep async |
| `getSelectedNodesOrAllNodes()` | Get selection or all nodes | Not applicable (we need per-node annotation access) |

**Decision:** `traverseNode` from cfp is a valid replacement for the manual `walk()` function but it's a refactor with no functional benefit. Defer.

---

## Custom-Build Required (Not Provided by cfp)

These features have no cfp equivalent and must remain as custom implementations.

| Feature | Why Custom | Location |
|---------|-----------|----------|
| Schema-based text building (`buildText`) | Domain-specific annotation format serialization | `src/shared/buildText.ts` — keep as-is |
| Annotation text parsing (`parseText`) | Domain-specific format deserialization | `src/shared/parseText.ts` — keep as-is |
| Field validation (`validateField`) | Domain-specific type checking for annotation fields | `src/shared/validateField.ts` — keep as-is |
| `FieldInput` / `GroupFieldInput` components | Schema-driven form rendering with group nesting | `src/ui/components/FieldInput.tsx` — refactor to use cfp inputs inside |
| `AnnotationPreview` component | Real-time annotation text preview | `src/ui/components/AnnotationPreview.tsx` — no cfp equivalent |
| `SchemaCategory` / `SchemaFieldRow` components | Dynamic schema editor UI | `src/ui/components/Schema*.tsx` — refactor to use cfp inputs inside |
| `OverviewRow` component | Compact annotation list row with category color | `src/ui/components/OverviewRow.tsx` — no cfp equivalent |
| JSON/CSV export logic | Blob download via browser APIs | In `OverviewTab` — keep as-is |
| `useSelectionFields` hook | Manages field values, previews, and validation state | `src/ui/hooks/useSelection.ts` — keep as-is |
| `usePluginMessage` / `postToPlugin` | UI-side message wiring | Currently missing; must rebuild using cfp `on`/`emit` |
| Category color rendering | Figma annotation category colors as UI badges | No cfp component — custom CSS dots/badges |
| Parse match status badges | "matched" / "not matched" / "no schema" indicators | Banner component covers warnings; status text is custom |

---

## Feature Dependencies

```
cfp render() entry point
    └──requires──> Preact JSX (already configured: jsxImportSource: "preact")
                       └──enables──> All cfp UI components

cfp emit/on (utilities)
    └──requires──> EventHandler interface (already in src/shared/messages.ts)
    └──enables──> usePluginMessage hook (must rebuild)
                      └──enables──> All UI components that postToPlugin

Dropdown (cfp)
    └──requires──> options typed as DropdownOption[] (DropdownOptionValue: { value, text? })
    └──replaces──> <select> in SelectedTab, SchemaTab, OverviewTab (3 locations)

Checkbox (cfp)
    └──replaces──> boolean field <select> workaround in FieldInput
    └──requires──> FieldInput refactor

Button (cfp)
    └──replaces──> custom .btn classes in all components
    └──requires──> removing styles.css .btn rules

TextboxNumeric (cfp)
    └──replaces──> <input type="number"> in FieldInput
    └──note──> value is string, not number (matches current pattern)

SchemaTab dirty state
    └──optionally replaced by──> useForm hook
    └──requires──> mapping form state to SchemaStore shape
```

### Dependency Notes

- **cfp render() is the root dependency:** Everything in the UI requires `render()` from `@create-figma-plugin/ui` to be the default export of `main.tsx`. This is already done.
- **Missing usePluginMessage blocks all UI:** The `usePluginMessage` hook and `postToPlugin` function are imported by every UI component. Rebuilding this is the first-priority unblock.
- **Dropdown requires data reshaping:** Current category lists are `{ id, label, color }[]`. cfp Dropdown expects `{ value: string, text?: string }[]`. The `id` maps to `value`, `label` to `text`. The `color` field cannot be rendered in cfp Dropdown options.
- **Checkbox replaces boolean select:** Current boolean fields use `<select>` with "true"/"false" options. Checkbox is more idiomatic but changes the value type (boolean vs string). Need wrapper in FieldInput.

---

## MVP Definition for Migration Milestone

### Phase 1: Unblock Build (Must-Have First)

- [ ] Rebuild `usePluginMessage` + `postToPlugin` using cfp `on`/`emit` — unblocks all UI compilation
- [ ] Fix all React import references to Preact — resolves current broken build state
- [ ] Verify `render()` entry point works end-to-end

### Phase 2: Component Migration (High Value, Moderate Effort)

- [ ] Replace all `<button className="btn ...">` with cfp `Button` — all tabs affected
- [ ] Replace text field `<input>` with cfp `Textbox` — FieldInput
- [ ] Replace number field `<input>` with cfp `TextboxNumeric` — FieldInput
- [ ] Replace `<select>` for category selection with cfp `Dropdown` — SelectedTab, SchemaTab
- [ ] Replace `<input placeholder="Search">` with cfp `SearchTextbox` — OverviewTab
- [ ] Replace `<textarea>` with cfp `TextboxMultiline` — RawTextEditor
- [ ] Replace boolean `<select>` with cfp `Checkbox` — FieldInput
- [ ] Replace inline warning `<div>` with cfp `Banner` — SelectedTab parse mismatch warning

### Phase 3: Polish (Lower Priority)

- [ ] Add cfp `Disclosure` for group field collapsing in FieldInput/SchemaFieldRow
- [ ] Replace `<select>` filter in OverviewTab with cfp `Dropdown`
- [ ] Add cfp icons to buttons (IconPlus16 for add field, IconClose16 for delete, IconWarning16 for banner)
- [ ] Consider `useForm` for SchemaTab dirty-state management

### Defer (Out of Scope for Migration)

- [ ] `useWindowResize` — not a current feature, adds complexity
- [ ] `SegmentedControl` for Raw/Fields toggle — current two-button approach works
- [ ] `traverseNode` utility replacement of manual walk() — no functional benefit

---

## Feature Prioritization Matrix

| Feature | Migration Value | Implementation Cost | Priority |
|---------|----------------|---------------------|----------|
| Rebuild usePluginMessage with cfp emit/on | CRITICAL — build is broken | LOW — ~30 lines | P1 |
| Fix React → Preact imports | CRITICAL — build is broken | LOW — mechanical | P1 |
| Button component swap | HIGH — removes custom CSS | LOW — find/replace | P1 |
| Textbox component swap | HIGH — removes custom CSS | LOW — prop mapping | P1 |
| TextboxNumeric swap | HIGH — removes custom CSS | LOW — prop mapping | P1 |
| Dropdown for category select | HIGH — Figma-native look | MEDIUM — data reshaping | P1 |
| SearchTextbox swap | MEDIUM | LOW | P2 |
| TextboxMultiline for raw editor | MEDIUM | LOW | P2 |
| Checkbox for boolean fields | MEDIUM — more idiomatic | MEDIUM — value type change | P2 |
| Banner for warnings | LOW — cosmetic | LOW | P3 |
| Disclosure for groups | LOW — cosmetic | MEDIUM | P3 |
| cfp icons | LOW | LOW | P3 |
| useForm in SchemaTab | LOW — works now | MEDIUM — refactor | P3 |

---

## Key Constraints Discovered

1. **cfp Dropdown cannot render colored options.** The `DropdownOptionValue` type has `{ value, text?, disabled? }` — no color field. Category color badges must remain custom (separate color dot element next to the Dropdown).

2. **cfp Checkbox value is `boolean`, not `string`.** Current FieldInput stores and emits string "true"/"false" for validation compatibility with `validateField`. A wrapper must convert `boolean → string` on `onValueChange` and `string → boolean` for the `value` prop.

3. **cfp Dropdown `value` is `null | string`, not `string`.** When no category is selected, pass `null` (not empty string `""`). Requires adjusting initial state in SelectedTab and SchemaTab from `""` to `null`.

4. **cfp render() injects base CSS automatically.** The `render()` function imports `!../css/base.css` (Figma design tokens). This means the existing `styles.css` that defines `.btn`, `.select`, `.input` etc. will coexist. After component migration, orphaned custom CSS rules should be removed to avoid conflicts.

5. **`usePluginMessage` is a missing file.** `src/ui/App.tsx` imports from `./hooks/usePluginMessage` which does not exist in the current broken state. This is the primary build blocker. The rebuilt version should use cfp `on`/`emit` in the UI context (using `parent.postMessage` is how cfp's emit works in UI context — but cfp abstracts this cleanly).

---

## Sources

- `node_modules/@create-figma-plugin/ui/lib/index.d.ts` — complete component exports (v4.0.3, verified locally)
- `node_modules/@create-figma-plugin/utilities/lib/index.d.ts` — complete utility exports (v4.0.3, verified locally)
- `node_modules/@create-figma-plugin/ui/lib/utilities/render.d.ts` — render function signature
- `node_modules/@create-figma-plugin/ui/lib/css/theme.css` — Figma design token CSS variables
- Individual component `.d.ts` files for Button, Dropdown, Textbox, TextboxNumeric, TextboxMultiline, SearchTextbox, Checkbox, Banner, Disclosure, SegmentedControl, useForm
- `src/plugin/code.ts` — confirms emit/on already in use on plugin side
- `src/ui/App.tsx`, `src/ui/main.tsx`, `src/ui/components/*.tsx` — current UI patterns being replaced
- `src/shared/messages.ts`, `src/shared/types.ts` — message protocol and data shapes

---

*Feature research for: @create-figma-plugin migration*
*Researched: 2026-03-13*
