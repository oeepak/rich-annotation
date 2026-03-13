# Phase 1: Build Recovery - Research

**Researched:** 2026-03-13
**Domain:** @create-figma-plugin v4 (Preact) — broken build recovery
**Confidence:** HIGH (all findings verified from source files, git history, and live build output)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUILD-01 | tsconfig.json JSX config compatible with cfp esbuild | tsconfig currently has `"jsx": "react-jsx"` + `"jsxImportSource": "preact"` — must change to `"jsx": "react"` + `"jsxFactory": "h"` (verified against cfp build source: esbuild hardcodes `jsxFactory: 'h'`) |
| BUILD-02 | Remove React imports from all UI files; use preact/hooks + `import { h } from 'preact'` | 9 files confirmed with `import React from "react"` (or `import React, {...} from "react"`); exact list documented below |
| BUILD-03 | Rebuild usePluginMessage hook using cfp emit/on pattern | File missing entirely; old version used `window.addEventListener` + `parent.postMessage` — incompatible with cfp's typed message envelope |
| BUILD-04 | Remove PluginMessage union type; unify on EventHandler pattern | `messages.ts` already uses EventHandler correctly; `App.tsx` imports `PluginMessage` which doesn't exist — fix by rewriting App.tsx message handling to use `on<Handler>` calls |
| BUILD-05 | `npm run build` succeeds with zero errors | Currently 40+ errors; all root causes catalogued with exact file+line |
</phase_requirements>

---

## Summary

The plugin is in a broken WIP state since commit 5fd2686. The build fails with 40+ TypeScript errors because UI components were reverted to React imports mid-migration, the `usePluginMessage.ts` hook file was deleted, and `App.tsx` imports a `PluginMessage` type that no longer exists in `messages.ts`. These three root causes account for all current build errors.

The fix is mechanical and well-scoped. Every broken file is known, every error type is categorised, and the target state is precisely defined. The cfp stack is already installed and working (`code.ts`, `main.tsx`, `messages.ts`, `useSelection.ts` are all correct). The recovery is about fixing the UI component layer only.

The tsconfig change is required but carries a risk: `"moduleResolution": "bundler"` must change to `"Node"` to match cfp expectations, and the vitest config must be verified to still work afterward. The two pipelines (cfp build and vitest) are completely separate and use independent JSX resolution.

**Primary recommendation:** Fix in dependency order — tsconfig first, then create `usePluginMessage.ts` with cfp pattern, then rewrite `App.tsx`, then sweep all components for React imports and `schema.required` references. Verify build after each file change.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @create-figma-plugin/build | 4.0.3 | Build system (esbuild-based) | Generates `build/main.js`, `build/ui.js`, `manifest.json`; entry via `build-figma-plugin --typecheck --minify` |
| @create-figma-plugin/utilities | 4.0.3 | `emit`/`on`/`showUI` | Type-safe messaging between plugin and UI; both contexts use the same import |
| @create-figma-plugin/ui | 4.0.3 | `render()` + Preact UI components | `render()` is the mandatory cfp UI entry point |
| preact | 10.29.0 | JSX runtime + hooks | `import { h } from 'preact'`; `import { useState, useEffect, useCallback, useRef } from 'preact/hooks'` |
| typescript | 5.9.3 | Type checking | cfp build runs `tsc` via `--typecheck` before bundling |

**Installation:** None required. Verify with:
```bash
npm ls @create-figma-plugin/build @create-figma-plugin/ui @create-figma-plugin/utilities preact
```

---

## Architecture Patterns

### Recommended Project Structure (target after Phase 1)

```
src/
├── plugin/
│   └── code.ts                  # CORRECT already — export default async function()
├── ui/
│   ├── main.tsx                 # CORRECT already — export default render(Plugin)
│   ├── App.tsx                  # BROKEN — must rewrite message handling
│   ├── components/              # 8 files with React imports to fix
│   │   ├── AnnotationPreview.tsx  # BROKEN — React import
│   │   ├── FieldInput.tsx         # BROKEN — React import + schema.required + e.target
│   │   ├── OverviewRow.tsx        # BROKEN — React import + missing hook import
│   │   ├── OverviewTab.tsx        # BROKEN — React import + missing hook import + e.target
│   │   ├── SchemaCategory.tsx     # BROKEN — React import
│   │   ├── SchemaFieldRow.tsx     # BROKEN — React import + e.target
│   │   ├── SchemaTab.tsx          # BROKEN — React import + missing hook + e.target
│   │   ├── SelectedTab.tsx        # BROKEN — React import + missing hook + e.target
│   │   └── RawTextEditor.tsx      # CORRECT already
│   └── hooks/
│       ├── useSelection.ts        # CORRECT already — uses preact/hooks
│       └── usePluginMessage.ts    # MISSING — must create with cfp pattern
└── shared/
    ├── messages.ts              # CORRECT already — EventHandler interfaces only
    ├── types.ts                 # CORRECT already
    ├── parseText.ts             # Untouched
    ├── buildText.ts             # Untouched
    └── validateField.ts         # Untouched
```

### Pattern 1: tsconfig.json for cfp

**What:** cfp's esbuild hardcodes `jsxFactory: 'h'` and `jsxFragment: 'Fragment'`. This means TypeScript must emit classic JSX transform (`h(...)` calls), not the automatic runtime (`jsx-runtime`) transform.

**Required tsconfig:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "Node",
    "jsx": "react",
    "jsxFactory": "h",
    "lib": ["DOM", "ES2020"],
    "outDir": "build",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"],
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"]
}
```

**Changes from current:**
- `"jsx": "react-jsx"` → `"jsx": "react"`
- Remove `"jsxImportSource": "preact"`
- Add `"jsxFactory": "h"`
- `"module": "ESNext"` → `"module": "ES2020"`
- `"moduleResolution": "bundler"` → `"moduleResolution": "Node"`
- Add `"esModuleInterop": true`, `"isolatedModules": true`

**Vitest impact:** vitest.config.ts uses its own esbuild transform pipeline independent of tsconfig. The `@shared/*` path alias must remain in vitest.config.ts (it already is). After tsconfig change, run `npm run test` to confirm tests still pass.

### Pattern 2: Preact import pattern for every .tsx file

Every `.tsx` file that uses JSX must have:
```tsx
import { h } from 'preact'
// For hooks:
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
```

Files that currently only render JSX (no hooks) need only `import { h } from 'preact'`. The `h` import is required because `jsxFactory: 'h'` causes TypeScript to emit `h(...)` calls that reference the local `h` binding.

### Pattern 3: usePluginMessage hook (cfp pattern)

The old hook (from git 9d22d57) used `window.addEventListener("message", ...)` and `parent.postMessage(...)` — the raw Figma API. This is incompatible with cfp's `emit<Handler>` format (cfp wraps postMessage with its own envelope).

The new hook must use cfp `on<Handler>`:

```typescript
// src/ui/hooks/usePluginMessage.ts
import { on, emit } from '@create-figma-plugin/utilities'
import { useEffect } from 'preact/hooks'
import type {
  SelectionChangedHandler,
  SchemasLoadedHandler,
  AnnotationsListHandler,
  CategoriesListHandler,
  AnnotationAppliedHandler,
  AnnotationDeletedHandler,
} from '@shared/messages'

type MessageHandler = {
  onSelectionChanged?: (data: Parameters<SelectionChangedHandler['handler']>[0]) => void
  onSchemasLoaded?: (data: Parameters<SchemasLoadedHandler['handler']>[0]) => void
  onAnnotationsList?: (data: Parameters<AnnotationsListHandler['handler']>[0]) => void
  onCategoriesList?: (data: Parameters<CategoriesListHandler['handler']>[0]) => void
  onAnnotationApplied?: () => void
  onAnnotationDeleted?: () => void
}

export function usePluginMessage(handlers: MessageHandler): void {
  useEffect(() => {
    const deregisters: Array<() => void> = []
    if (handlers.onSelectionChanged) {
      deregisters.push(on<SelectionChangedHandler>('SELECTION_CHANGED', handlers.onSelectionChanged))
    }
    if (handlers.onSchemasLoaded) {
      deregisters.push(on<SchemasLoadedHandler>('SCHEMAS_LOADED', handlers.onSchemasLoaded))
    }
    if (handlers.onAnnotationsList) {
      deregisters.push(on<AnnotationsListHandler>('ANNOTATIONS_LIST', handlers.onAnnotationsList))
    }
    if (handlers.onCategoriesList) {
      deregisters.push(on<CategoriesListHandler>('CATEGORIES_LIST', handlers.onCategoriesList))
    }
    if (handlers.onAnnotationApplied) {
      deregisters.push(on<AnnotationAppliedHandler>('ANNOTATION_APPLIED', handlers.onAnnotationApplied))
    }
    if (handlers.onAnnotationDeleted) {
      deregisters.push(on<AnnotationDeletedHandler>('ANNOTATION_DELETED', handlers.onAnnotationDeleted))
    }
    return () => deregisters.forEach(off => off())
  }, [])
}

export function postToPlugin<H extends { name: string; handler: (...args: any[]) => void }>(
  _handler: { new(): H },
  ...args: Parameters<H['handler']>
): void {
  // This function is not the right approach in cfp.
  // Callers should use emit<Handler>() directly.
  // Kept as stub to ease migration — remove in Phase 2.
}
```

**Simpler alternative:** Rather than a generic hook, `App.tsx` can directly call `on<Handler>` in its own `useEffect`. This is the pattern recommended by cfp docs and used in the official `preact-rectangles` template. The hook abstraction is optional.

### Pattern 4: App.tsx message handling rewrite

The current `App.tsx` has:
- `import React, { useState, useCallback } from "react"` — wrong
- `import { usePluginMessage, postToPlugin } from "./hooks/usePluginMessage"` — missing file
- `import type { PluginMessage } from "@shared/messages"` — type doesn't exist
- `handleMessage(msg: PluginMessage)` with `switch(msg.type)` — old pattern

Target pattern (direct `on<Handler>` calls):
```tsx
import { h } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { on, emit } from '@create-figma-plugin/utilities'
import type {
  SelectionChangedHandler,
  SchemasLoadedHandler,
  AnnotationsListHandler,
  CategoriesListHandler,
  AnnotationAppliedHandler,
  AnnotationDeletedHandler,
  GetAnnotationsHandler,
  GetSchemasHandler,
  GetCategoriesHandler,
  UIReadyHandler,
} from '@shared/messages'

export function App() {
  // ... same state declarations ...

  useEffect(() => {
    emit<UIReadyHandler>('UI_READY')

    const offs = [
      on<SelectionChangedHandler>('SELECTION_CHANGED', (data) => {
        setSelectedNodeId(data.nodeId)
        setSelectedNodeName(data.nodeName)
        setSelectedNodeType(data.nodeType)
        setSelectedAnnotations(data.annotations)
        setView('auto')
        emit<GetAnnotationsHandler>('GET_ANNOTATIONS')
      }),
      on<SchemasLoadedHandler>('SCHEMAS_LOADED', (data) => {
        setSchemas(data.schemas)
      }),
      on<AnnotationsListHandler>('ANNOTATIONS_LIST', (data) => {
        setPageAnnotations(data.annotations)
      }),
      on<CategoriesListHandler>('CATEGORIES_LIST', (data) => {
        setCategories(data.categories)
      }),
      on<AnnotationAppliedHandler>('ANNOTATION_APPLIED', () => {
        emit<GetAnnotationsHandler>('GET_ANNOTATIONS')
      }),
      on<AnnotationDeletedHandler>('ANNOTATION_DELETED', () => {
        emit<GetAnnotationsHandler>('GET_ANNOTATIONS')
      }),
    ]
    return () => offs.forEach(off => off())
  }, [])

  const goToSchema = () => {
    emit<GetSchemasHandler>('GET_SCHEMAS')
    emit<GetCategoriesHandler>('GET_CATEGORIES')
    setView('schema')
  }
  // ...
}
```

Note: `emit<UIReadyHandler>('UI_READY')` belongs in `App.tsx`'s `useEffect`, not in `main.tsx`. The plugin's `code.ts` already listens with `on<UIReadyHandler>('UI_READY', ...)` and pushes initial state in response.

### Pattern 5: Fixing e.target type errors in components

The TS18047/TS2339 errors on `e.target.value` occur because Preact's JSX event types don't automatically narrow `event.target`. Two approaches:

**Option A — Cast (minimal change, keeps native elements):**
```tsx
onChange={(e) => onChange((e.target as HTMLInputElement).value)}
// or
onChange={(e) => onChange((e.currentTarget as HTMLSelectElement).value)}
```

**Option B — Use cfp UI components (correct for Phase 2, acceptable for Phase 1 if time allows):**
```tsx
// cfp Textbox uses onValueInput which receives string directly
<Textbox value={value} onValueInput={onChange} />
```

For Phase 1, Option A is the minimum viable fix. Phase 2 will replace native elements with cfp components anyway.

### Anti-Patterns to Avoid

- **`import React from "react"` in any `src/ui/` file:** TypeScript fails because `react` package is not installed.
- **`window.addEventListener("message", ...)` in usePluginMessage:** Bypasses cfp's message envelope; messages from `emit<Handler>()` will be received with the wrong shape.
- **`parent.postMessage(...)` for UI→plugin messages:** Same issue in reverse.
- **Importing `PluginMessage` from `@shared/messages`:** This type is not exported and not needed in cfp pattern.
- **`schema.required` in FieldInput.tsx:** Property was intentionally removed from `FieldSchema`; causes 4 TS2339 errors.
- **Editing `manifest.json` directly:** Overwritten on every build.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin↔UI message typing | Custom tagged union + window.postMessage | `emit<Handler>` / `on<Handler>` from `@create-figma-plugin/utilities` | cfp's envelope format is not public; raw postMessage bypasses the abstraction layer |
| UI mount point | Manual `createRoot(...)` or `ReactDOM.render(...)` | `render(Plugin)` from `@create-figma-plugin/ui` | cfp's render handles Figma-specific bootstrapping |
| JSX runtime | `jsxImportSource` automatic import | Explicit `import { h } from 'preact'` per file | cfp esbuild uses classic transform; automatic import source conflicts |
| on() cleanup | Manual ref tracking or flag | Return value of `on()` — call it in useEffect cleanup | `on()` returns a deregistration function by design |

---

## Common Pitfalls

### Pitfall 1: tsconfig change breaks vitest (moduleResolution)

**What goes wrong:** Changing `moduleResolution` from `"bundler"` to `"Node"` may affect how vitest resolves imports if it respects tsconfig. In practice vitest uses its own esbuild and the `@shared/*` alias from `vitest.config.ts` — but it's important to verify.

**How to avoid:** After changing tsconfig, run `npm run test` immediately. If tests fail with path resolution errors, check that `vitest.config.ts` has the `@shared` alias (it does — verified).

**Warning sign:** Tests fail with `Cannot find module '@shared/...'` after tsconfig change.

### Pitfall 2: Forgetting `import { h } from 'preact'` in a .tsx file

**What goes wrong:** After tsconfig change to `"jsx": "react"` + `"jsxFactory": "h"`, TypeScript emits `h(...)` calls. If `h` is not imported, runtime error: `h is not defined`.

**How to avoid:** Every `.tsx` file that contains JSX syntax must have `import { h } from 'preact'`. Files that use Fragment must add `Fragment` to the import.

**Grep to verify:** `grep -r 'from "react"' src/ui/` must return empty after all fixes.

### Pitfall 3: `on<Handler>` registered without cleanup

**What goes wrong:** `on<Handler>('EVENT', handler)` in a component without cleanup causes multiple handlers to fire after component remounts (each mount adds a new listener; previous ones are not removed).

**How to avoid:** Always return the deregistration function from `useEffect`:
```tsx
useEffect(() => {
  return on<SomeHandler>('SOME_EVENT', handler)
}, [])
```

### Pitfall 4: `emit<UIReadyHandler>('UI_READY')` omitted in App.tsx

**What goes wrong:** Plugin `code.ts` waits for `UI_READY` before sending `SCHEMAS_LOADED`, `CATEGORIES_LIST`, `ANNOTATIONS_LIST`, `SELECTION_CHANGED`. If `UI_READY` is never emitted, the UI shows empty state permanently with no error.

**How to avoid:** `App.tsx` must emit `UI_READY` in its mount effect (the same `useEffect` that registers all listeners, so listeners are set up before the plugin responds).

### Pitfall 5: OverviewRow test expects `onNavigate` prop that doesn't exist

**What goes wrong:** `tests/ui/OverviewRow.test.tsx` passes `onNavigate={vi.fn()}` but current `OverviewRow` component has no `onNavigate` prop in its interface (only `onEdit`). This causes TS2322 errors in the test file — visible in current build output.

**How to avoid:** Either add `onNavigate` to `OverviewRowProps` (if the test represents intended future behavior) or remove `onNavigate` from the test fixtures. Since CONCERNS.md mentions this and the current component clearly has no navigate prop, the test file needs alignment. Phase 1 scope: fix the TS error by removing `onNavigate` from test fixtures, keeping the current component interface unchanged.

---

## Code Examples

### Correct import header for every .tsx component
```tsx
// Source: verified against src/ui/hooks/useSelection.ts (already correct)
import { h } from 'preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
// (add only hooks actually used)
```

### postToPlugin replacement pattern
```tsx
// OLD (broken):
postToPlugin({ type: "GET_ANNOTATIONS" })

// NEW (cfp):
import { emit } from '@create-figma-plugin/utilities'
import type { GetAnnotationsHandler } from '@shared/messages'
emit<GetAnnotationsHandler>('GET_ANNOTATIONS')
```

### on() with cleanup
```tsx
// Source: cfp official docs + preact-rectangles template
useEffect(() => {
  return on<SomHandler>('SOME_EVENT', (data) => {
    setState(data.value)
  })
}, [])
```

### e.target cast (minimal fix for Phase 1)
```tsx
// OLD (broken — TS18047 + TS2339):
onChange={(e) => onChange(e.target.value)}

// FIX (minimal cast):
onChange={(e) => onChange((e.target as HTMLInputElement).value)}
```

---

## File-by-File Change Map

Complete list of files to modify and exactly what to change:

| File | Changes Required |
|------|-----------------|
| `tsconfig.json` | `"jsx": "react"`, add `"jsxFactory": "h"`, remove `"jsxImportSource"`, `"module": "ES2020"`, `"moduleResolution": "Node"`, add `"esModuleInterop": true`, `"isolatedModules": true` |
| `src/ui/hooks/usePluginMessage.ts` | CREATE — implement with `on<Handler>` from cfp utilities, `useEffect` from `preact/hooks` |
| `src/ui/App.tsx` | Replace React import with `{ h }` from preact + hooks from preact/hooks; rewrite `usePluginMessage(handleMessage)` to direct `on<Handler>` calls in `useEffect`; replace `postToPlugin({type: X})` with `emit<XHandler>('X')` |
| `src/ui/components/AnnotationPreview.tsx` | Replace `import React from "react"` with `import { h } from 'preact'` |
| `src/ui/components/FieldInput.tsx` | Replace React import; add `import { h } from 'preact'`; remove all `schema.required` references (4 occurrences); cast `e.target` as `HTMLInputElement` or `HTMLSelectElement` (3 occurrences) |
| `src/ui/components/OverviewRow.tsx` | Replace React import; add `import { h } from 'preact'`; replace `postToPlugin` import with direct `emit<Handler>` |
| `src/ui/components/OverviewTab.tsx` | Replace React import + hooks; add preact equivalents; replace `postToPlugin` import; cast `e.target` (2 occurrences) |
| `src/ui/components/SchemaCategory.tsx` | Replace `import React from "react"` with `import { h } from 'preact'` |
| `src/ui/components/SchemaFieldRow.tsx` | Replace `import React from "react"` with `import { h } from 'preact'`; cast `e.target`; fix `(s) => s.trim()` implicit any |
| `src/ui/components/SchemaTab.tsx` | Replace React import + hooks; add preact equivalents; replace `postToPlugin` import; cast `e.target`; add type annotation for `prev` in `setDraft` |
| `src/ui/components/SelectedTab.tsx` | Replace React import + hooks; add preact equivalents; replace `postToPlugin` import; cast `e.target` |
| `tests/ui/OverviewRow.test.tsx` | Remove `onNavigate` prop from all test render calls (6–7 occurrences) — TS2322 because prop doesn't exist in component |

**Files NOT to touch in Phase 1:**
- `src/ui/main.tsx` — already correct
- `src/plugin/code.ts` — already correct
- `src/shared/messages.ts` — already correct (EventHandler interfaces only)
- `src/shared/types.ts` — already correct
- `src/ui/hooks/useSelection.ts` — already correct (uses preact/hooks)
- `src/ui/components/RawTextEditor.tsx` — already correct

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `window.addEventListener("message")` + `parent.postMessage` | `on<Handler>` / `emit<Handler>` from `@create-figma-plugin/utilities` | Type safety; envelope managed by cfp |
| `import React, { useState } from "react"` | `import { h } from 'preact'` + `import { useState } from 'preact/hooks'` | React package not installed; cfp requires Preact |
| `"jsx": "react-jsx"` + `"jsxImportSource": "preact"` | `"jsx": "react"` + `"jsxFactory": "h"` | cfp esbuild uses classic transform; automatic source incompatible |
| Discriminated union `PluginMessage` with `switch(msg.type)` | Individual `on<SpecificHandler>()` subscriptions | Per-event type safety; no union needed |

---

## Open Questions

1. **Should `usePluginMessage` hook be kept or replaced with direct `on` calls in `App.tsx`?**
   - What we know: cfp recommends direct `on<Handler>` calls; the official template does not use a wrapper hook
   - What's unclear: Whether other components (OverviewTab, SchemaTab, SelectedTab) also call `usePluginMessage` or only `postToPlugin`
   - Recommendation: From the grep output, only `App.tsx` calls `usePluginMessage(handler)`. Others only import `postToPlugin`. Rewrite `App.tsx` with direct `on` calls and create `usePluginMessage.ts` only as an `emit`-based `postToPlugin` replacement for the other components.

2. **OverviewRow.test.tsx `onNavigate` discrepancy — add prop or remove from tests?**
   - What we know: Current `OverviewRow` has no `onNavigate` prop; tests pass it; the recent commit that "removed tabs, use context-driven view switching" likely removed navigate-to-node behavior
   - What's unclear: Whether navigate-to-node was intentionally removed or accidentally dropped
   - Recommendation: Phase 1 fix — remove `onNavigate` from test fixtures to unblock the build. Revisit in Phase 2 if navigate behavior is needed.

3. **Does `"moduleResolution": "Node"` break any path resolution that `"bundler"` was enabling?**
   - What we know: vitest has its own `@shared` alias; cfp build uses its own esbuild and doesn't use tsconfig moduleResolution for bundling
   - What's unclear: Whether any import in `src/` relies on `bundler`-specific resolution (e.g., extensionless imports of `.ts` files)
   - Recommendation: Make the change and run both `npm run build` and `npm run test`; rollback only if specific errors appear.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` (exists, configured) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | tsconfig change does not break vitest test pipeline | smoke | `npm run test -- --run` | ✅ (existing tests serve as regression) |
| BUILD-02 | No React imports in `src/ui/` | lint/grep | `grep -r 'from "react"' src/ui/` returns empty | N/A (shell check) |
| BUILD-03 | usePluginMessage uses cfp on/emit, not window.addEventListener | unit | `grep -r 'addEventListener' src/ui/hooks/usePluginMessage.ts` returns empty | ❌ Wave 0 |
| BUILD-04 | PluginMessage type not imported anywhere | lint/grep | `grep -r 'PluginMessage' src/ui/` returns empty | N/A (shell check) |
| BUILD-05 | Build succeeds | build | `npm run build` exits 0 | N/A (build check) |

### Sampling Rate

- **Per task commit:** `npm run build` — must exit 0 before committing any file
- **Per wave merge:** `npm run build && npm run test -- --run`
- **Phase gate:** Both commands green before moving to Phase 2

### Wave 0 Gaps

- [ ] `src/ui/hooks/usePluginMessage.ts` — file must be created (Wave 0 task) before any component can be fixed (they all import from it)

*(Existing test infrastructure in `tests/` covers the shared utility layer and is unaffected by Phase 1 changes.)*

---

## Sources

### Primary (HIGH confidence)
- Live `npm run build` output — exact error list with file + line numbers (direct evidence)
- `src/ui/App.tsx` (current) — confirmed React imports, PluginMessage usage, postToPlugin pattern
- `src/ui/components/*.tsx` import headers — all 9 components audited via grep
- `tsconfig.json` (current) — confirmed `react-jsx` + `jsxImportSource: preact`
- `src/shared/messages.ts` — confirmed EventHandler-only exports, no PluginMessage union
- `src/ui/hooks/useSelection.ts` — confirmed already correct (preact/hooks)
- `src/ui/main.tsx` — confirmed already correct (render() from cfp)
- `git show 9d22d57:src/ui/hooks/usePluginMessage.ts` — old hook used raw window.addEventListener + parent.postMessage
- `.planning/research/STACK.md` — cfp esbuild jsxFactory verification, import patterns (HIGH)
- `.planning/research/ARCHITECTURE.md` — current vs target state table, messaging patterns (HIGH)
- `.planning/research/PITFALLS.md` — root cause analysis, recovery strategies (HIGH)
- `.planning/codebase/CONCERNS.md` — exact file + line inventory of all known errors (HIGH)

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md` — data flow and initialization sequence
- `.planning/STATE.md` — locked decisions from pre-Phase 1 analysis

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed node_modules and cfp source
- Architecture: HIGH — verified from live build output and file-by-file code audit
- Pitfalls: HIGH — derived from actual TypeScript error messages in current broken build
- tsconfig target values: HIGH — cross-verified against cfp repository defaults and STACK.md

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (cfp v4 is stable; no breaking changes expected in 30 days)
