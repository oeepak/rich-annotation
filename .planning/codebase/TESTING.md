# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)
- Additional matchers from `@testing-library/jest-dom` (configured in `tests/setup.ts`)

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch   # Watch mode
```

## Test File Organization

**Location:**
- Mirrored directory structure: `tests/` mirrors `src/`
- UI component tests in `tests/ui/`
- Utility/shared function tests in `tests/`

**Naming:**
- Pattern: `[ComponentName].test.tsx` for components
- Pattern: `[functionName].test.ts` for utilities
- Examples: `FieldInput.test.tsx`, `parseText.test.ts`, `buildText.test.ts`

**Structure:**
```
tests/
├── setup.ts                           # Vitest setup (imports jest-dom matchers)
├── buildText.test.ts                  # Utility function tests
├── parseText.test.ts
├── validateField.test.ts
└── ui/
    ├── smoke.test.tsx                 # Integration test
    ├── FieldInput.test.tsx            # Component tests
    ├── OverviewTab.test.tsx
    ├── OverviewRow.test.tsx
    ├── AnnotationPreview.test.tsx
    └── useSelection.test.tsx          # Hook tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";

describe("functionName or ComponentName", () => {
  it("describes specific behavior", () => {
    // Arrange
    const input = /* test data */;

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

**Patterns:**
- Each `describe` block groups tests for a single function or component
- Test names start with lowercase and describe expected behavior (e.g., "parses flat fields from new format")
- Setup uses local constants defined before describe block (e.g., `flatFields`, `withGroup` in `parseText.test.ts`)
- Inline test data rather than external fixtures

**Examples from codebase:**

Utility function test (`parseText.test.ts`):
```typescript
const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text" },
  { name: "Event Key", type: "text" },
];

describe("parseText", () => {
  it("parses flat fields from new format", () => {
    const text = "Event Type\n- Click\n\nEvent Key\n- click_banner";
    const result = parseText(text, flatFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[0]).toMatchObject({ name: "Event Type", rawValue: "Click", matched: true });
  });
});
```

Component test (`FieldInput.test.tsx`):
```typescript
describe("FieldInput — text field", () => {
  const textSchema: FieldSchema = { name: "Title", type: "text" };

  it("renders field label", () => {
    const { container } = render(
      <FieldInput schema={textSchema} value="" matched={true} onChange={() => {}} />
    );
    expect(container.querySelector(".field-label")!.textContent).toBe("Title");
  });
});
```

Hook test (`useSelection.test.tsx`):
```typescript
describe("useSelectionFields", () => {
  it("initializes from fieldData when provided", () => {
    const schemaFields: FieldSchema[] = [textField, numberField];
    const fieldData: FieldData = { Title: "Hello", Width: "42" };

    const { result } = renderHook(() =>
      useSelectionFields({ label: "", fieldData, schemaFields }),
    );

    expect(result.current.fieldValues).toEqual({ Title: "Hello", Width: "42" });
  });
});
```

## Mocking

**Framework:** Vitest native `vi` module

**Patterns:**

Mocking Figma plugin UI library (`FieldInput.test.tsx`):
```typescript
vi.mock("@create-figma-plugin/ui", () => ({
  Textbox: ({ value, onValueInput, ...rest }: any) =>
    h("input", { value, onInput: (e: any) => onValueInput?.(e.target.value), ...rest }),
  Dropdown: ({ value, onValueChange, options, ...rest }: any) =>
    h(
      "select",
      { value: value ?? "", onChange: (e: any) => onValueChange?.(e.target.value), ...rest },
      (options ?? []).map((o: any) => h("option", { key: o.value, value: o.value }, o.text)),
    ),
}));
```

**What to Mock:**
- External Figma plugin UI components (`@create-figma-plugin/ui`)
- Browser APIs if needed (DOM operations handled by jsdom environment)

**What NOT to Mock:**
- Internal utility functions (e.g., `buildText`, `parseText`, `validateField`) - test as-is
- Component logic - test real behavior with rendered output
- Preact/React rendering - use `@testing-library/preact` to test actual DOM

## Fixtures and Factories

**Test Data:**
Defined inline as constants before test suites:
```typescript
const textField: FieldSchema = { name: "Title", type: "text" };
const numberField: FieldSchema = { name: "Width", type: "number" };
const groupField: FieldSchema = {
  name: "Spacing",
  type: "group",
  children: [
    { name: "Top", type: "number" },
    { name: "Bottom", type: "number" },
  ],
};
```

**Location:**
- Defined at top of test file, before `describe` block
- Reused across multiple test cases in same file
- No factory functions; simple object creation

## Coverage

**Requirements:** No coverage target specified in `vitest.config.ts`

**View Coverage:**
```bash
# Not configured, would need to add coverage config to vitest.config.ts
```

## Test Types

**Unit Tests:**
- Utility functions: Test input/output for `parseText()`, `buildText()`, `validateField()`
- Scope: Single function with various inputs (happy path and edge cases)
- Approach: Direct function call, assertion on return value

**Component Tests:**
- Scope: Individual component rendering and user interaction
- Tools: `@testing-library/preact` for rendering
- Approach: Render component, query DOM, assert output changes

**Hook Tests:**
- Framework: `@testing-library/preact` with `renderHook` utility
- Scope: Hook state and side effects
- Approach: `renderHook()` to test hook in isolation, `act()` to trigger updates
```typescript
const { result } = renderHook(() =>
  useSelectionFields({ label: "", fieldData, schemaFields }),
);
act(() => {
  result.current.updateField("Title", "World");
});
expect(result.current.fieldValues.Title).toBe("World");
```

**Integration Tests:**
- Smoke test (`smoke.test.tsx`): Minimal test that component renders without crashing
```typescript
describe("smoke: @testing-library/preact renders cfp/ui components", () => {
  it("renders AnnotationPreview without crashing", () => {
    const { container } = render(<AnnotationPreview text="hello" />);
    expect(container.textContent).toContain("hello");
  });
});
```

**E2E Tests:**
- Not used; no Cypress, Playwright, or similar

## Common Patterns

**Async Testing:**
```typescript
// Using act() from @testing-library/preact for state updates
act(() => {
  result.current.updateField("Title", "World");
});
expect(result.current.fieldValues.Title).toBe("World");
```

**Error Testing:**
Validation errors tested through `matched` flag:
```typescript
it("validates group children types", () => {
  const text = "Event Type\n- Click\n\nParams\n- order: notanumber\n- id: abc";
  const result = parseText(text, withGroup);
  expect(result.parseMatch).toBe("not_matched");
  expect(result.fields[1].children![0].matched).toBe(false);
});
```

**DOM Assertion Patterns:**
```typescript
// Query by class
const error = container.querySelector(".field-error");
expect(error).not.toBeNull();
expect(error!.textContent).toBe("Type mismatch");

// Query all elements
const labels = container.querySelectorAll(".field-label");
const labelTexts = Array.from(labels).map((el) => el.textContent);
expect(labelTexts).toContain("Title");
```

**toMatchObject for partial matching:**
```typescript
expect(result.fields[0]).toMatchObject({
  name: "Event Type",
  rawValue: "Click",
  matched: true
});
```

## Test Environment

**Environment:** jsdom (configured in `vitest.config.ts`)
- Simulates browser DOM for component testing
- Allows `@testing-library/preact` to render components

**Setup Files:**
- `tests/setup.ts` - Imports `@testing-library/jest-dom/vitest` matchers
- No additional setup needed; single line file

**CSS Modules:**
- Configured: `css: { modules: { classNameStrategy: "non-scoped" } }`
- CSS not imported/tested; only DOM structure verified

---

*Testing analysis: 2026-03-13*
