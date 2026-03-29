# Nested Field & Display Format Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `group` field type with children support, switch display format to `Key\n- Value` with blank-line separators, and remove multiline textarea.

**Architecture:** `FieldSchema` gains `children?: FieldSchema[]` for `type: "group"`. `buildText` outputs the new readable format. `parseText` reads it back. `pluginData` stores field values as JSON (source of truth for parsing), while `label` is display-only. UI adds nested field editing in schema and field input.

**Tech Stack:** TypeScript, React, Vitest, Figma Plugin API

---

## File Structure

| File                                      | Action  | Responsibility                                                       |
| ----------------------------------------- | ------- | -------------------------------------------------------------------- |
| `src/shared/types.ts`                     | Modify  | Add `"group"` to FieldType, remove `multiline`, add `children`       |
| `src/shared/buildText.ts`                 | Modify  | New readable format output                                           |
| `src/shared/parseText.ts`                 | Modify  | Parse from JSON pluginData instead of label text                     |
| `src/shared/validateField.ts`             | Modify  | Handle `group` type validation                                       |
| `src/shared/messages.ts`                  | Modify  | `APPLY_ANNOTATION` carries `fieldData` JSON alongside display `text` |
| `src/plugin/code.ts`                      | Modify  | Store/read `fieldData` in node pluginData, use for parsing           |
| `src/ui/components/FieldInput.tsx`        | Modify  | Remove textarea, add group children inputs                           |
| `src/ui/components/SchemaFieldRow.tsx`    | Modify  | Remove multiline checkbox, add group children editor                 |
| `src/ui/components/SchemaCategory.tsx`    | Minor   | No structural change (delegates to SchemaFieldRow)                   |
| `src/ui/components/SelectedTab.tsx`       | Modify  | Pass fieldData in apply, adapt to new hook shape                     |
| `src/ui/components/AnnotationPreview.tsx` | Minor   | Works with new text format (no structural change)                    |
| `src/ui/hooks/useSelection.ts`            | Modify  | Handle group field values (dot-notation or nested keys)              |
| `tests/buildText.test.ts`                 | Rewrite | New format assertions                                                |
| `tests/parseText.test.ts`                 | Rewrite | JSON-based parsing assertions                                        |
| `tests/validateField.test.ts`             | Modify  | Add group type tests                                                 |

---

## Chunk 1: Shared Types & Build/Parse Logic

### Task 1: Update types.ts

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Update FieldType, FieldSchema, and add FieldData type**

```ts
export type FieldType = "text" | "number" | "boolean" | "select" | "group";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];    // for select type
  children?: FieldSchema[]; // for group type — only flat children (no nested groups)
}

// Structured field data for pluginData storage
export type FieldData = Record<string, string | Record<string, string>>;
// flat field: { "Event Type": "Click" }
// group field: { "Params": { "order": "number", "id": "uuid" } }
```

Remove `multiline?: boolean` from FieldSchema. Remove unused imports of `FieldValues` if replaced by `FieldData` — but keep `FieldValues` for now as the UI hook still uses it for flat input state.

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "refactor: add group FieldType, FieldData type, remove multiline"
```

---

### Task 2: Rewrite buildText for new format

**Files:**
- Modify: `src/shared/buildText.ts`
- Test: `tests/buildText.test.ts`

- [ ] **Step 1: Write failing tests for new format**

```ts
import { describe, it, expect } from "vitest";
import { buildText } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
];

const withGroup: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
  {
    name: "Params",
    type: "group",
    required: false,
    children: [
      { name: "order", type: "text", required: false },
      { name: "id", type: "text", required: false },
    ],
  },
];

describe("buildText", () => {
  it("builds flat fields with Key / - Value format", () => {
    const values = { "Event Type": "Click", "Event Key": "click_banner" };
    expect(buildText(flatFields, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner"
    );
  });

  it("omits empty optional fields", () => {
    const fields: FieldSchema[] = [
      { name: "Event Type", type: "text", required: true },
      { name: "Note", type: "text", required: false },
    ];
    const values = { "Event Type": "Click", Note: "" };
    expect(buildText(fields, values)).toBe("Event Type\n- Click");
  });

  it("keeps empty required fields", () => {
    const values = { "Event Type": "", "Event Key": "test" };
    expect(buildText(flatFields, values)).toBe(
      "Event Type\n- \n\nEvent Key\n- test"
    );
  });

  it("builds group fields with sub key: sub value", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "number", id: "uuid" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner\n\nParams\n- order: number\n- id: uuid"
    );
  });

  it("omits group when all children are empty and group is optional", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "", id: "" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner"
    );
  });

  it("includes group with partial children filled", () => {
    const values = {
      "Event Type": "Click",
      "Event Key": "click_banner",
      Params: { order: "1", id: "" },
    };
    expect(buildText(withGroup, values)).toBe(
      "Event Type\n- Click\n\nEvent Key\n- click_banner\n\nParams\n- order: 1"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/buildText.test.ts`
Expected: FAIL — current buildText uses old format

- [ ] **Step 3: Implement new buildText**

`src/shared/buildText.ts`:

```ts
import type { FieldSchema } from "./types";

type BuildValues = Record<string, string | Record<string, string>>;

export function buildText(
  fields: FieldSchema[],
  values: BuildValues
): string {
  const blocks: string[] = [];

  for (const field of fields) {
    if (field.type === "group") {
      const children = field.children ?? [];
      const groupValues = (values[field.name] ?? {}) as Record<string, string>;

      const childLines: string[] = [];
      for (const child of children) {
        const v = groupValues[child.name] ?? "";
        if (v === "" && !child.required) continue;
        childLines.push(`- ${child.name}: ${v}`);
      }

      if (childLines.length === 0 && !field.required) continue;
      blocks.push(`${field.name}\n${childLines.join("\n")}`);
    } else {
      const value = (values[field.name] ?? "") as string;
      if (value === "" && !field.required) continue;
      blocks.push(`${field.name}\n- ${value}`);
    }
  }

  return blocks.join("\n\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/buildText.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/buildText.ts tests/buildText.test.ts
git commit -m "feat: buildText outputs Key / - Value format with group support"
```

---

### Task 3: Rewrite parseText for new format

**Files:**
- Modify: `src/shared/parseText.ts`
- Test: `tests/parseText.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { parseText } from "../src/shared/parseText";
import type { FieldSchema } from "../src/shared/types";

const flatFields: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  { name: "Event Key", type: "text", required: true },
];

const withGroup: FieldSchema[] = [
  { name: "Event Type", type: "text", required: true },
  {
    name: "Params",
    type: "group",
    required: false,
    children: [
      { name: "order", type: "number", required: false },
      { name: "id", type: "text", required: false },
    ],
  },
];

describe("parseText", () => {
  it("parses flat fields from new format", () => {
    const text = "Event Type\n- Click\n\nEvent Key\n- click_banner";
    const result = parseText(text, flatFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[0]).toMatchObject({ name: "Event Type", rawValue: "Click", matched: true });
    expect(result.fields[1]).toMatchObject({ name: "Event Key", rawValue: "click_banner", matched: true });
  });

  it("parses group fields with sub key: sub value", () => {
    const text = "Event Type\n- Click\n\nParams\n- order: 42\n- id: abc";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[1]).toMatchObject({
      name: "Params",
      matched: true,
      children: [
        { name: "order", rawValue: "42", matched: true },
        { name: "id", rawValue: "abc", matched: true },
      ],
    });
  });

  it("returns not_matched for missing required field", () => {
    const text = "Event Key\n- test";
    const result = parseText(text, flatFields);
    expect(result.parseMatch).toBe("not_matched");
  });

  it("returns empty for missing optional group", () => {
    const text = "Event Type\n- Click";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields[1]).toMatchObject({ name: "Params", rawValue: "", matched: true });
  });

  it("handles value with colons in flat field", () => {
    const text = "Event Type\n- url:test:123\n\nEvent Key\n- key";
    const result = parseText(text, flatFields);
    expect(result.fields[0].rawValue).toBe("url:test:123");
  });

  it("validates group children types", () => {
    const text = "Event Type\n- Click\n\nParams\n- order: notanumber\n- id: abc";
    const result = parseText(text, withGroup);
    expect(result.parseMatch).toBe("not_matched");
    expect(result.fields[1].children![0].matched).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/parseText.test.ts`
Expected: FAIL

- [ ] **Step 3: Update ParsedField type and implement new parseText**

First update `src/shared/types.ts` — add `children` to `ParsedField`:

```ts
export interface ParsedField {
  name: string;
  rawValue: string;
  parsedValue: string | number | boolean | null;
  matched: boolean;
  children?: ParsedField[]; // for group type
}
```

Then rewrite `src/shared/parseText.ts`:

```ts
import type { FieldSchema, ParsedField, ParseMatch } from "./types";
import { validateField } from "./validateField";

export interface ParseResult {
  fields: ParsedField[];
  parseMatch: ParseMatch;
}

export function parseText(
  text: string,
  schemaFields: FieldSchema[]
): ParseResult {
  // Split text into blocks separated by blank lines
  const blocks = splitBlocks(text);

  // Map block header (field name) → block content lines
  const blockMap = new Map<string, string[]>();
  for (const block of blocks) {
    const lines = block.split("\n");
    const header = lines[0].trim();
    const bodyLines = lines.slice(1).filter((l) => l.startsWith("- "));
    blockMap.set(header, bodyLines);
  }

  let allMatched = true;
  const fields: ParsedField[] = schemaFields.map((schema) => {
    const bodyLines = blockMap.get(schema.name);

    if (!bodyLines || bodyLines.length === 0) {
      // Field not present in text
      if (schema.required) {
        allMatched = false;
        return { name: schema.name, rawValue: "", parsedValue: null, matched: false };
      }
      return { name: schema.name, rawValue: "", parsedValue: "", matched: true };
    }

    if (schema.type === "group") {
      // Parse children: each line is "- childKey: childValue"
      const children = schema.children ?? [];
      const childMap = new Map<string, string>();
      for (const line of bodyLines) {
        const content = line.slice(2); // remove "- "
        const colonIdx = content.indexOf(":");
        if (colonIdx === -1) continue;
        const key = content.slice(0, colonIdx).trim();
        const val = content.slice(colonIdx + 1).trim();
        childMap.set(key, val);
      }

      let groupMatched = true;
      const parsedChildren: ParsedField[] = children.map((child) => {
        const raw = childMap.get(child.name) ?? "";
        const { parsedValue, matched } = validateField(raw, child);
        if (!matched) groupMatched = false;
        return { name: child.name, rawValue: raw, parsedValue, matched };
      });

      if (!groupMatched) allMatched = false;

      return {
        name: schema.name,
        rawValue: bodyLines.map((l) => l.slice(2)).join("\n"),
        parsedValue: null,
        matched: groupMatched,
        children: parsedChildren,
      };
    }

    // Flat field: single "- value" line
    const rawValue = bodyLines[0]?.slice(2) ?? ""; // remove "- "
    const { parsedValue, matched } = validateField(rawValue, schema);
    if (!matched) allMatched = false;

    return { name: schema.name, rawValue, parsedValue, matched };
  });

  return { fields, parseMatch: allMatched ? "matched" : "not_matched" };
}

function splitBlocks(text: string): string[] {
  return text.split(/\n\n+/).filter((b) => b.trim() !== "");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/parseText.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/shared/parseText.ts tests/parseText.test.ts
git commit -m "feat: parseText supports new Key / - Value format with group children"
```

---

### Task 4: Update validateField for group type

**Files:**
- Modify: `src/shared/validateField.ts`
- Test: `tests/validateField.test.ts`

- [ ] **Step 1: Write failing test for group type**

Add to `tests/validateField.test.ts`:

```ts
it("returns matched for group type (group validation is handled by parseText)", () => {
  const schema: FieldSchema = {
    name: "Params",
    type: "group",
    required: false,
    children: [{ name: "order", type: "number", required: false }],
  };
  expect(validateField("order: 1", schema)).toEqual({ parsedValue: null, matched: true });
});

it("returns not matched for empty required group", () => {
  const schema: FieldSchema = {
    name: "Params",
    type: "group",
    required: true,
    children: [{ name: "order", type: "number", required: false }],
  };
  expect(validateField("", schema)).toEqual({ parsedValue: null, matched: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/validateField.test.ts`
Expected: FAIL — current default case returns `{ parsedValue: rawValue, matched: true }`, but for group we want `parsedValue: null`

- [ ] **Step 3: Add group case to validateField**

Add to the switch in `src/shared/validateField.ts`:

```ts
case "group": {
  // Group-level validation: just check required/empty
  // Child validation happens in parseText
  return { parsedValue: null, matched: true };
}
```

The existing empty+required check at the top of the function already handles the required case.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/validateField.ts tests/validateField.test.ts
git commit -m "feat: validateField handles group type"
```

---

## Chunk 2: Plugin Data Storage (pluginData as source of truth)

### Task 5: Update messages.ts

**Files:**
- Modify: `src/shared/messages.ts`

- [ ] **Step 1: Add fieldData to APPLY_ANNOTATION message**

In `src/shared/messages.ts`, update the `APPLY_ANNOTATION` variant:

```ts
| {
    type: "APPLY_ANNOTATION";
    nodeId: string;
    categoryId: string;
    text: string;           // display label (readable format)
    fieldData: FieldData;   // structured data for pluginData
  }
```

Add `FieldData` to the import from `./types`.

- [ ] **Step 2: Update AnnotationInfo to carry fieldData**

In `src/shared/types.ts`, update `AnnotationInfo`:

```ts
export interface AnnotationInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  categoryId: string | undefined;
  categoryLabel: string;
  label: string;
  fieldData?: FieldData;     // from pluginData (source of truth)
  parsedFields: ParsedField[];
  parseMatch: ParseMatch;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/messages.ts src/shared/types.ts
git commit -m "feat: add fieldData to APPLY_ANNOTATION and AnnotationInfo"
```

---

### Task 6: Update plugin code.ts for pluginData storage

**Files:**
- Modify: `src/plugin/code.ts`

- [ ] **Step 1: Store fieldData in node pluginData on APPLY_ANNOTATION**

In the `APPLY_ANNOTATION` handler, after setting `annotatable.annotations`:

```ts
case "APPLY_ANNOTATION": {
  const node = await figma.getNodeByIdAsync(msg.nodeId);
  if (!node || !("annotations" in node)) break;

  const existing = [...(node.annotations ?? [])];
  const idx = existing.findIndex((a) => a.categoryId === msg.categoryId);

  const newAnn = {
    label: msg.text,
    categoryId: msg.categoryId,
  };

  if (idx >= 0) {
    existing[idx] = newAnn;
  } else {
    existing.push(newAnn);
  }

  const annotatable = node as FrameNode;
  annotatable.annotations = existing;

  // Store structured field data in pluginData
  const dataKey = `rich-annotation-data:${msg.categoryId}`;
  annotatable.setPluginData(dataKey, JSON.stringify(msg.fieldData));

  figma.ui.postMessage({ type: "ANNOTATION_APPLIED" } satisfies PluginMessage);
  figma.ui.postMessage(getSelectionInfo());
  break;
}
```

- [ ] **Step 2: Read fieldData from pluginData when building AnnotationInfo**

Create a helper and update both `getAnnotationsForPage` and `getSelectionInfo`. Extract the shared annotation-building logic:

```ts
function buildAnnotationInfo(
  node: SceneNode,
  ann: { label?: string; categoryId?: string },
  schemas: SchemaStore
): AnnotationInfo {
  const catId = ann.categoryId ?? "";
  const label = ann.label ?? "";
  const schema = schemas[catId];

  let parsedFields: ParsedField[] = [];
  let parseMatch: ParseMatch = "no_schema";
  let fieldData: FieldData | undefined;

  // Try pluginData first (source of truth)
  const dataKey = `rich-annotation-data:${catId}`;
  const rawData = "getPluginData" in node ? (node as FrameNode).getPluginData(dataKey) : "";
  if (rawData) {
    try {
      fieldData = JSON.parse(rawData) as FieldData;
    } catch {}
  }

  if (schema) {
    if (fieldData) {
      // Validate fieldData against schema
      parsedFields = buildParsedFieldsFromData(fieldData, schema.fields);
    } else {
      // Fallback: parse from label text (legacy annotations)
      const result = parseText(label, schema.fields);
      parsedFields = result.fields;
    }
    parseMatch = parsedFields.every((f) => f.matched) ? "matched" : "not_matched";
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    categoryId: catId || undefined,
    categoryLabel: getCategoryLabel(catId, schemas),
    label,
    fieldData,
    parsedFields,
    parseMatch,
  };
}

function buildParsedFieldsFromData(
  data: FieldData,
  schemaFields: FieldSchema[]
): ParsedField[] {
  return schemaFields.map((schema) => {
    const raw = data[schema.name];

    if (schema.type === "group") {
      const groupData = (typeof raw === "object" ? raw : {}) as Record<string, string>;
      const children = (schema.children ?? []).map((child) => {
        const childRaw = groupData[child.name] ?? "";
        const { parsedValue, matched } = validateField(childRaw, child);
        return { name: child.name, rawValue: childRaw, parsedValue, matched };
      });
      const groupMatched = children.every((c) => c.matched);
      return {
        name: schema.name,
        rawValue: "",
        parsedValue: null,
        matched: groupMatched,
        children,
      };
    }

    const rawValue = (typeof raw === "string" ? raw : "") as string;
    const { parsedValue, matched } = validateField(rawValue, schema);
    return { name: schema.name, rawValue, parsedValue, matched };
  });
}
```

Then simplify `getAnnotationsForPage` and `getSelectionInfo` to use `buildAnnotationInfo`.

- [ ] **Step 3: Clean up DELETE_ANNOTATION to also remove pluginData**

```ts
case "DELETE_ANNOTATION": {
  const node = await figma.getNodeByIdAsync(msg.nodeId);
  if (!node || !("annotations" in node)) break;

  const filtered = (node.annotations ?? []).filter(
    (a) => a.categoryId !== msg.categoryId
  );
  const annotatable = node as FrameNode;
  annotatable.annotations = filtered;

  // Remove stored field data
  const dataKey = `rich-annotation-data:${msg.categoryId}`;
  annotatable.setPluginData(dataKey, "");

  figma.ui.postMessage({ type: "ANNOTATION_DELETED" } satisfies PluginMessage);
  figma.ui.postMessage(getSelectionInfo());
  break;
}
```

- [ ] **Step 4: Add imports at top of code.ts**

```ts
import type { FieldSchema, FieldData, ParsedField } from "@shared/types";
import { validateField } from "@shared/validateField";
```

- [ ] **Step 5: Commit**

```bash
git add src/plugin/code.ts
git commit -m "feat: store/read fieldData in pluginData, use as parsing source of truth"
```

---

## Chunk 3: UI Changes

### Task 7: Update useSelection hook for group fields

**Files:**
- Modify: `src/ui/hooks/useSelection.ts`

- [ ] **Step 1: Update hook to handle group field values**

The hook needs to:
1. Initialize from `fieldData` (if available from AnnotationInfo) instead of parsing label text
2. Handle group values as nested objects
3. Build both display text and fieldData for apply

```ts
import { useState, useEffect } from "react";
import type { FieldSchema, FieldValues, FieldData, ParsedField } from "@shared/types";
import { buildText } from "@shared/buildText";
import { parseText } from "@shared/parseText";
import { validateField } from "@shared/validateField";

interface UseSelectionFieldsOptions {
  label: string;
  fieldData?: FieldData;
  schemaFields: FieldSchema[];
}

type GroupValues = Record<string, string>;
type AllFieldValues = Record<string, string | GroupValues>;

export function useSelectionFields({ label, fieldData, schemaFields }: UseSelectionFieldsOptions) {
  const [fieldValues, setFieldValues] = useState<AllFieldValues>({});

  // Initialize field values from fieldData (preferred) or parsed label (fallback)
  useEffect(() => {
    if (schemaFields.length === 0) return;

    if (fieldData) {
      // Use structured data directly
      const values: AllFieldValues = {};
      for (const schema of schemaFields) {
        if (schema.type === "group") {
          const groupData = (typeof fieldData[schema.name] === "object"
            ? fieldData[schema.name]
            : {}) as GroupValues;
          values[schema.name] = { ...groupData };
        } else {
          values[schema.name] = (typeof fieldData[schema.name] === "string"
            ? fieldData[schema.name]
            : "") as string;
        }
      }
      setFieldValues(values);
    } else {
      // Fallback: parse from label text
      const result = parseText(label, schemaFields);
      const values: AllFieldValues = {};
      for (const f of result.fields) {
        if (f.children) {
          const group: GroupValues = {};
          for (const child of f.children) {
            group[child.name] = child.rawValue;
          }
          values[f.name] = group;
        } else {
          values[f.name] = f.rawValue;
        }
      }
      setFieldValues(values);
    }
  }, [label, fieldData, schemaFields]);

  const updateField = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const updateGroupField = (groupName: string, childName: string, value: string) => {
    setFieldValues((prev) => {
      const group = (typeof prev[groupName] === "object" ? prev[groupName] : {}) as GroupValues;
      return { ...prev, [groupName]: { ...group, [childName]: value } };
    });
  };

  const previewText = buildText(schemaFields, fieldValues);

  // Build fieldData for pluginData storage
  const currentFieldData: FieldData = {};
  for (const schema of schemaFields) {
    currentFieldData[schema.name] = fieldValues[schema.name] ?? (schema.type === "group" ? {} : "");
  }

  const parsedFields: ParsedField[] = schemaFields.map((s) => {
    if (s.type === "group") {
      const groupValues = (typeof fieldValues[s.name] === "object"
        ? fieldValues[s.name]
        : {}) as GroupValues;
      const children: ParsedField[] = (s.children ?? []).map((child) => {
        const raw = groupValues[child.name] ?? "";
        const { parsedValue, matched } = validateField(raw, child);
        return { name: child.name, rawValue: raw, parsedValue, matched };
      });
      const groupMatched = children.every((c) => c.matched);
      return { name: s.name, rawValue: "", parsedValue: null, matched: groupMatched, children };
    }

    const raw = (fieldValues[s.name] ?? "") as string;
    const { parsedValue, matched } = validateField(raw, s);
    return { name: s.name, rawValue: raw, parsedValue, matched };
  });

  const allMatched = parsedFields.every((f) => f.matched);

  return {
    fieldValues,
    updateField,
    updateGroupField,
    previewText,
    currentFieldData,
    parsedFields,
    allMatched,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/hooks/useSelection.ts
git commit -m "feat: useSelectionFields handles group fields and fieldData"
```

---

### Task 8: Update FieldInput for group type, remove textarea

**Files:**
- Modify: `src/ui/components/FieldInput.tsx`

- [ ] **Step 1: Rewrite FieldInput**

```tsx
import React from "react";
import type { FieldSchema } from "@shared/types";

interface FieldInputProps {
  schema: FieldSchema;
  value: string;
  matched: boolean;
  onChange: (value: string) => void;
}

interface GroupFieldInputProps {
  schema: FieldSchema;
  values: Record<string, string>;
  childMatches: Record<string, boolean>;
  onChildChange: (childName: string, value: string) => void;
}

export function FieldInput({ schema, value, matched, onChange }: FieldInputProps) {
  const errorClass = !matched && value !== "" ? " error" : "";

  if (schema.type === "select") {
    return (
      <div className="field-group">
        <div className="field-label">
          {schema.name}
          {schema.required && <span className="required"> *</span>}
        </div>
        <select
          className={`select${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {(schema.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="field-group">
        <div className="field-label">
          {schema.name}
          {schema.required && <span className="required"> *</span>}
        </div>
        <select
          className={`select${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    );
  }

  // text or number
  return (
    <div className="field-group">
      <div className="field-label">
        {schema.name}
        {schema.required && <span className="required"> *</span>}
      </div>
      <input
        className={`input${errorClass}`}
        type={schema.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function GroupFieldInput({ schema, values, childMatches, onChildChange }: GroupFieldInputProps) {
  return (
    <div className="field-group">
      <div className="field-label">
        {schema.name}
        {schema.required && <span className="required"> *</span>}
      </div>
      <div style={{ marginLeft: 12 }}>
        {(schema.children ?? []).map((child) => (
          <FieldInput
            key={child.name}
            schema={child}
            value={values[child.name] ?? ""}
            matched={childMatches[child.name] ?? true}
            onChange={(v) => onChildChange(child.name, v)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/components/FieldInput.tsx
git commit -m "feat: add GroupFieldInput, remove textarea/multiline support"
```

---

### Task 9: Update SelectedTab to use new hook and group inputs

**Files:**
- Modify: `src/ui/components/SelectedTab.tsx`

- [ ] **Step 1: Update SelectedTab**

Key changes:
1. Pass `fieldData` from annotation to hook
2. Use `updateGroupField` for group inputs
3. Send `fieldData` in APPLY_ANNOTATION
4. Render `GroupFieldInput` for group-type fields

In the hook call:

```tsx
const { fieldValues, updateField, updateGroupField, previewText, currentFieldData, parsedFields, allMatched } =
  useSelectionFields({
    label: currentLabel,
    fieldData: currentAnnotation?.fieldData,
    schemaFields: schema?.fields ?? [],
  });
```

In `handleApply`:

```tsx
const handleApply = () => {
  if (!nodeId || !selectedCategoryId) return;
  const text = rawMode ? rawText : previewText;
  postToPlugin({
    type: "APPLY_ANNOTATION",
    nodeId,
    categoryId: selectedCategoryId,
    text,
    fieldData: currentFieldData,
  });
  setRawMode(false);
};
```

In the field inputs section, replace the single `FieldInput` rendering with:

```tsx
{schema.fields.map((field) => {
  const parsed = parsedFields.find((p) => p.name === field.name);

  if (field.type === "group") {
    const groupValues = (typeof fieldValues[field.name] === "object"
      ? fieldValues[field.name]
      : {}) as Record<string, string>;
    const childMatches: Record<string, boolean> = {};
    for (const child of parsed?.children ?? []) {
      childMatches[child.name] = child.matched;
    }
    return (
      <GroupFieldInput
        key={field.name}
        schema={field}
        values={groupValues}
        childMatches={childMatches}
        onChildChange={(childName, v) => updateGroupField(field.name, childName, v)}
      />
    );
  }

  return (
    <FieldInput
      key={field.name}
      schema={field}
      value={(fieldValues[field.name] ?? "") as string}
      matched={parsed?.matched ?? true}
      onChange={(v) => updateField(field.name, v)}
    />
  );
})}
```

Add `GroupFieldInput` to the import from `./FieldInput`.

- [ ] **Step 2: Commit**

```bash
git add src/ui/components/SelectedTab.tsx
git commit -m "feat: SelectedTab renders group fields and sends fieldData"
```

---

### Task 10: Update SchemaFieldRow — remove multiline, add group children editor

**Files:**
- Modify: `src/ui/components/SchemaFieldRow.tsx`

- [ ] **Step 1: Rewrite SchemaFieldRow**

```tsx
import React from "react";
import type { FieldSchema, FieldType } from "@shared/types";

interface SchemaFieldRowProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
}

const fieldTypes: FieldType[] = ["text", "number", "boolean", "select", "group"];

export function SchemaFieldRow({ field, onChange, onDelete }: SchemaFieldRowProps) {
  return (
    <div className="schema-field-row">
      <input
        className="input"
        placeholder="field name"
        value={field.name}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
        style={{ flex: 2 }}
      />
      <select
        className="select"
        value={field.type}
        onChange={(e) => {
          const newType = e.target.value as FieldType;
          onChange({
            ...field,
            type: newType,
            options: newType === "select" ? field.options ?? [""] : undefined,
            children: newType === "group" ? field.children ?? [{ name: "", type: "text", required: false }] : undefined,
          });
        }}
        style={{ flex: 1 }}
      >
        {fieldTypes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
        req
      </label>
      <button className="btn btn-danger" onClick={onDelete} style={{ padding: "2px 6px" }}>
        ×
      </button>
    </div>
  );
}

interface FieldOptionsEditorProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
}

export function FieldOptionsEditor({ field, onChange }: FieldOptionsEditorProps) {
  if (field.type === "select") {
    return (
      <div style={{ marginLeft: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#999" }}>options: </span>
        <input
          className="input"
          value={(field.options ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...field,
              options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="A, B, C"
          style={{ width: "calc(100% - 60px)", display: "inline-block" }}
        />
      </div>
    );
  }

  if (field.type === "group") {
    const children = field.children ?? [];

    const addChild = () => {
      onChange({
        ...field,
        children: [...children, { name: "", type: "text", required: false }],
      });
    };

    const updateChild = (index: number, updated: FieldSchema) => {
      const newChildren = [...children];
      newChildren[index] = updated;
      onChange({ ...field, children: newChildren });
    };

    const deleteChild = (index: number) => {
      onChange({ ...field, children: children.filter((_, i) => i !== index) });
    };

    // Child types: no nested groups
    const childTypes: FieldType[] = ["text", "number", "boolean", "select"];

    return (
      <div style={{ marginLeft: 16, marginBottom: 4, borderLeft: "2px solid #e0e0e0", paddingLeft: 8 }}>
        <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>children:</div>
        {children.map((child, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                className="input"
                placeholder="child name"
                value={child.name}
                onChange={(e) => updateChild(i, { ...child, name: e.target.value })}
                style={{ flex: 2 }}
              />
              <select
                className="select"
                value={child.type}
                onChange={(e) => {
                  const t = e.target.value as FieldType;
                  updateChild(i, {
                    ...child,
                    type: t,
                    options: t === "select" ? child.options ?? [""] : undefined,
                  });
                }}
                style={{ flex: 1 }}
              >
                {childTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11 }}>
                <input
                  type="checkbox"
                  checked={child.required}
                  onChange={(e) => updateChild(i, { ...child, required: e.target.checked })}
                />
                req
              </label>
              <button className="btn btn-danger" onClick={() => deleteChild(i)} style={{ padding: "2px 6px" }}>
                ×
              </button>
            </div>
            {child.type === "select" && (
              <div style={{ marginLeft: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: "#999" }}>options: </span>
                <input
                  className="input"
                  value={(child.options ?? []).join(", ")}
                  onChange={(e) =>
                    updateChild(i, {
                      ...child,
                      options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="A, B, C"
                  style={{ width: "calc(100% - 60px)", display: "inline-block" }}
                />
              </div>
            )}
          </div>
        ))}
        <button
          className="btn btn-secondary"
          onClick={addChild}
          style={{ fontSize: 10, padding: "2px 8px" }}
        >
          + Child
        </button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/components/SchemaFieldRow.tsx
git commit -m "feat: schema UI supports group children, removes multiline checkbox"
```

---

### Task 11: Final integration — run all tests and verify build

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Fix any type errors or test failures**

Address any issues found.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and test failures from nested field refactor"
```