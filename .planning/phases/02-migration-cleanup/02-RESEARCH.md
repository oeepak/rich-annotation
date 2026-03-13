# Phase 2: Migration + Cleanup - Research

**Researched:** 2026-03-13
**Domain:** @create-figma-plugin/ui component API, code deduplication, CSS cleanup
**Confidence:** HIGH

## Summary

Phase 2 replaces every raw HTML form element in the plugin UI with cfp-native components and eliminates code duplication across the codebase. The work splits cleanly into two tracks: (1) UI element swaps — `<button>`, `<input>`, `<select>`, `<textarea>` — in six component files, and (2) code cleanup — moving `AnnotationCategory` type (which does not yet exist in shared types), extracting `buildParsedFieldsFromData` from `src/plugin/code.ts` into a shared module, and extracting the category dropdown rendering pattern that is duplicated in `SelectedTab`, `SchemaTab`, and `OverviewTab`.

The cfp component API is already installed at v4.0.3 and the type signatures are available locally. `RawTextEditor.tsx` already uses `TextboxMultiline` correctly — it is the reference implementation. The key pattern for all cfp inputs is `value` + `onValueInput` (string callback) or `onValueChange` (typed callback), not the DOM `onChange` event pattern used by the raw elements being replaced.

**Primary recommendation:** Swap components file by file in dependency order (FieldInput → SchemaFieldRow → SelectedTab → SchemaTab → OverviewTab → SchemaCategory → OverviewRow), then do code cleanup as a separate wave, and remove dead CSS last.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UIMIG-01 | Button 컴포넌트를 cfp Button으로 교체 | cfp `Button` props: `secondary`, `danger`, `disabled`, `onClick`, `children`. Direct drop-in for `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` usage. |
| UIMIG-02 | Textbox/TextboxNumeric/TextboxMultiline을 cfp 컴포넌트로 교체 | `Textbox` uses `value`+`onValueInput`. `TextboxNumeric` uses `value`+`onValueInput` (string) or `onNumericValueInput` (number\|null). Already have a working example in RawTextEditor. |
| UIMIG-03 | Dropdown을 cfp Dropdown으로 교체 (null 초기값 처리 포함) | `Dropdown` accepts `value: null \| string` and `options: DropdownOptionValue[]`. Null value shows placeholder. Options are `{ value: string, text?: string }[]` objects, not `<option>` children. |
| UIMIG-04 | Checkbox를 cfp Checkbox로 교체 (boolean/string 변환 포함) | `Checkbox` accepts `value: boolean \| MIXED_BOOLEAN`. Boolean fields currently use a `<select>` with "true"/"false" strings — must convert string↔boolean at the boundary. |
| UIMIG-05 | Banner, Divider 등 보조 UI 컴포넌트를 cfp로 교체 | `Banner` requires `icon` + `children` + optional `variant` ("success"\|"warning"). `Divider` takes no props. Currently no Banner/Divider in use — these are additive if desired. |
| UIMIG-06 | cfp 컴포넌트 적용 후 불필요한 커스텀 CSS 제거 | After all swaps, remove `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.select` rules from `global.css` and their `.d.ts` entries. Layout/structural CSS (`.section`, `.toolbar`, `.row-card`, etc.) stays. |
| CODE-01 | 카테고리 드롭다운 중복 로직을 공통 컴포넌트로 추출 | Category dropdown pattern (same `Dropdown` + `{ id, label, color }[]` → `DropdownOptionValue[]` conversion) appears in `SelectedTab` and `SchemaTab`. Extract to `src/ui/components/CategoryDropdown.tsx`. |
| CODE-02 | buildParsedFieldsFromData를 shared 모듈로 추출 | `buildParsedFieldsFromData` exists only in `src/plugin/code.ts` (lines 113–141). `useSelection.ts` has equivalent inline logic. Move to `src/shared/buildParsedFieldsFromData.ts`, import in both. |
| CODE-03 | AnnotationCategory 타입을 shared/types.ts로 중앙화 | The `{ id: string; label: string; color: string }` shape is used in 5 places (App.tsx state, SelectedTab prop, SchemaTab prop, OverviewTab prop, plugin code.ts). Add `AnnotationCategory` type to `src/shared/types.ts`, update all 5 sites. |
| CODE-04 | schema.required 잔재 참조 제거 | Only CSS vestiges remain: `.field-label .required` rule in `global.css` and `"required"` entry in `global.css.d.ts`. No JSX references. Remove both. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @create-figma-plugin/ui | 4.0.3 | Figma-native UI components | Already installed; provides Figma design system components |
| preact | 10.29.0 | JSX runtime | Already in use; cfp is built on Preact |

### cfp Component API Reference (verified from installed types)

| Component | Key Props | Replaces |
|-----------|-----------|---------|
| `Button` | `children`, `secondary?`, `danger?`, `disabled?`, `onClick?` | `<button className="btn btn-*">` |
| `Textbox` | `value`, `onValueInput?`, `placeholder?` | `<input className="input" type="text">` |
| `TextboxNumeric` | `value`, `onValueInput?`, `integer?`, `minimum?`, `maximum?` | `<input className="input" type="number">` |
| `TextboxMultiline` | `value`, `onValueInput?`, `rows?`, `grow?` | `<textarea className="input">` |
| `Dropdown` | `value: null\|string`, `options: DropdownOptionValue[]`, `onValueChange?`, `placeholder?` | `<select className="select">` |
| `Checkbox` | `value: boolean\|MIXED_BOOLEAN`, `onValueChange?`, `children` | `<select>` boolean with "true"/"false" strings |
| `Banner` | `icon`, `children`, `variant?: "success"\|"warning"` | custom alert divs (additive) |
| `Divider` | (no props) | `<hr>` / border rules (additive) |

### No Additional Installation Needed

All required libraries are already installed. No `npm install` needed for this phase.

## Architecture Patterns

### Recommended Change Order

```
Wave A — Leaf components first (no children that use raw elements):
  src/ui/components/FieldInput.tsx        (select→Dropdown, input→Textbox/TextboxNumeric)
  src/ui/components/SchemaFieldRow.tsx    (input→Textbox, select→Dropdown, button→Button)
  src/ui/components/AnnotationPreview.tsx (no raw elements — skip)
  src/ui/components/OverviewRow.tsx       (button→Button)

Wave B — Container components (depend on leaf components being correct):
  src/ui/components/SelectedTab.tsx       (select→Dropdown, button→Button, CategoryDropdown extracted)
  src/ui/components/SchemaTab.tsx         (select→Dropdown, button→Button, CategoryDropdown extracted)
  src/ui/components/SchemaCategory.tsx    (button→Button)
  src/ui/components/OverviewTab.tsx       (select→Dropdown, input→Textbox, button→Button)

Wave C — Code cleanup (after all UI swaps):
  src/shared/buildParsedFieldsFromData.ts  (new file, extracted from code.ts)
  src/shared/types.ts                      (add AnnotationCategory type)
  src/plugin/code.ts                       (import shared, remove inline function)
  src/ui/hooks/useSelection.ts             (import shared, remove inline logic)
  src/ui/components/CategoryDropdown.tsx   (new file, extracted pattern)
  src/ui/components/SelectedTab.tsx        (use CategoryDropdown)
  src/ui/components/SchemaTab.tsx          (use CategoryDropdown)

Wave D — CSS cleanup:
  src/ui/styles/global.css                (remove .btn*, .input, .select rules)
  src/ui/styles/global.css.d.ts           (remove corresponding type entries)
```

### Pattern 1: cfp Button
**What:** Drop-in replacement mapping from className variants to props
**When to use:** Every `<button>` in the UI

```tsx
// Source: installed node_modules/@create-figma-plugin/ui/lib/components/button/button.d.ts
import { Button } from "@create-figma-plugin/ui";

// Before: <button className="btn btn-primary" onClick={handleApply}>Apply</button>
// After:
<Button onClick={handleApply}>Apply</Button>

// Before: <button className="btn btn-secondary" onClick={onBack}>Back</button>
// After:
<Button secondary onClick={onBack}>Back</Button>

// Before: <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
// After:
<Button danger onClick={handleDelete}>Delete</Button>

// disabled prop is a direct prop (no className needed):
<Button secondary onClick={handleReset} disabled={!dirty}>Reset</Button>
```

### Pattern 2: cfp Dropdown
**What:** Replaces `<select>` — uses options array, not children
**When to use:** Every `<select>` in the UI

```tsx
// Source: installed node_modules/@create-figma-plugin/ui/lib/components/dropdown/dropdown.d.ts
import { Dropdown } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";

// options must be DropdownOptionValue[] — objects, not JSX <option> elements
const options: DropdownOption[] = [
  { value: "draft", text: "draft" },
  { value: "ready", text: "ready" },
];

// value is null | string — null shows placeholder
<Dropdown
  value={selectedValue || null}
  options={options}
  onValueChange={(val) => setSelectedValue(val)}
  placeholder="— Select —"
/>

// For category dropdowns:
const categoryOptions: DropdownOption[] = categories.map((cat) => ({
  value: cat.id,
  text: cat.label,
}));
<Dropdown
  value={selectedCategoryId || null}
  options={categoryOptions}
  onValueChange={(val) => setSelectedCategoryId(val)}
  placeholder="— Select Category —"
/>
```

**Critical:** cfp `Dropdown` does NOT accept `<option>` children. The entire option list goes through the `options` prop as an array of `{ value, text? }` objects.

### Pattern 3: cfp Textbox / TextboxNumeric
**What:** Replaces `<input>` — uses `onValueInput` callback (not DOM `onChange`)
**When to use:** Text and number input fields

```tsx
// Source: installed types from node_modules
import { Textbox, TextboxNumeric } from "@create-figma-plugin/ui";

// text type
<Textbox
  value={value}
  onValueInput={(val) => onChange(val)}
  placeholder="field name"
/>

// number type — onValueInput receives a string; onNumericValueInput receives number|null
<TextboxNumeric
  value={value}
  onValueInput={(val) => onChange(val)}
/>
```

### Pattern 4: cfp Checkbox for boolean fields
**What:** Replaces `<select>` used for boolean fields — requires boolean↔string conversion
**When to use:** FieldInput when `schema.type === "boolean"`

```tsx
// Source: installed types
import { Checkbox } from "@create-figma-plugin/ui";

// Boolean fields store "true"/"false" strings in the value system.
// Checkbox.value is boolean, so convert at the boundary:
<Checkbox
  value={value === "true"}
  onValueChange={(val: boolean) => onChange(val ? "true" : "false")}
>
  {schema.name}
</Checkbox>
```

**Note:** `Checkbox` renders its `children` as the label — no separate label div needed.

### Pattern 5: CategoryDropdown extraction (CODE-01)
**What:** Single shared component for the category picker used in SelectedTab and SchemaTab
**When to use:** Any place that renders the category picker

```tsx
// New file: src/ui/components/CategoryDropdown.tsx
import { h } from "preact";
import { Dropdown } from "@create-figma-plugin/ui";
import type { DropdownOption } from "@create-figma-plugin/ui";
import type { AnnotationCategory } from "@shared/types";

interface CategoryDropdownProps {
  categories: AnnotationCategory[];
  value: string;
  onValueChange: (categoryId: string) => void;
  placeholder?: string;
}

export function CategoryDropdown({ categories, value, onValueChange, placeholder }: CategoryDropdownProps) {
  const options: DropdownOption[] = categories.map((cat) => ({
    value: cat.id,
    text: cat.label,
  }));
  return (
    <Dropdown
      value={value || null}
      options={options}
      onValueChange={onValueChange}
      placeholder={placeholder ?? "— Select Category —"}
    />
  );
}
```

### Pattern 6: buildParsedFieldsFromData extraction (CODE-02)
**What:** The function in `src/plugin/code.ts` (lines 113–141) is also needed in `useSelection.ts`
**Target file:** `src/shared/buildParsedFieldsFromData.ts`

The function signature to extract:
```ts
// Move to: src/shared/buildParsedFieldsFromData.ts
import type { FieldData, FieldSchema, ParsedField } from "./types";
import { validateField } from "./validateField";

export function buildParsedFieldsFromData(
  data: FieldData,
  schemaFields: FieldSchema[]
): ParsedField[] { ... }
```

`useSelection.ts` currently has equivalent inline logic (lines 74–91) that can be replaced with a call to this shared function.

### Pattern 7: AnnotationCategory type (CODE-03)
**What:** Add one type alias to `src/shared/types.ts`
**Five usage sites to update:**

| File | Current shape |
|------|--------------|
| `src/ui/App.tsx` line 27 | `{ id: string; label: string; color: string }[]` state |
| `src/ui/components/SelectedTab.tsx` line 16 | prop type |
| `src/ui/components/SchemaTab.tsx` line 9 | prop type |
| `src/ui/components/OverviewTab.tsx` line 11 | prop type |
| `src/plugin/code.ts` line 50 | `cachedCategories` variable type |

```ts
// Add to src/shared/types.ts:
export interface AnnotationCategory {
  id: string;
  label: string;
  color: string;
}
```

### Anti-Patterns to Avoid
- **Using `onChange` instead of `onValueInput`/`onValueChange`:** cfp Textbox and Dropdown use their own callback props, not raw DOM event handlers. Using `onChange` on a cfp component will not work as expected.
- **Passing `<option>` children to Dropdown:** Dropdown only accepts the `options` array prop.
- **Passing `""` as Dropdown value:** Use `null` (not empty string) to indicate "no selection" — that is what triggers the placeholder display.
- **Keeping old CSS classes as fallback:** After swapping to cfp Button, remove `className="btn btn-primary"` entirely. cfp applies its own styles via the design system CSS.
- **Forgetting to import cfp CSS:** The cfp design system CSS must be imported. Check how `main.tsx` imports it — it should already be there via `@create-figma-plugin/ui` build integration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Figma-style dropdown with keyboard nav | Custom `<select>` wrapper with CSS | `Dropdown` from cfp | cfp handles Figma-specific focus, keyboard, and Figma theme tokens |
| Figma-style text input | `<input>` + custom CSS `.input` class | `Textbox` / `TextboxNumeric` | cfp handles Figma theme variables automatically |
| Figma-style button | `<button>` + `.btn` CSS variants | `Button` with `secondary`/`danger` props | Consistent with Figma's plugin UI standard |

**Key insight:** cfp components automatically use Figma CSS custom properties (`--figma-color-*`), ensuring visual consistency in both light and dark mode without custom CSS.

## Common Pitfalls

### Pitfall 1: Dropdown value="" vs null
**What goes wrong:** Passing `""` (empty string) as the `value` prop causes Dropdown to select the first option or behave unexpectedly instead of showing the placeholder.
**Why it happens:** cfp Dropdown distinguishes `null` (no selection) from `""` (selected empty string option).
**How to avoid:** Convert: `value={selectedCategoryId || null}`. This converts the empty string state value to null for the Dropdown.
**Warning signs:** Placeholder never shows even when no category is selected.

### Pitfall 2: cfp Dropdown onValueChange vs onChange
**What goes wrong:** `onChange` fires a DOM `Event` object; `onValueChange` fires the string value directly.
**Why it happens:** All cfp components prefer `onValueChange` (or `onValueInput` for textboxes) — they fire the value, not the event.
**How to avoid:** Always use `onValueChange={(val) => setState(val)}` not `onChange={(e) => setState(e.target.value)}`.
**Warning signs:** TypeScript errors: "Property 'target' does not exist on type 'string'".

### Pitfall 3: Checkbox value must be boolean, not string
**What goes wrong:** The boolean field currently stores `"true"`/`"false"` strings. Passing a string to `Checkbox.value` violates the type contract and will render incorrectly.
**Why it happens:** Legacy design used `<select>` with string values for booleans.
**How to avoid:** Convert at the boundary: `value={value === "true"}` and in the callback `onChange(val ? "true" : "false")`.
**Warning signs:** TypeScript error: "Type 'string' is not assignable to type 'boolean | MIXED_BOOLEAN'".

### Pitfall 4: Banner requires an icon prop
**What goes wrong:** Rendering `<Banner>` without providing the `icon` prop causes a TypeScript error or runtime error.
**Why it happens:** cfp Banner `icon` is required.
**How to avoid:** Always provide an icon: `<Banner icon={<IconWarning16 />} variant="warning">message</Banner>`.

### Pitfall 5: cfp CSS import may need to be verified
**What goes wrong:** cfp components render with no styling (plain HTML appearance) if the design system CSS is not imported.
**Why it happens:** cfp components require their own CSS bundle to apply Figma design tokens.
**How to avoid:** Verify `main.tsx` or `styles/global.css` imports `@create-figma-plugin/ui/css` (check build output). The cfp build tool (`build-figma-plugin`) handles this automatically for the plugin build, but it's worth verifying.

### Pitfall 6: schema.required CSS class — only in CSS, not JSX
**What goes wrong:** Searching for `schema.required` in JSX finds nothing; the only reference is `.field-label .required` in `global.css` and the `"required"` entry in `global.css.d.ts`.
**Why it happens:** Was removed from JSX in Phase 1 (`schema.required removed from data layer`) but CSS was not cleaned up.
**How to avoid:** CODE-04 is purely a CSS cleanup — remove the `.field-label .required` rule and its type declaration entry. No JSX changes needed.

## Code Examples

### Full FieldInput swap (text field — before/after)
```tsx
// BEFORE (src/ui/components/FieldInput.tsx)
<input
  className={`input${errorClass}`}
  type="text"
  value={value}
  onChange={(e) => onChange((e.target as HTMLInputElement).value)}
/>

// AFTER — Source: installed cfp types
import { Textbox } from "@create-figma-plugin/ui";
<Textbox
  value={value}
  onValueInput={(val) => onChange(val)}
/>
// Error state: cfp Textbox does not have an "error" variant prop.
// Keep a separate error message div below the field if needed.
```

**Note on error styling:** cfp `Textbox` has no `error` prop or `variant="error"`. The current `.input.error` CSS approach (red border) will not apply to cfp Textbox. After migration, error indication should be done via a text message below the field (e.g., a small `<div className="field-error">` with error text) rather than border color. The test file `FieldInput.test.tsx` already expects `.field-error` elements with text like "Type mismatch" and "Not a valid option" — this is the intended post-migration pattern.

### Full FieldInput swap (number field)
```tsx
// AFTER
import { TextboxNumeric } from "@create-figma-plugin/ui";
<TextboxNumeric
  value={value}
  onValueInput={(val) => onChange(val)}
/>
```

### Full FieldInput swap (select field)
```tsx
// AFTER
import { Dropdown } from "@create-figma-plugin/ui";
const options = [
  { value: "" },   // empty option
  ...(schema.options ?? []).map((opt) => ({ value: opt, text: opt })),
];
<Dropdown
  value={value || null}
  options={options}
  onValueChange={(val) => onChange(val)}
  placeholder="—"
/>
```

### Full FieldInput swap (boolean field)
```tsx
// AFTER
import { Checkbox } from "@create-figma-plugin/ui";
<Checkbox
  value={value === "true"}
  onValueChange={(val: boolean) => onChange(val ? "true" : "false")}
>
  {schema.name}
</Checkbox>
// Note: Checkbox renders its label as children — no separate field-label div needed.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React imports | Preact + cfp emit/on | Phase 1 (2026-03-13) | Build now works |
| Raw DOM event handlers | cfp callback props (onValueInput, onValueChange) | Phase 2 (this phase) | Figma-native feel |
| Custom CSS for inputs/buttons | cfp design system CSS tokens | Phase 2 (this phase) | Automatic dark/light mode |

**Deprecated/outdated after this phase:**
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` CSS classes
- `.input` CSS class
- `.select` CSS class
- `.field-label .required` CSS rule (was never used in JSX after Phase 1)

## Open Questions

1. **cfp CSS import verification**
   - What we know: `build-figma-plugin` handles CSS bundling automatically
   - What's unclear: Whether the cfp design system CSS is already loaded in the plugin iframe
   - Recommendation: After first Button swap, visually verify the button looks Figma-native. If it renders unstyled, locate where cfp CSS is imported and confirm it's present.

2. **Error indication for cfp Textbox (no error prop)**
   - What we know: cfp `Textbox` has no `error` or `variant` prop for red-border states
   - What's unclear: Whether to keep a border-based error class on the cfp wrapper div or switch fully to text-based error messages
   - Recommendation: The existing test file `FieldInput.test.tsx` already expects `.field-error` text nodes ("Type mismatch", "Not a valid option") — implement as a `<div class="field-error">` text node below the input. This is the right pattern and aligns with existing test expectations.

3. **Color badge next to category Dropdown (noted in STATE.md)**
   - What we know: cfp Dropdown cannot carry color data inside its options; STATE.md notes "color badge must be rendered as a separate element"
   - What's unclear: Exact placement/styling of color dot adjacent to the cfp Dropdown
   - Recommendation: Render a small colored circle `<span>` with inline style next to the `CategoryDropdown` component. The `categories` prop already carries the `color` string; use `COLOR_MAP` from `OverviewRow.tsx` as the color lookup reference.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UIMIG-01 | Button renders with correct variant, calls onClick | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial — FieldInput.test.tsx has cfp mock pattern |
| UIMIG-02 | Textbox/TextboxNumeric render and fire onValueInput | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial — FieldInput test covers text/number |
| UIMIG-03 | Dropdown renders with options array, null value shows placeholder | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial — FieldInput test covers select field |
| UIMIG-04 | Checkbox converts boolean↔string correctly | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial — boolean field test exists |
| UIMIG-05 | Banner/Divider render without crash | unit (smoke) | `npm run test -- tests/ui/smoke.test.tsx` | ❌ Wave 0 |
| UIMIG-06 | No .btn/.input/.select CSS classes remain in component output | manual (grep verify) | `grep -r "className.*btn\|className.*input\|className.*select" src/ui/` | manual only |
| CODE-01 | CategoryDropdown renders correct options | unit (component) | `npm run test` | ❌ Wave 0 |
| CODE-02 | buildParsedFieldsFromData produces correct ParsedField[] | unit | `npm run test` | ❌ Wave 0 |
| CODE-03 | AnnotationCategory type is importable from @shared/types | unit (type check) | `npm run build` (tsc --noEmit) | ❌ Wave 0 (type-only) |
| CODE-04 | No .required CSS class references | manual (grep verify) | `grep -n "required" src/ui/styles/global.css` | manual only |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run build && npm run test`
- **Phase gate:** `npm run build` green + `npm run test` green before proceeding to Phase 3

### Wave 0 Gaps
- [ ] `tests/ui/CategoryDropdown.test.tsx` — covers CODE-01
- [ ] `tests/shared/buildParsedFieldsFromData.test.ts` — covers CODE-02
- [ ] No framework changes needed — vitest already configured

*(Existing test infrastructure: vitest + @testing-library/preact + jsdom already in place. All existing tests in `tests/ui/` provide cfp mock patterns reusable for new test files.)*

## Sources

### Primary (HIGH confidence)
- Installed package: `node_modules/@create-figma-plugin/ui/lib/index.d.ts` — complete component export list
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/button/button.d.ts` — Button props
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/dropdown/dropdown.d.ts` — Dropdown props
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/textbox/textbox/private/raw-textbox.d.ts` — Textbox props
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/textbox/textbox-numeric/private/raw-textbox-numeric.d.ts` — TextboxNumeric props
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/checkbox/checkbox.d.ts` — Checkbox props
- Installed package: `node_modules/@create-figma-plugin/ui/lib/components/banner/banner.d.ts` — Banner props
- Direct source reading: all 9 component files in `src/ui/components/` + `src/ui/hooks/useSelection.ts` + `src/plugin/code.ts` (lines 1–200) + `src/shared/types.ts`

### Secondary (MEDIUM confidence)
- `src/ui/components/RawTextEditor.tsx` — working reference implementation of cfp TextboxMultiline
- `tests/ui/FieldInput.test.tsx` — establishes cfp mock pattern and post-migration test expectations

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all component type signatures read directly from installed package
- Architecture: HIGH — all source files read directly; change order derived from actual import graph
- Pitfalls: HIGH — derived from direct inspection of type signatures and existing code patterns

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (cfp 4.x is stable; 90 days is reasonable)
