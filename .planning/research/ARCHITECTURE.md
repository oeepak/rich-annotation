# Architecture Research

**Domain:** Figma Plugin — @create-figma-plugin migration
**Researched:** 2026-03-13
**Confidence:** HIGH (verified against official docs, actual package.json, and existing code.ts which already uses cfp patterns correctly)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Figma Plugin Runtime                           │
│                                                                  │
│  ┌─────────────────────────────┐                                 │
│  │   Plugin Main Thread        │  src/plugin/code.ts             │
│  │   (Figma Sandbox)           │                                 │
│  │                             │                                 │
│  │  export default async () => │  cfp-required: default export   │
│  │    showUI(options)          │  showUI from @cfp/utilities      │
│  │    on<Handler>("EVENT", fn) │  on/once from @cfp/utilities     │
│  │    emit<Handler>("EVENT")   │  emit from @cfp/utilities        │
│  │    figma.* API calls        │  direct Figma API access         │
│  └──────────────┬──────────────┘                                 │
│                 │ emit/on (postMessage bridge)                    │
│  ┌──────────────▼──────────────┐                                 │
│  │   UI Iframe                 │  src/ui/main.tsx                │
│  │   (Preact + @cfp/ui)        │                                 │
│  │                             │                                 │
│  │  export default render(     │  cfp-required: default export   │
│  │    Plugin                   │  render from @cfp/ui            │
│  │  )                          │                                 │
│  │  on<Handler>("EVENT", fn)   │  listen to plugin events        │
│  │  emit<Handler>("EVENT")     │  send to plugin                 │
│  └─────────────────────────────┘                                 │
│                                                                  │
│  ┌─────────────────────────────┐                                 │
│  │   Shared Utilities          │  src/shared/                    │
│  │   (Zero dependencies)       │                                 │
│  │   types.ts, messages.ts     │  EventHandler interfaces        │
│  │   parseText, buildText      │  pure business logic            │
│  │   validateField             │  used by both contexts          │
│  └─────────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | cfp Pattern |
|-----------|---------------|-------------|
| `src/plugin/code.ts` | Figma API, schema persistence, annotation management | `export default async function()` + `showUI` + `on`/`emit` |
| `src/ui/main.tsx` | UI entry point, wraps root component | `export default render(Plugin)` — must be `render()` from `@create-figma-plugin/ui` |
| `src/ui/App.tsx` | Global state, view routing, message handling | Preact component with `on`/`emit` from `@cfp/utilities` |
| `src/ui/components/` | Tab views and form components | Preact functional components, use `@cfp/ui` primitives |
| `src/shared/messages.ts` | Type-safe event contracts | `interface FooHandler extends EventHandler { name: "FOO"; handler: (data) => void }` |
| `src/shared/types.ts` | Domain types shared between plugin and UI | Pure TypeScript, no imports |

## Recommended Project Structure

The current structure is already aligned with cfp expectations. The target state after migration:

```
src/
├── plugin/
│   └── code.ts            # export default async function() — cfp main entry
├── ui/
│   ├── main.tsx           # export default render(Plugin) — cfp UI entry
│   ├── App.tsx            # Preact root (no React imports)
│   ├── components/        # Preact functional components (no React imports)
│   │   ├── OverviewTab.tsx
│   │   ├── SelectedTab.tsx
│   │   ├── SchemaTab.tsx
│   │   ├── SchemaCategory.tsx
│   │   ├── SchemaFieldRow.tsx
│   │   ├── FieldInput.tsx
│   │   ├── OverviewRow.tsx
│   │   ├── AnnotationPreview.tsx
│   │   └── RawTextEditor.tsx
│   └── hooks/
│       ├── useSelection.ts      # already uses preact/hooks
│       └── usePluginMessage.ts  # MISSING — needs to be created
└── shared/
    ├── types.ts           # domain types
    ├── messages.ts        # EventHandler interface definitions
    ├── parseText.ts
    ├── buildText.ts
    └── validateField.ts
```

### Structure Rationale

- **`src/plugin/`:** Single file for the main thread. cfp does not impose sub-structure here; keep flat.
- **`src/ui/`:** `main.tsx` is the mandatory cfp UI entry point using `render()`. Everything else is Preact components.
- **`src/shared/`:** Zero dependencies; both threads can import freely. `messages.ts` is the contract layer.

## Architectural Patterns

### Pattern 1: cfp Default Export Convention

**What:** Both plugin main and UI entry must use cfp-specific default exports. cfp's build system (`build-figma-plugin`) detects and bundles these differently.

**When to use:** Always — this is not optional.

**Trade-offs:** Locks to cfp build system; in return you get esbuild speed and auto-manifest generation.

**Example:**
```typescript
// src/plugin/code.ts — CORRECT cfp pattern
import { showUI, on, emit } from '@create-figma-plugin/utilities'
export default async function () {
  showUI({ width: 360, height: 560 })
  on<UIReadyHandler>('UI_READY', async () => { /* init */ })
}

// src/ui/main.tsx — CORRECT cfp pattern
import { render } from '@create-figma-plugin/ui'
import { h } from 'preact'
export default render(Plugin)
```

The existing `src/plugin/code.ts` already follows this pattern correctly.
The existing `src/ui/main.tsx` already follows this pattern correctly.
The problem is `src/ui/App.tsx` still imports from `react` instead of `preact`.

### Pattern 2: Type-Safe EventHandler Messaging

**What:** All cross-context messages are typed via interfaces extending `EventHandler` from `@create-figma-plugin/utilities`. Both sides share the same interface definition from `src/shared/messages.ts`.

**When to use:** Every message between plugin and UI — never use raw `postMessage`/`onmessage`.

**Trade-offs:** Slightly more boilerplate (one interface per message type) vs full type safety and autocomplete.

**Example:**
```typescript
// src/shared/messages.ts — define contract
import { EventHandler } from '@create-figma-plugin/utilities'

export interface SelectionChangedHandler extends EventHandler {
  name: 'SELECTION_CHANGED'
  handler: (data: { nodeId: string | null; annotations: AnnotationInfo[] }) => void
}

// src/plugin/code.ts — emit from main → UI
emit<SelectionChangedHandler>('SELECTION_CHANGED', { nodeId: node.id, annotations })

// src/ui/App.tsx — listen in UI
on<SelectionChangedHandler>('SELECTION_CHANGED', (data) => {
  setSelectedNodeId(data.nodeId)
})
```

The `name` field on the interface is the string token both sides agree on. TypeScript enforces handler signature at both call sites.

### Pattern 3: UI_READY Handshake

**What:** UI emits `UI_READY` immediately after mounting. Plugin listens via `once<UIReadyHandler>` (or `on`) and only then pushes initial state. Avoids race condition where plugin sends data before the UI iframe is listening.

**When to use:** Any plugin that needs to push data to UI on startup.

**Trade-offs:** Adds one round-trip on startup; necessary for correctness.

**Example:**
```typescript
// Plugin: wait for UI to signal ready before sending data
on<UIReadyHandler>('UI_READY', async () => {
  emit<SchemasLoadedHandler>('SCHEMAS_LOADED', { schemas: loadSchemas() })
  emitSelectionInfo()
})

// UI: signal readiness after component mounts
useEffect(() => {
  emit<UIReadyHandler>('UI_READY')
  return on<SchemasLoadedHandler>('SCHEMAS_LOADED', (data) => {
    setSchemas(data.schemas)
  })
}, [])
```

This is already correctly implemented in `code.ts`. The UI side (`App.tsx`) currently uses a custom `usePluginMessage` hook that wraps the old `postToPlugin` pattern — that hook is missing and needs to be rewritten using cfp's `on`/`emit`.

### Pattern 4: manifest.json Generated from package.json

**What:** Never edit `manifest.json` directly. The `"figma-plugin"` key in `package.json` is the source of truth. `build-figma-plugin` generates `manifest.json` on every build.

**When to use:** Always — cfp overwrites `manifest.json` on build.

**Trade-offs:** Cannot use manifest-only fields that cfp doesn't expose through `package.json` config (rare).

**Example:**
```json
// package.json — edit here
{
  "figma-plugin": {
    "id": "rich-annotation-dev",
    "name": "Rich Annotation",
    "editorType": ["figma", "dev"],
    "capabilities": ["inspect"],
    "documentAccess": "dynamic-page",
    "main": "src/plugin/code.ts",
    "ui": "src/ui/main.tsx"
  }
}
```

The current `package.json` is already configured correctly. The `manifest.json` in the repo root should be treated as build output (gitignored or at least not hand-edited).

## Data Flow

### Initialization Flow

```
Plugin main thread starts
    ↓
export default async function() runs
    ↓
showUI({ width, height }) — opens iframe, renders main.tsx
    ↓
render(Plugin) bootstraps Preact tree in iframe
    ↓
App mounts → useEffect fires
    ↓
emit<UIReadyHandler>('UI_READY') — sent to plugin
    ↓
Plugin on<UIReadyHandler> fires
    ↓
Plugin emits: CATEGORIES_LIST, SCHEMAS_LOADED, ANNOTATIONS_LIST, SELECTION_CHANGED
    ↓
UI on<> handlers update state → re-render
```

### Message Passing Flow (Both Directions)

```
UI user action
    ↓
emit<ApplyAnnotationHandler>('APPLY_ANNOTATION', { nodeId, text, fieldData })
    ↓ (postMessage bridge, managed by @cfp/utilities)
Plugin on<ApplyAnnotationHandler> handler fires
    ↓
figma.getNodeByIdAsync(nodeId)
node.annotations = [...updated]
node.setPluginData(key, JSON.stringify(fieldData))
    ↓
emit<AnnotationAppliedHandler>('ANNOTATION_APPLIED')
emit<SelectionChangedHandler>('SELECTION_CHANGED', freshData)
    ↓
UI on<> handlers update state → re-render
```

### State Management

```
Persistent State (figma.root.setPluginData)
    └── SchemaStore (keyed by "rich-annotation-schemas")
    └── FieldData per node per category (keyed by "rich-annotation-data:{categoryId}")

Session State (plugin memory)
    └── cachedCategories (Figma annotation categories)

UI State (Preact useState)
    └── view: "auto" | "schema"
    └── schemas: SchemaStore
    └── categories: { id, label, color }[]
    └── selectedNodeId, nodeName, nodeType
    └── selectedAnnotations: AnnotationInfo[]
    └── pageAnnotations: AnnotationInfo[]
```

UI never writes to Figma directly. All persistence goes through plugin via message.

## Build Pipeline

### How cfp Build Works

```
npm run build
    ↓
build-figma-plugin --typecheck --minify
    ↓
esbuild bundles src/plugin/code.ts → build/main.js
esbuild bundles src/ui/main.tsx → build/ui.js
    ↓
Generates manifest.json from package.json "figma-plugin" key
    ↓
Output: build/ directory with main.js, ui.js, manifest.json
```

Key build behaviors:
- cfp automatically aliases `react` → `preact/compat` in UI bundle. This is why components can use `import { h } from 'preact'` but must NOT import from `react` directly — that defeats the alias.
- Plugin main bundle excludes DOM APIs. UI bundle is a full browser bundle.
- TypeScript paths (`@shared/*`) must be configured in `tsconfig.json` and cfp respects them.
- The `--typecheck` flag runs `tsc` before bundling — type errors fail the build.

### Build Order Implications

1. `src/shared/` must be type-clean before plugin or UI can build (both import from it).
2. `src/shared/messages.ts` must define all `EventHandler` interfaces before either side can use `emit`/`on` with correct types.
3. UI components can be migrated one at a time — cfp doesn't impose a full-or-nothing approach.
4. `manifest.json` in the project root should be treated as generated output. If it is committed, it will be overwritten on each build.

## Anti-Patterns

### Anti-Pattern 1: Importing from `react` in UI Components

**What people do:** Leave `import React, { useState } from 'react'` (or `import { useState, useCallback } from 'react'`) in component files after switching to cfp.

**Why it's wrong:** cfp's esbuild config aliases `react` → `preact/compat`, but the alias only works if Preact is the JSX factory. Mixing direct React imports with `jsxImportSource: "preact"` causes type mismatches and may load duplicate reconciler code.

**Do this instead:** `import { useState, useCallback } from 'preact/hooks'` for hooks. `import { h } from 'preact'` if needed for JSX (though `jsxImportSource: "preact"` in tsconfig makes the explicit `h` import optional).

The current `src/ui/App.tsx` still has `import React, { useState, useCallback } from "react"` — this is the primary build breakage.

### Anti-Pattern 2: Custom postMessage Instead of cfp emit/on

**What people do:** Write `window.parent.postMessage({ pluginMessage: data }, '*')` or `figma.ui.onmessage` directly.

**Why it's wrong:** Bypasses cfp's type-safe messaging layer. Loses the `EventHandler` generic type checking. Harder to trace message flows.

**Do this instead:** Always use `emit<Handler>('NAME', data)` and `on<Handler>('NAME', handler)` from `@create-figma-plugin/utilities`. The current `App.tsx` uses a `usePluginMessage` / `postToPlugin` abstraction that wraps the old raw message API — this needs to be replaced with cfp's `on`/`emit` directly or a thin wrapper around them.

### Anti-Pattern 3: Editing manifest.json Directly

**What people do:** Add fields to `manifest.json` by hand (e.g., adding `"capabilities"` or adjusting `"editorType"`).

**Why it's wrong:** `build-figma-plugin` overwrites `manifest.json` on every build, discarding manual edits.

**Do this instead:** All manifest configuration belongs in `package.json` under the `"figma-plugin"` key.

### Anti-Pattern 4: UI Entry Not Using `render()`

**What people do:** Call `ReactDOM.render()` or `preact.render()` directly in `main.tsx`.

**Why it's wrong:** cfp's UI bootstrap (`render` from `@create-figma-plugin/ui`) handles the Preact rendering setup correctly, including proper prop passing from `showUI`'s data argument and any cfp-internal setup.

**Do this instead:** `export default render(Plugin)` — the existing `src/ui/main.tsx` already does this correctly.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Plugin main ↔ UI iframe | `emit`/`on` from `@create-figma-plugin/utilities` | Type-safe via `EventHandler` interfaces in `src/shared/messages.ts` |
| UI components ↔ App state | Preact props + callbacks | No global state library needed at this scale |
| Plugin ↔ Figma document | `figma.*` API calls | Synchronous and async; only available in plugin main thread |
| Shared utilities ↔ both | Direct TypeScript imports | Zero-dependency; safe to import from either thread |

### Current State vs Target State

| Area | Current State | Target State | Gap |
|------|--------------|-------------|-----|
| `code.ts` main entry | Correct: `export default async function()` + cfp `emit`/`on` | Same | No change needed |
| `main.tsx` UI entry | Correct: `export default render(Plugin)` | Same | No change needed |
| `App.tsx` | Broken: `import React from 'react'` | `import { useState } from 'preact/hooks'` | PRIMARY FIX |
| `messages.ts` | Correct: `EventHandler` interfaces | Same | No change needed |
| `usePluginMessage.ts` | MISSING file | Hook using cfp `on`/`emit` | Must create |
| `PluginMessage` type | MISSING (referenced in App.tsx) | Remove or replace with per-event `on` calls | Must resolve |
| UI components | Unknown — may still have React imports | All `preact/hooks`, `@cfp/ui` primitives | Audit each file |
| `tsconfig.json` | Has `jsxImportSource: "preact"` | Same | No change needed |
| `package.json` | Has correct `figma-plugin` key | Same | No change needed |

## Sources

- [Create Figma Plugin — Official Docs](https://yuanqing.github.io/create-figma-plugin/)
- [Create Figma Plugin — UI / render() function](https://yuanqing.github.io/create-figma-plugin/ui/)
- [Create Figma Plugin — Configuration (package.json key)](https://yuanqing.github.io/create-figma-plugin/configuration/)
- [Create Figma Plugin — Recipes](https://yuanqing.github.io/create-figma-plugin/recipes/)
- [Create Figma Plugin — Utilities (emit/on/once)](https://yuanqing.github.io/create-figma-plugin/utilities/)
- Verified against: `src/plugin/code.ts` (already uses cfp patterns), `src/ui/main.tsx` (correct render() usage), `src/shared/messages.ts` (correct EventHandler interfaces), `package.json` (correct figma-plugin configuration)

---
*Architecture research for: @create-figma-plugin migration — Rich Annotation Figma Plugin*
*Researched: 2026-03-13*
