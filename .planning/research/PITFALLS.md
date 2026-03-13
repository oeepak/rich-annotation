# Pitfalls Research

**Domain:** React → @create-figma-plugin (Preact) migration for a Figma plugin
**Researched:** 2026-03-13
**Confidence:** HIGH (directly derived from codebase evidence + cfp official docs + broken-build forensics)

---

## Critical Pitfalls

### Pitfall 1: Mixing Two Incompatible Messaging Systems

**What goes wrong:**
The UI code uses raw `window.addEventListener("message", ...)` + `parent.postMessage(...)` (React-era pattern), while the plugin code uses cfp's typed `emit<Handler>()` / `on<Handler>()` (cfp pattern). The two systems are mutually incompatible: cfp's `emit` wraps postMessage with a specific envelope format; the React-era listener does not unwrap it. Messages are silently lost.

**Why it happens:**
The migration proceeds component-by-component. `src/plugin/code.ts` was migrated first and fully adopts `emit`/`on`. The UI hook `usePluginMessage.ts` was written before cfp, used raw `postMessage`. When the hook went missing (lost in commit 5fd2686), it was not recreated with cfp's `on`/`emit` — it was recreated with the old React pattern. The two halves now speak different protocols.

**How to avoid:**
When restoring `usePluginMessage.ts`, implement it using `on<Handler>` from `@create-figma-plugin/utilities` — not `window.addEventListener`. Conversely, stop calling `parent.postMessage` directly from the UI; use `emit<Handler>` for UI → plugin messages. The cfp hook pattern looks like:

```typescript
// ui/hooks/usePluginMessage.ts (cfp pattern)
import { on, emit } from "@create-figma-plugin/utilities";
import { useEffect } from "preact/hooks";
import type { SelectionChangedHandler, ... } from "@shared/messages";

export function usePluginMessage(handler: ...) {
  useEffect(() => {
    const off = on<SelectionChangedHandler>("SELECTION_CHANGED", handler);
    return off; // deregister on unmount
  }, []);
}
```

**Warning signs:**
- Plugin code has `emit<SomeHandler>(...)` but UI has `window.addEventListener("message", ...)`
- `usePluginMessage.ts` imports `React.useRef` / `React.useEffect` rather than `preact/hooks`
- Messages sent from plugin never trigger UI state updates (silent failure, no console error)

**Phase to address:**
Phase 1 — Restore build integrity. This is the first thing to fix; nothing else can be tested until messaging works end-to-end.

---

### Pitfall 2: `import React from "react"` After JSX Pragma is Set to Preact

**What goes wrong:**
`tsconfig.json` sets `"jsxImportSource": "preact"`, which makes the TypeScript compiler emit `import { jsx } from "preact/jsx-runtime"` for all JSX. But if a component still has `import React from "react"` at the top, TypeScript resolves the `React` symbol from the node_modules React package (which is not installed). The build fails with TS2307 or runtime errors about React being undefined.

This is precisely what broke commit 5fd2686: components were accidentally reverted to React imports while the JSX runtime was already pointed at Preact.

**Why it happens:**
IDE auto-import suggests `React` when you type `useState` — because React and Preact both export `useState`. Developers accept the suggestion without noticing it is importing from `"react"` not `"preact/hooks"`.

**How to avoid:**
- Replace every `import React, { ... } from "react"` with `import { ... } from "preact/hooks"` (for hooks) and `import { h } from "preact"` (if `h` is needed explicitly).
- When cfp's render function wraps the tree, explicit `h` import is only needed if you use `h(...)` directly. JSX is handled automatically by `jsxImportSource`.
- Add an ESLint rule or a pre-commit grep to catch `from "react"` imports in `src/ui/`.

**Warning signs:**
- Build error: `Cannot find module 'react'` or `TS2307: Cannot find module 'react'`
- Component file has both `import { h } from "preact"` AND `import React from "react"`
- `useState`, `useEffect`, `useCallback`, `useRef` imported from `"react"` instead of `"preact/hooks"`

**Phase to address:**
Phase 1 — Restore build integrity. Must be the first sweep before any new work.

---

### Pitfall 3: Exporting a Named Function Instead of `export default render(Plugin)`

**What goes wrong:**
cfp's build system (`build-figma-plugin`) requires the UI entry file (`src/ui/main.tsx`, as specified in `package.json` `figma-plugin.ui`) to have a **default export** that is the result of calling `render(Plugin)` from `@create-figma-plugin/ui`. If the entry exports a named component (`export function App()`) or calls `createRoot(...)` manually, cfp's build pipeline does not inject the required boilerplate and the plugin UI fails to mount.

The current `src/ui/main.tsx` correctly does `export default render(Plugin)`. The danger is a developer changing this to match the old React pattern during a "partial revert."

**Why it happens:**
The React-era entry point (`createRoot(document.getElementById("root")!).render(<App />)`) is familiar and explicit. cfp's `render()` is a black box to React developers — they may replace it thinking it is equivalent.

**How to avoid:**
`src/ui/main.tsx` must always look like:
```typescript
import { render } from "@create-figma-plugin/ui";
import { h } from "preact";
import { App } from "./App";
function Plugin() { return <App />; }
export default render(Plugin);
```
Do not call `createRoot`, `ReactDOM.render`, or manually mount to a DOM element.

**Warning signs:**
- `src/ui/main.tsx` imports from `"react-dom/client"` or `"react-dom"`
- Plugin opens but UI is a blank white panel
- No TypeScript error but plugin UI never renders

**Phase to address:**
Phase 1 — Restore build integrity. Verify the entry point pattern before running the build.

---

### Pitfall 4: Two Incompatible Message Schema Formats Living Simultaneously

**What goes wrong:**
The codebase currently has two contradictory message schema designs:

- `src/plugin/code.ts` (current, working) imports typed handler interfaces (`SelectionChangedHandler`, etc.) from `@shared/messages` and uses cfp's `emit<Handler>` / `on<Handler>`.
- `src/ui/App.tsx` (broken) imports a discriminated union `PluginMessage` / `UIMessage` (React-era flat types) and switches on `msg.type`.

These are structurally different. cfp handlers pass structured data objects as function arguments (`handler: (data: {...}) => void`). The React-era pattern passes a tagged union as a single object (`{ type: "X", ...payload }`). A component written for one format crashes silently when fed messages from the other.

**Why it happens:**
The plugin code was migrated to cfp handlers. The UI components were reverted. The `src/shared/messages.ts` file now exports cfp-style `EventHandler` interfaces (the current version), but `App.tsx` was reverted to expect the old union types — and the file it imports (`PluginMessage` from `@shared/messages`) no longer exists in that shape.

**How to avoid:**
Pick one schema and migrate all consumers at once. The cfp `EventHandler` interface pattern is the correct approach since `code.ts` already uses it. Rewrite `App.tsx` message handling to use `on<Handler>` subscriptions, not a single `switch(msg.type)` dispatcher. Do not export `PluginMessage` / `UIMessage` union types — they are the old pattern.

**Warning signs:**
- `src/shared/messages.ts` exports both `EventHandler` interfaces AND `UIMessage`/`PluginMessage` union types
- `App.tsx` imports `PluginMessage` and uses `switch (msg.type)`
- TypeScript error TS2305: `Module has no exported member 'PluginMessage'`

**Phase to address:**
Phase 1 — Restore build integrity. Resolve schema format before touching any component.

---

### Pitfall 5: Partial Migration Commits Breaking the Build for Extended Periods

**What goes wrong:**
Migrating component-by-component while committing incomplete work means the build is broken between commits. The current state (commit 5fd2686, "WIP: partial cfp/preact migration — broken state") is evidence: the plugin has been unrunnable since this commit was created.

A broken build means:
- No way to manually test any change
- Tests that depend on the build (integration, component) cannot run
- Risk of introducing new bugs on top of a broken foundation

**Why it happens:**
The migration is naturally incremental — each component must be updated. Developers commit at logical stopping points (end of session, switching tasks) even if incomplete. React components that were partially updated get reverted to be "safe," creating the churn that produced commit 5fd2686.

**How to avoid:**
Use a "strangler fig" migration strategy:
1. Keep the old working build runnable on a separate branch or stash.
2. For each component: update → build → test → commit. Never commit a component that does not compile.
3. Restore the missing file (`usePluginMessage.ts`) and fix the schema format mismatch first, before touching any component — these are the load-bearing foundations.
4. If you must commit an incomplete state, use a feature branch and only merge when the build is green.

**Warning signs:**
- Commit message contains "WIP" or "broken"
- `npm run build` fails with more than 0 TypeScript errors
- Git history shows a `schema.required` reference being removed then re-appearing

**Phase to address:**
Phase 1 — Restore build integrity. The entire phase exists to address this pitfall.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `usePluginMessage.ts` using raw `window.addEventListener` instead of cfp `on<Handler>` | Faster to restore the missing file | Silent message loss when cfp emit format changes; two messaging systems to maintain | Never — cfp emit is already used in code.ts |
| Export `PluginMessage` union type alongside cfp `EventHandler` interfaces | Satisfies both `App.tsx` and `code.ts` simultaneously | Ambiguity about which pattern is authoritative; divergence guaranteed over time | Never — pick one and migrate fully |
| Inline `{ id: string; label: string; color: string }` category type in each file | Fast to write | 5 files must be updated when the type changes (already causes maintenance issues) | MVP only — extract to `AnnotationCategory` type in Phase 1 |
| Leave `schema.required` references in `FieldInput.tsx` after removing the property | Avoids TypeScript refactor | TS2339 errors block the build; misleading UI shows asterisks for non-existent field attribute | Never — the property was intentionally removed |
| Use `parent.postMessage` directly from UI components | Familiar React-era pattern | Bypasses cfp's typed message envelope; breaks with cfp internals | Never once cfp `emit` is in use |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| cfp `emit` / `on` | Calling `emit` in the UI and `figma.ui.postMessage` in the plugin for the same message direction | Use `emit<Handler>` in both directions; cfp abstracts the underlying postMessage calls |
| cfp `render()` + Preact | Wrapping cfp's `render()` output in a second Preact render (e.g., `createRoot`) | `render(Plugin)` is the sole mount point — call it once as the default export |
| cfp `on<Handler>` cleanup | Forgetting to call the deregistration function returned by `on()` on component unmount | Store the return value of `on()` and call it in `useEffect`'s cleanup function |
| `@create-figma-plugin/ui` components | Passing `onChange` a React SyntheticEvent when cfp components pass raw values directly | cfp UI components (e.g., `TextboxNumeric`) call `onChange` with the value string, not an event object |
| CSS imports in cfp build | Importing a CSS file without `!` prefix causes class names to be hashed | Use `import '!./styles.css'` for global/unmodified CSS; use CSS Modules (default) for scoped styles |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `getAnnotationsForPage()` linear page walk on every tab switch | UI freezes briefly when switching to Overview tab | Cache result; invalidate only on `ANNOTATION_APPLIED` / `ANNOTATION_DELETED` events | Pages with 500+ nodes |
| `cachedCategories` populated once, never refreshed | User adds a Figma annotation category; plugin does not show it until restart | Refresh on `UI_READY` message or add a manual refresh button | Any time the user adds a category mid-session |
| Registering `on<Handler>` listeners inside a component without cleanup | Memory leak; multiple handlers fire for each message after component remounts | Always return the deregistration function from `useEffect` cleanup | After 5+ navigations within the plugin panel |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Deserializing `fieldData` JSON from `pluginData` without schema validation | Malformed or adversarially crafted plugin data causes undefined behavior; extra keys silently accepted | Add `validateFieldData(data: unknown, schema: FieldSchema[]): FieldData` before using deserialized data |
| Using magic string key `rich-annotation-data:${categoryId}` in multiple locations | Key format change causes silent data loss; old annotations orphaned | Centralize via exported `annotationDataKey()` helper in `src/shared/` so all callers use the same format |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dropdown showing stale category list after categories are added in Figma | User cannot annotate with new categories without reloading the plugin | Refresh categories on `GET_CATEGORIES` and expose a refresh button |
| Select dropdown retains an invalid value when schema changes while the plugin is open | Dropdown appears to have a selection but sends an empty/wrong categoryId | Validate selected value against available options on every render; reset to empty if invalid |
| Badge color mismatch between category color and overview badge | Designer sees wrong colors; annotation feels disconnected from Figma category | Verify `COLOR_MAP` keys are lowercase and `toLowerCase()` lookup is applied consistently in `OverviewRow.tsx` (currently unconfirmed per CONCERNS.md) |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Preact migration complete:** Verify `grep -r "from \"react\"" src/ui/` returns zero results before calling a component migrated
- [ ] **Messaging end-to-end:** Verify a message sent from plugin side via `emit<Handler>` actually triggers the `on<Handler>` listener in the UI — not just that TypeScript compiles
- [ ] **cfp render entry point:** Verify `src/ui/main.tsx` has `export default render(Plugin)` and does NOT call `createRoot`
- [ ] **Missing hook restored with correct pattern:** Verify `usePluginMessage.ts` imports from `"preact/hooks"` not `"react"`, and uses cfp `on<Handler>` not raw `window.addEventListener`
- [ ] **Schema format unified:** Verify `src/shared/messages.ts` exports only cfp `EventHandler` interfaces — no `PluginMessage`/`UIMessage` union types
- [ ] **`schema.required` removed everywhere:** Verify `grep -r "schema.required" src/ui/` returns zero results
- [ ] **Event target types fixed:** Verify `onChange` handlers in `FieldInput.tsx` and `OverviewTab.tsx` do not rely on `e.target.value` without a proper cast (or use cfp component's direct value callback)
- [ ] **Build passes with zero errors:** `npm run build` exits 0 with no TypeScript diagnostics before any phase is considered complete

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Partial migration commit breaks build | MEDIUM | `git stash` or `git checkout` individual files back to last working commit (9d22d57); re-apply changes one component at a time |
| Wrong messaging system (raw postMessage) used in restored hook | LOW | Replace `window.addEventListener` + `parent.postMessage` with `on<Handler>` + `emit<Handler>` from cfp utilities; update all call sites |
| `export default render(Plugin)` accidentally replaced with named export | LOW | Revert `src/ui/main.tsx` to cfp render pattern; check `package.json` `figma-plugin.ui` still points to this file |
| Two message schema formats in messages.ts | MEDIUM | Delete `PluginMessage`/`UIMessage` union types; rewrite `App.tsx` message subscriptions to use `on<Handler>`; ensure `code.ts` handler types are the single source of truth |
| `schema.required` TS errors reappear | LOW | Remove all 4 references in `FieldInput.tsx` (lines 26, 47, 67, 84 in broken state); do not re-add the property |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Mixing raw postMessage with cfp emit/on | Phase 1: Restore build — fix messaging first | `on<Handler>` used in `usePluginMessage.ts`; no `window.addEventListener` in UI |
| React imports in Preact-configured project | Phase 1: Restore build — sweep all `from "react"` | `grep -r 'from "react"' src/ui/` returns empty |
| Wrong cfp entry point pattern | Phase 1: Restore build — verify main.tsx | `export default render(Plugin)` present; no createRoot |
| Two message schema formats | Phase 1: Restore build — unify schema | Only cfp `EventHandler` interfaces in messages.ts |
| Partial migration commits | Phase 1 + all phases — build-green policy | Every commit passes `npm run build` before being made |
| `schema.required` ghost references | Phase 1: Restore build — remove stale references | Zero TS2339 errors after build |
| Unbounded cachedCategories | Phase 3: Plugin messaging — add refresh | Categories refresh on UI_READY |
| Plugin data deserialization without validation | Phase 3 or dedicated hardening phase | `validateFieldData` function exists and is called before use |

---

## Sources

- Codebase forensics: `git show 9d22d57` (last working commit) vs `5fd2686` (broken WIP commit)
- `.planning/codebase/CONCERNS.md` — build failure root cause analysis
- [Create Figma Plugin — UI documentation](https://yuanqing.github.io/create-figma-plugin/ui/) — `render()` usage, CSS import rules, React compatibility note (HIGH confidence)
- [Create Figma Plugin — Utilities documentation](https://yuanqing.github.io/create-figma-plugin/utilities/) — `emit`/`on`/`once` messaging pattern (HIGH confidence)
- [Figma Plugin API — postMessage](https://www.figma.com/plugin-docs/api/properties/figma-ui-postmessage/) — raw messaging envelope format, pluginMessage property requirement (HIGH confidence)
- Current `src/plugin/code.ts` — confirmed uses cfp `emit<Handler>` / `on<Handler>` throughout (direct evidence)
- Current `src/shared/messages.ts` — confirmed exports cfp `EventHandler` interfaces (direct evidence)
- `git show 9d22d57:src/ui/hooks/usePluginMessage.ts` — old hook used raw React + postMessage (direct evidence of incompatibility)

---
*Pitfalls research for: React → @create-figma-plugin/Preact migration (rich-annotation Figma plugin)*
*Researched: 2026-03-13*
