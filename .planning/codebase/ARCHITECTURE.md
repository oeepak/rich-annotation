# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Plugin-UI Bidirectional Message Bus with Stateless Shared Utilities

**Key Characteristics:**
- Figma plugin architecture: separate plugin code thread and UI iframe
- Async message-based communication between plugin and UI
- Centralized schema and annotation management in plugin
- Shared utility layer for text parsing, building, and validation
- State-driven view switching based on node selection

## Layers

**Plugin Code (Figma Thread):**
- Purpose: Access Figma document model, manage schemas, apply annotations to nodes
- Location: `src/plugin/code.ts`
- Contains: Figma API interaction, schema persistence, annotation management
- Depends on: `@shared/types`, `@shared/messages`, `@create-figma-plugin/utilities`
- Used by: UI layer via bidirectional message protocol

**UI Layer (Iframe):**
- Purpose: Render interactive UI for viewing and editing annotations
- Location: `src/ui/` (entry: `src/ui/main.tsx`)
- Contains: React/Preact components, hooks, style definitions
- Depends on: `@shared/types`, `@shared/messages`, UI framework components
- Used by: Plugin via message protocol

**Shared Layer:**
- Purpose: Type definitions and business logic utilities
- Location: `src/shared/`
- Contains: Type definitions, text parsing, text building, validation
- Depends on: Nothing (zero dependencies)
- Used by: Both plugin and UI layers

## Data Flow

**Initialization Flow:**

1. UI renders (`src/ui/main.tsx`)
2. App component mounts (`src/ui/App.tsx`)
3. UI signals ready: `postToPlugin({ type: "UI_READY" })`
4. Plugin receives `UI_READY` message
5. Plugin emits initial state:
   - `CATEGORIES_LIST`: Figma annotation categories
   - `SCHEMAS_LOADED`: Persisted schema definitions
   - `ANNOTATIONS_LIST`: All page annotations
   - `SELECTION_CHANGED`: Current selection info

**Selection Change Flow:**

1. User selects node in Figma
2. Plugin detects `selectionchange` event
3. Plugin calls `emitSelectionInfo()`:
   - Builds `AnnotationInfo` for each annotation on node
   - Includes parsed fields and validation status
4. Plugin emits `SELECTION_CHANGED` message to UI
5. UI updates state → re-renders `SelectedTab` or shows overview

**Annotation Application Flow:**

1. User edits annotation in `SelectedTab`
2. User clicks "Save" button
3. UI sends `APPLY_ANNOTATION` message with:
   - nodeId, categoryId, text, fieldData
4. Plugin receives message
5. Plugin applies annotation to node:
   - Updates Figma native annotation
   - Stores structured fieldData in pluginData
6. Plugin emits `ANNOTATION_APPLIED`
7. Plugin emits updated `SELECTION_CHANGED` to refresh UI

**Schema Edit Flow:**

1. User navigates to `SchemaTab`
2. UI sends `GET_SCHEMAS` and `GET_CATEGORIES`
3. Plugin responds with current schemas and Figma categories
4. User edits schema definition
5. User clicks "Save"
6. UI sends `SAVE_SCHEMAS` message
7. Plugin persists to `figma.root.setPluginData()`
8. Plugin emits `SCHEMAS_LOADED` to confirm

**State Management:**

- Plugin: Persists schemas in `figma.root.setPluginData()` (key: `"rich-annotation-schemas"`)
- Plugin: Caches Figma categories in memory during session
- Plugin: Builds real-time AnnotationInfo from node.annotations + pluginData
- UI: Manages local view state (selected tab, selected category, form values)
- UI: Never persists state directly; all data comes from plugin

## Key Abstractions

**AnnotationInfo:**
- Purpose: Complete representation of a single annotation with parsed fields
- Examples: `src/shared/types.ts`, used throughout UI components and plugin
- Pattern: Data transfer object combining native Figma annotation + derived field data

**ParsedField:**
- Purpose: Individual field with raw value, parsed value, and validation status
- Examples: Used in `src/ui/hooks/useSelection.ts`, display components
- Pattern: Supports hierarchical structure (groups can contain children)

**SchemaStore:**
- Purpose: Map of annotation categories to their field schemas
- Examples: `src/plugin/code.ts` (loadSchemas/saveSchemas)
- Pattern: Keyed by categoryId; CategorySchema contains categoryLabel and fields

**FieldSchema:**
- Purpose: Type definition for annotation field structure
- Examples: Supports text, number, boolean, select, group types
- Pattern: Groups can contain flat children (no nesting)

**Message Handlers (EventHandler):**
- Purpose: Type-safe message protocol between plugin and UI
- Examples: `SelectionChangedHandler`, `ApplyAnnotationHandler`, etc.
- Pattern: Extends EventHandler with name and handler signature

## Entry Points

**Plugin Entry Point:**
- Location: `src/plugin/code.ts`
- Triggers: Figma plugin initialization (showUI call)
- Responsibilities:
  - Initialize UI
  - Set up event listeners (selectionchange, messages from UI)
  - Handle annotation CRUD operations
  - Manage schema persistence

**UI Entry Point:**
- Location: `src/ui/main.tsx`
- Triggers: Plugin creates iframe and calls render()
- Responsibilities:
  - Render App component
  - App handles all message listening and state management

**App Root:**
- Location: `src/ui/App.tsx`
- Triggers: UI render initialization
- Responsibilities:
  - Route between OverviewTab, SelectedTab, SchemaTab
  - Manage global view state
  - Handle all incoming plugin messages
  - Delegate to tab components via props

## Error Handling

**Strategy:** Graceful degradation with fallback values

**Patterns:**
- Schema parsing failures return empty store: `try { JSON.parse(...) } catch { return {} }`
- Missing node references: Check with `getNodeByIdAsync()` before accessing
- Invalid annotation data: Rebuild from annotation label using parseText() fallback
- Type coercions: Validate data type before use (e.g., `typeof fieldData[name] === "object"`)
- Selection handlers: Check node type before assuming annotation support
- Category not found: Use categoryId as fallback label

## Cross-Cutting Concerns

**Logging:** No explicit logging. Debug via browser console in plugin UI; check figma console in plugin code.

**Validation:** `src/shared/validateField.ts` handles all field type validation:
- Text: Always valid (string passthrough)
- Number: Must parse as `Number()`
- Boolean: Must be "true" or "false" string
- Select: Must be in options array
- Group: Recursively validates children

**Authentication:** Not applicable (runs within Figma with plugin context)

**Figma API Authorization:** Plugin automatically has access via Figma plugin context; no explicit auth needed

---

*Architecture analysis: 2026-03-13*
