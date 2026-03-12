# Rich Annotation Figma Plugin Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Figma plugin that lets users define category-based schemas and use them to write, parse, and manage structured annotation text on Figma nodes.

**Architecture:** Plugin sandbox (`code.ts`) handles Figma API access (annotations, plugin data, selection). React UI (`ui/`) communicates via `postMessage`. Shared modules define schema types and text build/parse logic. Schema is stored as JSON in `figma.root.setPluginData()`. Annotation text is stored in `node.annotations[].label`.

**Tech Stack:** TypeScript, React 18, Vite (UI bundling with `vite-plugin-singlefile`), esbuild (sandbox bundling), Vitest (testing)

---

## File Structure

```
rich-annotation/
├── manifest.json                    # Figma plugin manifest
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript config (base)
├── tsconfig.node.json               # TypeScript config for build scripts
├── vite.config.ts                   # Vite config for UI
├── esbuild.config.mjs               # esbuild config for sandbox code
├── src/
│   ├── shared/
│   │   ├── types.ts                 # Schema, Field, Annotation types
│   │   ├── buildText.ts             # Fields → annotation text
│   │   ├── parseText.ts             # Annotation text → parsed fields
│   │   ├── validateField.ts         # Parse hint validation per field type
│   │   └── messages.ts              # Plugin ↔ UI message type definitions
│   ├── plugin/
│   │   └── code.ts                  # Figma sandbox: API bridge
│   └── ui/
│       ├── main.tsx                 # React entry point
│       ├── ui.html                  # UI HTML shell
│       ├── App.tsx                   # Tab router (Overview/Selected/Schema)
│       ├── hooks/
│       │   ├── usePluginMessage.ts   # postMessage send/receive hook
│       │   └── useSelection.ts      # Current selection state
│       ├── components/
│       │   ├── Tabs.tsx              # Tab navigation
│       │   ├── OverviewTab.tsx       # Overview tab
│       │   ├── OverviewRow.tsx       # Single annotation row in overview
│       │   ├── SelectedTab.tsx       # Selected node tab
│       │   ├── FieldInput.tsx        # Single field input (text/number/boolean/select)
│       │   ├── AnnotationPreview.tsx # Text preview panel
│       │   ├── RawTextEditor.tsx     # Raw text editing mode
│       │   ├── SchemaTab.tsx         # Schema management tab
│       │   ├── SchemaCategory.tsx    # Single category schema editor
│       │   └── SchemaFieldRow.tsx    # Single field row in schema editor
│       └── styles/
│           └── global.css            # Styles
├── tests/
│   ├── buildText.test.ts            # buildText tests
│   ├── parseText.test.ts            # parseText tests
│   └── validateField.test.ts        # validateField tests
└── dist/                            # Build output (gitignored)
    ├── code.js
    └── ui.html
```

---

## Chunk 1: Project Setup & Core Types

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/sangwon/Project/rich-annotation
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom
npm install -D typescript @types/react @types/react-dom \
  vite vite-plugin-singlefile @vitejs/plugin-react \
  esbuild \
  vitest \
  @figma/plugin-typings
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "esbuild.config.mjs"]
}
```

- [ ] **Step 5: Update .gitignore**

```
node_modules/
dist/
*.js.map
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json tsconfig.node.json .gitignore package-lock.json
git commit -m "chore: initialize project with TypeScript, React, Vite, esbuild"
```

---

### Task 2: Create build configuration

**Files:**
- Create: `vite.config.ts`
- Create: `esbuild.config.mjs`
- Create: `manifest.json`
- Create: `src/ui/ui.html`

- [ ] **Step 1: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: path.resolve(__dirname, "src/ui"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src/ui/ui.html"),
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
```

- [ ] **Step 2: Create esbuild.config.mjs**

```javascript
import { build } from "esbuild";

build({
  entryPoints: ["src/plugin/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  format: "iife",
  target: "es2020",
  alias: {
    "@shared": "./src/shared",
  },
}).catch(() => process.exit(1));
```

- [ ] **Step 3: Create manifest.json**

```json
{
  "name": "Rich Annotation",
  "id": "rich-annotation-dev",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma", "dev"],
  "documentAccess": "dynamic-page",
  "networkAccess": {
    "allowedDomains": ["none"]
  }
}
```

- [ ] **Step 4: Create src/ui/ui.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rich Annotation</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Add build scripts to package.json**

Add to `scripts`:
```json
{
  "build:ui": "vite build",
  "build:plugin": "node esbuild.config.mjs",
  "build": "npm run build:plugin && npm run build:ui",
  "watch:ui": "vite build --watch",
  "watch:plugin": "node esbuild.config.mjs --watch",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts esbuild.config.mjs manifest.json src/ui/ui.html package.json
git commit -m "chore: add build configuration (Vite, esbuild, manifest)"
```

---

### Task 3: Define shared types

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/messages.ts`

- [ ] **Step 1: Create src/shared/types.ts**

```typescript
export type FieldType = "text" | "number" | "boolean" | "select";

export interface FieldSchema {
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[];    // for select type
  multiline?: boolean;   // for text type, UI-only hint
}

export interface CategorySchema {
  categoryId: string;
  categoryLabel: string;
  fields: FieldSchema[];
}

export type SchemaStore = Record<string, CategorySchema>;
// key = categoryId

export interface ParsedField {
  name: string;
  rawValue: string;
  parsedValue: string | number | boolean | null;
  matched: boolean;
}

export type ParseMatch = "matched" | "not_matched" | "no_schema";

export interface AnnotationInfo {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  categoryId: string | undefined;
  categoryLabel: string;
  label: string;
  parsedFields: ParsedField[];
  parseMatch: ParseMatch;
}

export interface FieldValues {
  [fieldName: string]: string;
}
```

- [ ] **Step 2: Create src/shared/messages.ts**

```typescript
import type {
  SchemaStore,
  AnnotationInfo,
  FieldValues,
  CategorySchema,
} from "./types";

// UI → Plugin messages
export type UIMessage =
  | { type: "INIT" }
  | { type: "GET_SELECTION" }
  | { type: "GET_ANNOTATIONS" }
  | { type: "GET_SCHEMAS" }
  | { type: "SAVE_SCHEMAS"; schemas: SchemaStore }
  | {
      type: "APPLY_ANNOTATION";
      nodeId: string;
      categoryId: string;
      text: string;
    }
  | { type: "DELETE_ANNOTATION"; nodeId: string; categoryId: string }
  | { type: "SELECT_NODE"; nodeId: string }
  | { type: "GET_CATEGORIES" };

// Plugin → UI messages
export type PluginMessage =
  | {
      type: "SELECTION_CHANGED";
      nodeId: string | null;
      nodeName: string;
      nodeType: string;
      annotations: AnnotationInfo[];
    }
  | { type: "SCHEMAS_LOADED"; schemas: SchemaStore }
  | { type: "ANNOTATIONS_LIST"; annotations: AnnotationInfo[] }
  | {
      type: "CATEGORIES_LIST";
      categories: { id: string; label: string }[];
    }
  | { type: "ANNOTATION_APPLIED" }
  | { type: "ANNOTATION_DELETED" };
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/shared/messages.ts
git commit -m "feat: define shared types for schema, annotations, and messages"
```

---

## Chunk 2: Text Build, Parse, and Validation Logic

### Task 4: Implement field validation

**Files:**
- Create: `src/shared/validateField.ts`
- Create: `tests/validateField.test.ts`

- [ ] **Step 1: Write failing tests for validateField**

Create `tests/validateField.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateField } from "../src/shared/validateField";
import type { FieldSchema } from "../src/shared/types";

describe("validateField", () => {
  it("returns string as-is for text type", () => {
    const schema: FieldSchema = { name: "note", type: "text", required: false };
    const result = validateField("hello world", schema);
    expect(result).toEqual({ parsedValue: "hello world", matched: true });
  });

  it("parses valid number", () => {
    const schema: FieldSchema = { name: "count", type: "number", required: false };
    const result = validateField("42", schema);
    expect(result).toEqual({ parsedValue: 42, matched: true });
  });

  it("fails on invalid number", () => {
    const schema: FieldSchema = { name: "count", type: "number", required: false };
    const result = validateField("abc", schema);
    expect(result).toEqual({ parsedValue: null, matched: false });
  });

  it("parses true boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("true", schema)).toEqual({ parsedValue: true, matched: true });
  });

  it("parses false boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("false", schema)).toEqual({ parsedValue: false, matched: true });
  });

  it("fails on invalid boolean", () => {
    const schema: FieldSchema = { name: "enabled", type: "boolean", required: false };
    expect(validateField("maybe", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("validates select with matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      required: false,
      options: ["A", "B", "C"],
    };
    expect(validateField("B", schema)).toEqual({ parsedValue: "B", matched: true });
  });

  it("fails select with non-matching option", () => {
    const schema: FieldSchema = {
      name: "variant",
      type: "select",
      required: false,
      options: ["A", "B", "C"],
    };
    expect(validateField("D", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("returns not matched for empty required field", () => {
    const schema: FieldSchema = { name: "action", type: "text", required: true };
    expect(validateField("", schema)).toEqual({ parsedValue: null, matched: false });
  });

  it("allows empty optional field", () => {
    const schema: FieldSchema = { name: "note", type: "text", required: false };
    expect(validateField("", schema)).toEqual({ parsedValue: "", matched: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/validateField.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement validateField**

Create `src/shared/validateField.ts`:

```typescript
import type { FieldSchema } from "./types";

export interface ValidationResult {
  parsedValue: string | number | boolean | null;
  matched: boolean;
}

export function validateField(
  rawValue: string,
  schema: FieldSchema
): ValidationResult {
  if (rawValue === "" && schema.required) {
    return { parsedValue: null, matched: false };
  }

  if (rawValue === "" && !schema.required) {
    return { parsedValue: "", matched: true };
  }

  switch (schema.type) {
    case "text":
      return { parsedValue: rawValue, matched: true };

    case "number": {
      const num = Number(rawValue);
      if (isNaN(num)) {
        return { parsedValue: null, matched: false };
      }
      return { parsedValue: num, matched: true };
    }

    case "boolean": {
      if (rawValue === "true") return { parsedValue: true, matched: true };
      if (rawValue === "false") return { parsedValue: false, matched: true };
      return { parsedValue: null, matched: false };
    }

    case "select": {
      const options = schema.options ?? [];
      if (options.includes(rawValue)) {
        return { parsedValue: rawValue, matched: true };
      }
      return { parsedValue: null, matched: false };
    }

    default:
      return { parsedValue: rawValue, matched: true };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/validateField.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/validateField.ts tests/validateField.test.ts
git commit -m "feat: add field validation with parse hint logic"
```

---

### Task 5: Implement buildText

**Files:**
- Create: `src/shared/buildText.ts`
- Create: `tests/buildText.test.ts`

- [ ] **Step 1: Write failing tests for buildText**

Create `tests/buildText.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildText } from "../src/shared/buildText";
import type { FieldSchema } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("buildText", () => {
  it("builds canonical field: value lines", () => {
    const values = {
      experiment_id: "paywall_copy_test",
      variant: "B",
      surface: "pricing_modal",
      enabled: "true",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe(
      "experiment_id: paywall_copy_test\nvariant: B\nsurface: pricing_modal\nenabled: true"
    );
  });

  it("omits empty optional fields", () => {
    const values = {
      experiment_id: "test",
      variant: "A",
      surface: "",
      enabled: "",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe("experiment_id: test\nvariant: A");
  });

  it("keeps empty required fields with empty value", () => {
    const values = {
      experiment_id: "",
      variant: "B",
    };
    const result = buildText(experimentFields, values);
    expect(result).toBe("experiment_id: \nvariant: B");
  });

  it("preserves field order from schema", () => {
    const values = {
      enabled: "true",
      experiment_id: "test",
      variant: "A",
      surface: "modal",
    };
    const result = buildText(experimentFields, values);
    const lines = result.split("\n");
    expect(lines[0]).toMatch(/^experiment_id:/);
    expect(lines[1]).toMatch(/^variant:/);
    expect(lines[2]).toMatch(/^surface:/);
    expect(lines[3]).toMatch(/^enabled:/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/buildText.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement buildText**

Create `src/shared/buildText.ts`:

```typescript
import type { FieldSchema, FieldValues } from "./types";

export function buildText(
  fields: FieldSchema[],
  values: FieldValues
): string {
  const lines: string[] = [];

  for (const field of fields) {
    const value = values[field.name] ?? "";

    if (value === "" && !field.required) {
      continue;
    }

    lines.push(`${field.name}: ${value}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/buildText.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/buildText.ts tests/buildText.test.ts
git commit -m "feat: add buildText to generate canonical annotation text"
```

---

### Task 6: Implement parseText

**Files:**
- Create: `src/shared/parseText.ts`
- Create: `tests/parseText.test.ts`

- [ ] **Step 1: Write failing tests for parseText**

Create `tests/parseText.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseText } from "../src/shared/parseText";
import type { FieldSchema, ParseMatch } from "../src/shared/types";

const experimentFields: FieldSchema[] = [
  { name: "experiment_id", type: "text", required: true },
  { name: "variant", type: "select", required: true, options: ["A", "B", "C"] },
  { name: "surface", type: "text", required: false },
  { name: "enabled", type: "boolean", required: false },
];

describe("parseText", () => {
  it("parses valid canonical text as matched", () => {
    const text =
      "experiment_id: paywall_copy_test\nvariant: B\nsurface: pricing_modal\nenabled: true";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    expect(result.fields).toHaveLength(4);
    expect(result.fields[0]).toEqual({
      name: "experiment_id",
      rawValue: "paywall_copy_test",
      parsedValue: "paywall_copy_test",
      matched: true,
    });
    expect(result.fields[3]).toEqual({
      name: "enabled",
      rawValue: "true",
      parsedValue: true,
      matched: true,
    });
  });

  it("returns not_matched when select value is invalid", () => {
    const text = "experiment_id: test\nvariant: hoho";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const variantField = result.fields.find((f) => f.name === "variant");
    expect(variantField?.matched).toBe(false);
    expect(variantField?.rawValue).toBe("hoho");
    expect(variantField?.parsedValue).toBeNull();
  });

  it("returns field values as empty string when line is missing and optional", () => {
    const text = "experiment_id: test\nvariant: A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("matched");
    const surfaceField = result.fields.find((f) => f.name === "surface");
    expect(surfaceField?.rawValue).toBe("");
    expect(surfaceField?.matched).toBe(true);
  });

  it("marks missing required field as not matched", () => {
    const text = "variant: A";
    const result = parseText(text, experimentFields);
    expect(result.parseMatch).toBe("not_matched");
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.matched).toBe(false);
  });

  it("handles values with colons", () => {
    const text = "experiment_id: url:test:123\nvariant: A";
    const result = parseText(text, experimentFields);
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.rawValue).toBe("url:test:123");
  });

  it("returns field values from raw text even with extra whitespace", () => {
    const text = "experiment_id:   paywall  \nvariant:B";
    const result = parseText(text, experimentFields);
    const idField = result.fields.find((f) => f.name === "experiment_id");
    expect(idField?.rawValue).toBe("paywall");
    const variantField = result.fields.find((f) => f.name === "variant");
    expect(variantField?.rawValue).toBe("B");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/parseText.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement parseText**

Create `src/shared/parseText.ts`:

```typescript
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
  const lineMap = new Map<string, string>();

  for (const line of text.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    lineMap.set(key, value);
  }

  let allMatched = true;
  const fields: ParsedField[] = schemaFields.map((schema) => {
    const rawValue = lineMap.get(schema.name) ?? "";
    const { parsedValue, matched } = validateField(rawValue, schema);

    if (!matched) {
      allMatched = false;
    }

    return {
      name: schema.name,
      rawValue,
      parsedValue,
      matched,
    };
  });

  return {
    fields,
    parseMatch: allMatched ? "matched" : "not_matched",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/parseText.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/parseText.ts tests/parseText.test.ts
git commit -m "feat: add parseText to extract structured fields from annotation text"
```

---

## Chunk 3: Plugin Sandbox (Figma API Bridge)

### Task 7: Implement plugin sandbox code

**Files:**
- Create: `src/plugin/code.ts`

- [ ] **Step 1: Create plugin sandbox**

Create `src/plugin/code.ts`:

```typescript
import type { UIMessage, PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo, ParseMatch } from "@shared/types";
import { parseText } from "@shared/parseText";

const SCHEMA_KEY = "rich-annotation-schemas";

figma.showUI(__html__, { width: 360, height: 560, themeColors: true });

// --- Schema Storage ---

function loadSchemas(): SchemaStore {
  const raw = figma.root.getPluginData(SCHEMA_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SchemaStore;
  } catch {
    return {};
  }
}

function saveSchemas(schemas: SchemaStore): void {
  figma.root.setPluginData(SCHEMA_KEY, JSON.stringify(schemas));
}

// --- Annotation Helpers ---

function getAnnotationsForPage(): AnnotationInfo[] {
  const schemas = loadSchemas();
  const results: AnnotationInfo[] = [];
  const page = figma.currentPage;

  function walk(node: SceneNode) {
    if ("annotations" in node && node.annotations && node.annotations.length > 0) {
      for (const ann of node.annotations) {
        const catId = ann.categoryId ?? "";
        const label = ann.label ?? "";
        const schema = schemas[catId];

        let parsedFields: AnnotationInfo["parsedFields"] = [];
        let parseMatch: ParseMatch = "no_schema";

        if (schema) {
          const result = parseText(label, schema.fields);
          parsedFields = result.fields;
          parseMatch = result.parseMatch;
        }

        results.push({
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          categoryId: catId || undefined,
          categoryLabel: schema?.categoryLabel ?? catId,
          label,
          parsedFields,
          parseMatch,
        });
      }
    }

    if ("children" in node) {
      for (const child of (node as ChildrenMixin).children) {
        walk(child as SceneNode);
      }
    }
  }

  for (const child of page.children) {
    walk(child);
  }

  return results;
}

function getSelectionInfo(): PluginMessage {
  const sel = figma.currentPage.selection;
  if (sel.length !== 1) {
    return {
      type: "SELECTION_CHANGED",
      nodeId: null,
      nodeName: "",
      nodeType: "",
      annotations: [],
    };
  }

  const node = sel[0];
  const schemas = loadSchemas();
  const annotations: AnnotationInfo[] = [];

  if ("annotations" in node && node.annotations) {
    for (const ann of node.annotations) {
      const catId = ann.categoryId ?? "";
      const label = ann.label ?? "";
      const schema = schemas[catId];

      let parsedFields: AnnotationInfo["parsedFields"] = [];
      let parseMatch: ParseMatch = "no_schema";

      if (schema) {
        const result = parseText(label, schema.fields);
        parsedFields = result.fields;
        parseMatch = result.parseMatch;
      }

      annotations.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        categoryId: catId || undefined,
        categoryLabel: schema?.categoryLabel ?? catId,
        label,
        parsedFields,
        parseMatch,
      });
    }
  }

  return {
    type: "SELECTION_CHANGED",
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    annotations,
  };
}

// --- Message Handler ---

figma.ui.onmessage = async (msg: UIMessage) => {
  switch (msg.type) {
    case "INIT":
    case "GET_SELECTION": {
      const info = getSelectionInfo();
      figma.ui.postMessage(info);
      break;
    }

    case "GET_ANNOTATIONS": {
      const annotations = getAnnotationsForPage();
      figma.ui.postMessage({
        type: "ANNOTATIONS_LIST",
        annotations,
      } satisfies PluginMessage);
      break;
    }

    case "GET_SCHEMAS": {
      const schemas = loadSchemas();
      figma.ui.postMessage({
        type: "SCHEMAS_LOADED",
        schemas,
      } satisfies PluginMessage);
      break;
    }

    case "SAVE_SCHEMAS": {
      saveSchemas(msg.schemas);
      figma.ui.postMessage({
        type: "SCHEMAS_LOADED",
        schemas: msg.schemas,
      } satisfies PluginMessage);
      break;
    }

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

      figma.ui.postMessage({ type: "ANNOTATION_APPLIED" } satisfies PluginMessage);
      // Refresh selection info
      figma.ui.postMessage(getSelectionInfo());
      break;
    }

    case "DELETE_ANNOTATION": {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (!node || !("annotations" in node)) break;

      const filtered = (node.annotations ?? []).filter(
        (a) => a.categoryId !== msg.categoryId
      );
      const annotatable = node as FrameNode;
      annotatable.annotations = filtered;

      figma.ui.postMessage({ type: "ANNOTATION_DELETED" } satisfies PluginMessage);
      figma.ui.postMessage(getSelectionInfo());
      break;
    }

    case "SELECT_NODE": {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && "type" in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      break;
    }

    case "GET_CATEGORIES": {
      const categories = await figma.annotations.getAnnotationCategoriesAsync();
      figma.ui.postMessage({
        type: "CATEGORIES_LIST",
        categories: categories.map((c) => ({ id: c.id, label: c.label })),
      } satisfies PluginMessage);
      break;
    }
  }
};

// --- Selection Change Listener ---

figma.on("selectionchange", () => {
  figma.ui.postMessage(getSelectionInfo());
});
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build:plugin
```

Expected: `dist/code.js` created without errors

- [ ] **Step 3: Commit**

```bash
git add src/plugin/code.ts
git commit -m "feat: implement plugin sandbox with Figma API bridge"
```

---

## Chunk 4: UI Foundation & Schema Tab

### Task 8: Create React entry point and App shell

**Files:**
- Create: `src/ui/main.tsx`
- Create: `src/ui/App.tsx`
- Create: `src/ui/hooks/usePluginMessage.ts`
- Create: `src/ui/components/Tabs.tsx`
- Create: `src/ui/styles/global.css`

- [ ] **Step 1: Create global.css**

Create `src/ui/styles/global.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: Inter, system-ui, -apple-system, sans-serif;
  font-size: 12px;
  color: var(--figma-color-text, #333);
  background: var(--figma-color-bg, #fff);
  line-height: 1.4;
}

input, select, textarea, button {
  font-family: inherit;
  font-size: 12px;
}

.plugin-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--figma-color-border, #e5e5e5);
  flex-shrink: 0;
}

.tab-bar button {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--figma-color-text-secondary, #999);
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.tab-bar button.active {
  color: var(--figma-color-text, #333);
  border-bottom-color: var(--figma-color-text-brand, #0d99ff);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--figma-color-text-secondary, #999);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-group {
  margin-bottom: 8px;
}

.field-label {
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.field-label .required {
  color: var(--figma-color-text-danger, #f24822);
}

.input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-radius: 4px;
  background: var(--figma-color-bg, #fff);
  color: var(--figma-color-text, #333);
}

.input:focus {
  outline: none;
  border-color: var(--figma-color-border-brand, #0d99ff);
}

.input.error {
  border-color: var(--figma-color-border-danger, #f24822);
}

.select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-radius: 4px;
  background: var(--figma-color-bg, #fff);
  color: var(--figma-color-text, #333);
}

textarea.input {
  resize: vertical;
  min-height: 80px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: var(--figma-color-bg-brand, #0d99ff);
  color: white;
}

.btn-secondary {
  background: var(--figma-color-bg-secondary, #f5f5f5);
  color: var(--figma-color-text, #333);
}

.btn-danger {
  background: none;
  color: var(--figma-color-text-danger, #f24822);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid var(--figma-color-border, #e5e5e5);
  flex-shrink: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--figma-color-text-secondary, #999);
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.badge-matched {
  background: #e6f4ea;
  color: #1e8e3e;
}

.badge-not-matched {
  background: #fce8e6;
  color: #d93025;
}

.badge-no-schema {
  background: #fef7e0;
  color: #f9ab00;
}

.preview-box {
  background: var(--figma-color-bg-secondary, #f5f5f5);
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-line.error {
  color: var(--figma-color-text-danger, #f24822);
}

.row-card {
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
}

.row-card:hover {
  background: var(--figma-color-bg-hover, #f5f5f5);
}

.row-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.row-fields {
  font-size: 11px;
  color: var(--figma-color-text-secondary, #999);
}

.search-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.schema-field-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
  padding: 4px;
  border: 1px solid var(--figma-color-border, #e5e5e5);
  border-radius: 4px;
}

.schema-field-row .input,
.schema-field-row .select {
  flex: 1;
}

.schema-category {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--figma-color-border, #e5e5e5);
}

.schema-category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Create usePluginMessage hook**

Create `src/ui/hooks/usePluginMessage.ts`:

```typescript
import React from "react";
import type { UIMessage, PluginMessage } from "@shared/messages";

export function postToPlugin(msg: UIMessage): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

export function usePluginMessage(
  handler: (msg: PluginMessage) => void
): void {
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  });
  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg) handlerRef.current(msg);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
```

- [ ] **Step 3: Create Tabs component**

Create `src/ui/components/Tabs.tsx`:

```tsx
import React from "react";

export type TabId = "overview" | "selected" | "schema";

interface TabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "selected", label: "Selected" },
  { id: "schema", label: "Schema" },
];

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={active === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create App.tsx**

Create `src/ui/App.tsx`:

```tsx
import React, { useState, useCallback } from "react";
import { Tabs, TabId } from "./components/Tabs";
import { OverviewTab } from "./components/OverviewTab";
import { SelectedTab } from "./components/SelectedTab";
import { SchemaTab } from "./components/SchemaTab";
import { usePluginMessage, postToPlugin } from "./hooks/usePluginMessage";
import type { PluginMessage } from "@shared/messages";
import type { SchemaStore, AnnotationInfo } from "@shared/types";

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("selected");
  const [schemas, setSchemas] = useState<SchemaStore>({});
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState("");
  const [selectedNodeType, setSelectedNodeType] = useState("");
  const [selectedAnnotations, setSelectedAnnotations] = useState<AnnotationInfo[]>([]);

  // Overview state
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationInfo[]>([]);

  const handleMessage = useCallback((msg: PluginMessage) => {
    switch (msg.type) {
      case "SELECTION_CHANGED":
        setSelectedNodeId(msg.nodeId);
        setSelectedNodeName(msg.nodeName);
        setSelectedNodeType(msg.nodeType);
        setSelectedAnnotations(msg.annotations);
        break;
      case "SCHEMAS_LOADED":
        setSchemas(msg.schemas);
        break;
      case "ANNOTATIONS_LIST":
        setPageAnnotations(msg.annotations);
        break;
      case "CATEGORIES_LIST":
        setCategories(msg.categories);
        break;
      case "ANNOTATION_APPLIED":
      case "ANNOTATION_DELETED":
        postToPlugin({ type: "GET_ANNOTATIONS" });
        break;
    }
  }, []);

  usePluginMessage(handleMessage);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "overview") {
      postToPlugin({ type: "GET_ANNOTATIONS" });
    } else if (tab === "selected") {
      postToPlugin({ type: "GET_SELECTION" });
    } else if (tab === "schema") {
      postToPlugin({ type: "GET_SCHEMAS" });
      postToPlugin({ type: "GET_CATEGORIES" });
    }
  };

  return (
    <div className="plugin-container">
      <Tabs active={activeTab} onChange={handleTabChange} />
      {activeTab === "overview" && (
        <OverviewTab
          annotations={pageAnnotations}
          schemas={schemas}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}
      {activeTab === "selected" && (
        <SelectedTab
          nodeId={selectedNodeId}
          nodeName={selectedNodeName}
          nodeType={selectedNodeType}
          annotations={selectedAnnotations}
          schemas={schemas}
          categories={categories}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}
      {activeTab === "schema" && (
        <SchemaTab
          schemas={schemas}
          categories={categories}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create main.tsx**

Create `src/ui/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { postToPlugin } from "./hooks/usePluginMessage";
import "./styles/global.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Request initial data
postToPlugin({ type: "INIT" });
postToPlugin({ type: "GET_SCHEMAS" });
postToPlugin({ type: "GET_CATEGORIES" });
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/
git commit -m "feat: create React shell with tabs, message hook, and global styles"
```

---

### Task 9: Build Schema tab

**Files:**
- Create: `src/ui/components/SchemaTab.tsx`
- Create: `src/ui/components/SchemaCategory.tsx`
- Create: `src/ui/components/SchemaFieldRow.tsx`

- [ ] **Step 1: Create SchemaFieldRow**

Create `src/ui/components/SchemaFieldRow.tsx`:

```tsx
import React from "react";
import type { FieldSchema, FieldType } from "@shared/types";

interface SchemaFieldRowProps {
  field: FieldSchema;
  onChange: (updated: FieldSchema) => void;
  onDelete: () => void;
}

const fieldTypes: FieldType[] = ["text", "number", "boolean", "select"];

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
        onChange={(e) =>
          onChange({
            ...field,
            type: e.target.value as FieldType,
            options: e.target.value === "select" ? field.options ?? [""] : undefined,
            multiline: e.target.value === "text" ? field.multiline : undefined,
          })
        }
        style={{ flex: 1 }}
      >
        {fieldTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
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

  if (field.type === "text") {
    return (
      <div style={{ marginLeft: 8, marginBottom: 4 }}>
        <label style={{ fontSize: 10, color: "#999", display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={field.multiline ?? false}
            onChange={(e) => onChange({ ...field, multiline: e.target.checked })}
          />
          multiline input
        </label>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Create SchemaCategory**

Create `src/ui/components/SchemaCategory.tsx`:

```tsx
import React from "react";
import type { CategorySchema, FieldSchema } from "@shared/types";
import { SchemaFieldRow, FieldOptionsEditor } from "./SchemaFieldRow";

interface SchemaCategoryProps {
  schema: CategorySchema;
  onChange: (updated: CategorySchema) => void;
}

export function SchemaCategory({ schema, onChange }: SchemaCategoryProps) {
  const addField = () => {
    onChange({
      ...schema,
      fields: [
        ...schema.fields,
        { name: "", type: "text", required: false },
      ],
    });
  };

  const updateField = (index: number, updated: FieldSchema) => {
    const fields = [...schema.fields];
    fields[index] = updated;
    onChange({ ...schema, fields });
  };

  const deleteField = (index: number) => {
    const fields = schema.fields.filter((_, i) => i !== index);
    onChange({ ...schema, fields });
  };

  return (
    <div className="schema-category">
      <div className="schema-category-header">
        <strong>{schema.categoryLabel}</strong>
        <button className="btn btn-secondary" onClick={addField}>
          + Add
        </button>
      </div>
      {schema.fields.map((field, i) => (
        <div key={i}>
          <SchemaFieldRow
            field={field}
            onChange={(f) => updateField(i, f)}
            onDelete={() => deleteField(i)}
          />
          <FieldOptionsEditor
            field={field}
            onChange={(f) => updateField(i, f)}
          />
        </div>
      ))}
      {schema.fields.length === 0 && (
        <div style={{ fontSize: 11, color: "#999", padding: 8 }}>
          No fields. Click + Add to define schema fields.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create SchemaTab**

Create `src/ui/components/SchemaTab.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import type { SchemaStore, CategorySchema } from "@shared/types";
import { SchemaCategory } from "./SchemaCategory";
import { postToPlugin } from "../hooks/usePluginMessage";

interface SchemaTabProps {
  schemas: SchemaStore;
  categories: { id: string; label: string }[];
}

export function SchemaTab({ schemas, categories }: SchemaTabProps) {
  const [draft, setDraft] = useState<SchemaStore>(schemas);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(schemas);
    setDirty(false);
  }, [schemas]);

  const handleCategoryChange = (categoryId: string, updated: CategorySchema) => {
    setDraft((prev) => ({ ...prev, [categoryId]: updated }));
    setDirty(true);
  };

  const handleSave = () => {
    postToPlugin({ type: "SAVE_SCHEMAS", schemas: draft });
    setDirty(false);
  };

  const handleReset = () => {
    setDraft(schemas);
    setDirty(false);
  };

  // Ensure all categories have an entry in draft
  const allCategoryIds = new Set([
    ...Object.keys(draft),
    ...categories.map((c) => c.id),
  ]);

  const categorySchemas = Array.from(allCategoryIds).map((catId) => {
    const existing = draft[catId];
    const catInfo = categories.find((c) => c.id === catId);
    return (
      existing ?? {
        categoryId: catId,
        categoryLabel: catInfo?.label ?? catId,
        fields: [],
      }
    );
  });

  return (
    <>
      <div className="tab-content">
        {categorySchemas.length === 0 ? (
          <div className="empty-state">
            <div>No annotation categories available.</div>
            <div style={{ fontSize: 11 }}>
              Categories are defined in Figma's annotation settings.
            </div>
          </div>
        ) : (
          categorySchemas.map((cs) => (
            <SchemaCategory
              key={cs.categoryId}
              schema={cs}
              onChange={(updated) => handleCategoryChange(cs.categoryId, updated)}
            />
          ))
        )}
        <div style={{ fontSize: 10, color: "#999", textAlign: "right" }}>
          Used to build / parse annotation text
        </div>
      </div>
      <div className="action-bar">
        <button className="btn btn-secondary" onClick={handleReset} disabled={!dirty}>
          Reset
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!dirty}>
          Save
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/SchemaTab.tsx src/ui/components/SchemaCategory.tsx src/ui/components/SchemaFieldRow.tsx
git commit -m "feat: implement Schema tab with category-based field editor"
```

---

## Chunk 5: Selected Tab

### Task 10: Build Selected tab components

**Files:**
- Create: `src/ui/components/FieldInput.tsx`
- Create: `src/ui/components/AnnotationPreview.tsx`
- Create: `src/ui/components/RawTextEditor.tsx`
- Create: `src/ui/components/SelectedTab.tsx`
- Create: `src/ui/hooks/useSelection.ts`

- [ ] **Step 1: Create FieldInput**

Create `src/ui/components/FieldInput.tsx`:

```tsx
import React from "react";
import type { FieldSchema } from "@shared/types";

interface FieldInputProps {
  schema: FieldSchema;
  value: string;
  matched: boolean;
  onChange: (value: string) => void;
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
            <option key={opt} value={opt}>
              {opt}
            </option>
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
  if (schema.type === "text" && schema.multiline) {
    return (
      <div className="field-group">
        <div className="field-label">
          {schema.name}
          {schema.required && <span className="required"> *</span>}
        </div>
        <textarea
          className={`input${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </div>
    );
  }

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
```

- [ ] **Step 2: Create AnnotationPreview**

Create `src/ui/components/AnnotationPreview.tsx`:

```tsx
import React from "react";
import type { ParsedField } from "@shared/types";

interface AnnotationPreviewProps {
  text: string;
  parsedFields?: ParsedField[];
}

export function AnnotationPreview({ text, parsedFields }: AnnotationPreviewProps) {
  const lines = text.split("\n");
  const unmatchedNames = new Set(
    (parsedFields ?? []).filter((f) => !f.matched && f.rawValue !== "").map((f) => f.name)
  );

  return (
    <div className="section">
      <div className="section-label">Annotation Text</div>
      <div className="preview-box">
        {lines.map((line, i) => {
          const fieldName = line.split(":")[0]?.trim();
          const isError = unmatchedNames.has(fieldName);
          return (
            <div key={i} className={`preview-line${isError ? " error" : ""}`}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create RawTextEditor**

Create `src/ui/components/RawTextEditor.tsx`:

```tsx
import React from "react";

interface RawTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RawTextEditor({ value, onChange }: RawTextEditorProps) {
  return (
    <div className="section">
      <div className="section-label">Raw Text Mode</div>
      <textarea
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        style={{ fontFamily: "monospace", fontSize: 11 }}
      />
      <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
        Leave raw text as-is or apply schema parsing.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create useSelection hook**

Create `src/ui/hooks/useSelection.ts`:

```typescript
import { useState, useEffect } from "react";
import type { FieldSchema, FieldValues, ParsedField } from "@shared/types";
import { buildText } from "@shared/buildText";
import { parseText } from "@shared/parseText";
import { validateField } from "@shared/validateField";

interface UseSelectionFieldsOptions {
  label: string;
  schemaFields: FieldSchema[];
}

export function useSelectionFields({ label, schemaFields }: UseSelectionFieldsOptions) {
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [validations, setValidations] = useState<Map<string, boolean>>(new Map());

  // Initialize field values from parsed annotation text
  useEffect(() => {
    if (schemaFields.length === 0) return;

    const result = parseText(label, schemaFields);
    const values: FieldValues = {};
    const valMap = new Map<string, boolean>();

    for (const f of result.fields) {
      values[f.name] = f.rawValue;
      valMap.set(f.name, f.matched);
    }

    setFieldValues(values);
    setValidations(valMap);
  }, [label, schemaFields]);

  const updateField = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));

    const schema = schemaFields.find((f) => f.name === name);
    if (schema) {
      const { matched } = validateField(value, schema);
      setValidations((prev) => new Map(prev).set(name, matched));
    }
  };

  const previewText = buildText(schemaFields, fieldValues);

  const parsedFields: ParsedField[] = schemaFields.map((s) => {
    const raw = fieldValues[s.name] ?? "";
    const { parsedValue, matched } = validateField(raw, s);
    return { name: s.name, rawValue: raw, parsedValue, matched };
  });

  const allMatched = parsedFields.every((f) => f.matched);

  return {
    fieldValues,
    updateField,
    previewText,
    parsedFields,
    allMatched,
  };
}
```

- [ ] **Step 5: Create SelectedTab**

Create `src/ui/components/SelectedTab.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import type { SchemaStore, AnnotationInfo, CategorySchema } from "@shared/types";
import { FieldInput } from "./FieldInput";
import { AnnotationPreview } from "./AnnotationPreview";
import { RawTextEditor } from "./RawTextEditor";
import { useSelectionFields } from "../hooks/useSelection";
import { postToPlugin } from "../hooks/usePluginMessage";
import type { TabId } from "./Tabs";

interface SelectedTabProps {
  nodeId: string | null;
  nodeName: string;
  nodeType: string;
  annotations: AnnotationInfo[];
  schemas: SchemaStore;
  categories: { id: string; label: string }[];
  onNavigate: (tab: TabId) => void;
}

export function SelectedTab({
  nodeId,
  nodeName,
  nodeType,
  annotations,
  schemas,
  categories,
  onNavigate,
}: SelectedTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [rawMode, setRawMode] = useState(false);
  const [rawText, setRawText] = useState("");

  // Find current annotation for selected category
  const currentAnnotation = annotations.find(
    (a) => a.categoryId === selectedCategoryId
  );
  const currentLabel = currentAnnotation?.label ?? "";
  const schema: CategorySchema | undefined = schemas[selectedCategoryId];

  const { fieldValues, updateField, previewText, parsedFields, allMatched } =
    useSelectionFields({
      label: currentLabel,
      schemaFields: schema?.fields ?? [],
    });

  // Auto-select first category if available
  useEffect(() => {
    if (!selectedCategoryId && annotations.length > 0 && annotations[0].categoryId) {
      setSelectedCategoryId(annotations[0].categoryId);
    }
  }, [annotations, selectedCategoryId]);

  // Sync raw text
  useEffect(() => {
    setRawText(currentLabel);
  }, [currentLabel]);

  if (!nodeId) {
    return (
      <div className="tab-content">
        <div className="empty-state">
          <div style={{ fontWeight: 600 }}>No node selected</div>
          <div>
            Select one layer, frame, or component in Figma to create or edit a
            structured annotation.
          </div>
          <div>Then choose a category and fill its schema.</div>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate("overview")}
            style={{ marginTop: 8 }}
          >
            Go to Overview
          </button>
        </div>
      </div>
    );
  }

  const handleApply = () => {
    if (!nodeId || !selectedCategoryId) return;
    const text = rawMode ? rawText : previewText;
    postToPlugin({
      type: "APPLY_ANNOTATION",
      nodeId,
      categoryId: selectedCategoryId,
      text,
    });
    setRawMode(false);
  };

  const handleDelete = () => {
    if (!nodeId || !selectedCategoryId) return;
    postToPlugin({
      type: "DELETE_ANNOTATION",
      nodeId,
      categoryId: selectedCategoryId,
    });
  };

  const handleLocate = () => {
    if (nodeId) {
      postToPlugin({ type: "SELECT_NODE", nodeId });
    }
  };

  const parseMatch = currentAnnotation?.parseMatch ?? "no_schema";
  const hasSchema = !!schema;

  return (
    <>
      <div className="tab-content">
        {/* Node Info */}
        <div className="section">
          <div style={{ fontWeight: 600 }}>{nodeName}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
            <span>{nodeType} / id: {nodeId}</span>
            <button className="btn btn-secondary" onClick={handleLocate} style={{ padding: "2px 8px", fontSize: 10 }}>
              Locate
            </button>
          </div>
        </div>

        {/* Category Selection */}
        <div className="section">
          <div className="section-label">Annotation Category</div>
          <select
            className="select"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setRawMode(false);
            }}
          >
            <option value="">— Select Category —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {selectedCategoryId && !hasSchema && (
          /* No Schema State */
          <div className="section">
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No schema for this category</div>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>
              This category exists in Figma annotations, but Rich Annotation has
              no schema for it yet.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => onNavigate("schema")}>
                Go to Schema
              </button>
              <button className="btn btn-secondary" onClick={() => setRawMode(true)}>
                Raw Text
              </button>
            </div>
          </div>
        )}

        {selectedCategoryId && hasSchema && !rawMode && (
          <>
            {/* Schema Match Status */}
            <div className="section">
              <div className="section-label">Schema Match</div>
              <span className={`badge badge-${parseMatch.replace("_", "-")}`}>
                {parseMatch === "matched"
                  ? `Matched to ${schema.categoryLabel} schema`
                  : `Not matched to ${schema.categoryLabel} schema`}
              </span>
              {parseMatch === "not_matched" && (
                <div style={{ fontSize: 11, color: "#d93025", marginTop: 4 }}>
                  could not parse:{" "}
                  {parsedFields
                    .filter((f) => !f.matched && f.rawValue !== "")
                    .map((f) => f.name)
                    .join(", ")}
                </div>
              )}
            </div>

            {/* Field Inputs */}
            <div className="section">
              <div className="section-label">{schema.categoryLabel} Fields</div>
              {schema.fields.map((field) => {
                const parsed = parsedFields.find((p) => p.name === field.name);
                return (
                  <FieldInput
                    key={field.name}
                    schema={field}
                    value={fieldValues[field.name] ?? ""}
                    matched={parsed?.matched ?? true}
                    onChange={(v) => updateField(field.name, v)}
                  />
                );
              })}
            </div>

            {/* Preview */}
            <AnnotationPreview text={previewText} parsedFields={parsedFields} />
          </>
        )}

        {selectedCategoryId && rawMode && (
          <RawTextEditor value={rawText} onChange={setRawText} />
        )}
      </div>

      {selectedCategoryId && (
        <div className="action-bar">
          <div style={{ display: "flex", gap: 6 }}>
            {(hasSchema || rawMode) && (
              <button
                className="btn btn-secondary"
                onClick={() => setRawMode(!rawMode)}
              >
                {rawMode ? "Back to Fields" : "Edit Raw Text"}
              </button>
            )}
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleApply}>
            Apply
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/FieldInput.tsx src/ui/components/AnnotationPreview.tsx \
  src/ui/components/RawTextEditor.tsx src/ui/components/SelectedTab.tsx \
  src/ui/hooks/useSelection.ts
git commit -m "feat: implement Selected tab with field inputs, preview, and raw text mode"
```

---

## Chunk 6: Overview Tab & Export

### Task 11: Build Overview tab

**Files:**
- Create: `src/ui/components/OverviewRow.tsx`
- Create: `src/ui/components/OverviewTab.tsx`

- [ ] **Step 1: Create OverviewRow**

Create `src/ui/components/OverviewRow.tsx`:

```tsx
import React from "react";
import type { AnnotationInfo } from "@shared/types";
import { postToPlugin } from "../hooks/usePluginMessage";

interface OverviewRowProps {
  annotation: AnnotationInfo;
}

export function OverviewRow({ annotation }: OverviewRowProps) {
  const handleOpen = () => {
    postToPlugin({ type: "SELECT_NODE", nodeId: annotation.nodeId });
  };

  // Show first 2 parsed fields, or fallback to first line of raw text
  const summaryFields = annotation.parsedFields
    .filter((f) => f.rawValue !== "")
    .slice(0, 2);

  const fallbackLine =
    summaryFields.length === 0 ? annotation.label.split("\n")[0] : null;

  return (
    <div className="row-card" onClick={handleOpen}>
      <div className="row-header">
        <span className={`badge badge-${(annotation.parseMatch ?? "no-schema").replace("_", "-")}`}>
          {annotation.categoryLabel || "—"}
        </span>
        <span style={{ fontWeight: 500 }}>{annotation.nodeName}</span>
      </div>
      <div className="row-fields">
        {summaryFields.map((f) => (
          <div key={f.name}>
            {f.name}: {f.rawValue}
          </div>
        ))}
        {fallbackLine && <div>{fallbackLine}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create OverviewTab**

Create `src/ui/components/OverviewTab.tsx`:

```tsx
import React, { useState, useEffect } from "react";
import type { AnnotationInfo, SchemaStore } from "@shared/types";
import { OverviewRow } from "./OverviewRow";
import { postToPlugin } from "../hooks/usePluginMessage";
import type { TabId } from "./Tabs";

interface OverviewTabProps {
  annotations: AnnotationInfo[];
  schemas: SchemaStore;
  onNavigate: (tab: TabId) => void;
}

export function OverviewTab({ annotations, schemas, onNavigate }: OverviewTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    postToPlugin({ type: "GET_ANNOTATIONS" });
  }, []);

  // Collect unique categories from annotations
  const categoryIds = Array.from(
    new Set(annotations.map((a) => a.categoryId).filter(Boolean))
  ) as string[];

  // Filter
  let filtered = annotations;

  if (categoryFilter) {
    filtered = filtered.filter((a) => a.categoryId === categoryFilter);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((a) => {
      if (a.nodeName.toLowerCase().includes(q)) return true;
      if (a.categoryLabel.toLowerCase().includes(q)) return true;
      if (a.label.toLowerCase().includes(q)) return true;
      if (a.parsedFields.some((f) =>
        f.name.toLowerCase().includes(q) ||
        f.rawValue.toLowerCase().includes(q)
      )) return true;
      return false;
    });
  }

  const handleExport = (format: "json" | "csv") => {
    let content: string;
    let mimeType: string;
    let filename: string;

    if (format === "json") {
      const data = filtered.map((a) => ({
        nodeId: a.nodeId,
        nodeName: a.nodeName,
        nodeType: a.nodeType,
        category: a.categoryLabel,
        annotationText: a.label,
        fields: Object.fromEntries(
          a.parsedFields.map((f) => [f.name, { raw: f.rawValue, parsed: f.parsedValue, matched: f.matched }])
        ),
        parseMatch: a.parseMatch,
      }));
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
      filename = "annotations.json";
    } else {
      const headers = ["nodeId", "nodeName", "nodeType", "category", "annotationText", "parseMatch"];
      // Add field columns from schemas
      const fieldNames = new Set<string>();
      filtered.forEach((a) => a.parsedFields.forEach((f) => fieldNames.add(f.name)));
      const allFieldNames = Array.from(fieldNames);

      const rows = filtered.map((a) => {
        const base = [a.nodeId, a.nodeName, a.nodeType, a.categoryLabel, `"${a.label.replace(/"/g, '""')}"`, a.parseMatch];
        const fieldVals = allFieldNames.map((fn) => {
          const f = a.parsedFields.find((pf) => pf.name === fn);
          return f ? f.rawValue : "";
        });
        return [...base, ...fieldVals].join(",");
      });

      content = [[...headers, ...allFieldNames].join(","), ...rows].join("\n");
      mimeType = "text/csv";
      filename = "annotations.csv";
    }

    // Download via blob
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (annotations.length === 0) {
    return (
      <div className="tab-content">
        <div className="toolbar">
          <span style={{ fontSize: 11, color: "#999" }}>0 annotations</span>
        </div>
        <div className="empty-state">
          <div style={{ fontWeight: 500 }}>No annotations on this page</div>
          <div>
            Select a node and create a category-based annotation from the
            Selected tab.
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate("selected")}
            style={{ marginTop: 8 }}
          >
            Go to Selected
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="toolbar">
        <span style={{ fontSize: 11, color: "#999" }}>
          {filtered.length} annotation{filtered.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-secondary" onClick={() => handleExport("json")} style={{ fontSize: 10 }}>
            JSON
          </button>
          <button className="btn btn-secondary" onClick={() => handleExport("csv")} style={{ fontSize: 10 }}>
            CSV
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          className="input"
          placeholder="Search annotations, nodes, fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          className="select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="">All Categories</option>
          {categoryIds.map((catId) => {
            const label = schemas[catId]?.categoryLabel ?? catId;
            return (
              <option key={catId} value={catId}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {filtered.map((ann, i) => (
        <OverviewRow key={`${ann.nodeId}-${ann.categoryId}-${i}`} annotation={ann} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/OverviewRow.tsx src/ui/components/OverviewTab.tsx
git commit -m "feat: implement Overview tab with search, filter, and export"
```

---

### Task 12: Build and verify

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 2: Build the full plugin**

```bash
npm run build
```

Expected: `dist/code.js` and `dist/ui.html` both generated

- [ ] **Step 3: Verify dist output exists**

```bash
ls -la dist/
```

Expected: `code.js` and `ui.html` present

- [ ] **Step 4: Commit build config and any fixes**

```bash
git add -A
git commit -m "chore: verify full build passes"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|-----------------|
| 1 | 1-3 | Project setup, build tooling, shared types |
| 2 | 4-6 | validateField, buildText, parseText with tests |
| 3 | 7 | Plugin sandbox (Figma API bridge) |
| 4 | 8-9 | UI shell, tabs, styles, Schema tab |
| 5 | 10 | Selected tab with fields, preview, raw text |
| 6 | 11-12 | Overview tab with search/filter/export, final build |
