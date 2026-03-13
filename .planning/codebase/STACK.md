# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (plugin code, UI, tests, and shared utilities)

## Runtime

**Environment:**
- Node.js - Development and build environment
- Browser/Figma Plugin Runtime - Plugin execution environment

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Preact 10.29.0 - UI rendering library (React-compatible, lightweight alternative)

**Plugin & UI Build:**
- @create-figma-plugin/build 4.0.3 - Build and compilation tool for Figma plugins
- @create-figma-plugin/ui 4.0.3 - UI framework for Figma plugin interfaces
- @create-figma-plugin/utilities 4.0.3 - Utilities for plugin communication and lifecycle

**Testing:**
- Vitest 4.0.18 - Unit test runner
- @testing-library/preact 3.2.4 - Testing utilities for Preact components
- @testing-library/jest-dom 6.9.1 - Custom Jest matchers for DOM testing
- jsdom 28.1.0 - JavaScript DOM implementation for test environment

## Key Dependencies

**Critical:**
- preact 10.29.0 - Lightweight React alternative (3KB) - Core UI framework

**Infrastructure:**
- @figma/plugin-typings 1.123.0 - TypeScript type definitions for Figma API
- @create-figma-plugin/utilities 4.0.3 - Plugin-to-UI messaging and lifecycle management
- @create-figma-plugin/ui 4.0.3 - Figma-native UI components and rendering

## Configuration

**Environment:**
- Figma Plugin metadata in `package.json`:
  - Plugin ID: `rich-annotation-dev`
  - Editor types: `figma`, `dev`
  - Capabilities: `inspect`
  - Document access: `dynamic-page`
  - Network access: Restricted to `none`

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
  - Target: ES2020
  - Module: ESNext
  - Strict mode enabled
  - JSX configured for Preact (jsxImportSource: "preact")
  - Path aliases: `@shared/*` → `./src/shared/*`
- `vitest.config.ts` - Test runner configuration
  - Environment: jsdom
  - Test files: `tests/**/*.test.{ts,tsx}`
  - Setup files: `tests/setup.ts`

## Platform Requirements

**Development:**
- Node.js (version not specified in .nvmrc, but package-lock.json indicates npm v10+)
- TypeScript 5.9.3
- Modern bundler (handled by @create-figma-plugin/build)

**Production:**
- Figma App (desktop or web)
- Plugin installation via Figma plugin manager
- No external API dependencies required for deployment

---

*Stack analysis: 2026-03-13*
