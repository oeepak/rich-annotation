---
phase: 01-build-recovery
plan: "01"
subsystem: ui
tags: [preact, cfp, typescript, tsconfig, messaging]

# Dependency graph
requires: []
provides:
  - cfp-compatible tsconfig with jsx:react + jsxFactory:h
  - usePluginMessage.ts with postToPlugin wrapper using cfp emit
  - App.tsx root component with preact/hooks and cfp on/emit messaging
  - UI_READY emission on mount for plugin initial state handshake
affects:
  - 01-build-recovery
  - all src/ui components that import from hooks/usePluginMessage

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "cfp on<Handler> subscriptions in useEffect with cleanup"
    - "cfp emit<Handler> for all plugin communication"
    - "UI_READY emitted after handlers registered, before any plugin messages"

key-files:
  created:
    - src/ui/hooks/usePluginMessage.ts
  modified:
    - tsconfig.json
    - src/ui/App.tsx

key-decisions:
  - "postToPlugin wrapper preserves { type: X, ...data } call signature so all 4 existing components compile without changes"
  - "App.tsx uses direct on<Handler>/emit<Handler> calls; postToPlugin kept only for child components"
  - "UI_READY emitted after all on<Handler> registrations to avoid missing plugin responses"

patterns-established:
  - "on<Handler> registration with returned unsubscribe function called in useEffect cleanup"
  - "emit<UIReadyHandler>('UI_READY') as first plugin signal after all listeners are set up"

requirements-completed: [BUILD-01, BUILD-03, BUILD-04]

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 1 Plan 01: Build Recovery - Foundation Summary

**tsconfig fixed for cfp esbuild (jsx:react + jsxFactory:h), App.tsx rewritten with preact/hooks and cfp on/emit messaging, postToPlugin hook created to preserve child component API**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-13T07:19:59Z
- **Completed:** 2026-03-13T07:20:57Z
- **Tasks:** 2
- **Files modified:** 3 (tsconfig.json, src/ui/App.tsx, src/ui/hooks/usePluginMessage.ts)

## Accomplishments
- tsconfig.json now uses `jsx: "react"` + `jsxFactory: "h"` which cfp esbuild requires for Preact
- Created `src/ui/hooks/usePluginMessage.ts` with `postToPlugin` wrapper preserving existing child component call signatures
- Rewrote `App.tsx` to use `preact/hooks`, cfp `on<Handler>` subscriptions, cfp `emit<Handler>` calls, and `emit<UIReadyHandler>('UI_READY')` on mount
- TypeScript reports 0 errors after both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix tsconfig.json for cfp esbuild compatibility** - `3abc76a` (chore)
2. **Task 2: Create usePluginMessage.ts hook and rewrite App.tsx** - `7f04088` (feat)

## Files Created/Modified
- `tsconfig.json` - Changed jsx/module/moduleResolution settings for cfp esbuild compatibility
- `src/ui/hooks/usePluginMessage.ts` - New file: postToPlugin wrapper using cfp emit
- `src/ui/App.tsx` - Rewrote with preact/hooks + cfp on<Handler>/emit<Handler> patterns

## Decisions Made
- Preserved `postToPlugin({ type: 'X', ...data })` call signature in the hook so the 4 child components (OverviewTab, SelectedTab, SchemaTab, etc.) continue to compile without changes
- App.tsx uses direct `emit<Handler>` instead of `postToPlugin` since it now owns the handler imports
- All `on<Handler>` listeners are registered before `emit<UIReadyHandler>('UI_READY')` fires to prevent race condition where plugin responds before UI handlers are ready

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - tsc reported 0 errors after both tasks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- tsconfig, messaging hook, and App.tsx are the three root causes of the 40+ build errors — all fixed
- Ready for Plan 02: fix remaining component files (OverviewTab, SelectedTab, SchemaTab, and others) that still import React or use raw postMessage
- No blockers

---
*Phase: 01-build-recovery*
*Completed: 2026-03-13*
