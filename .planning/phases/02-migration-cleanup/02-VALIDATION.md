---
phase: 2
slug: migration-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run build && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UIMIG-01 | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial | ⬜ pending |
| 02-01-02 | 01 | 1 | UIMIG-02 | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial | ⬜ pending |
| 02-01-03 | 01 | 1 | UIMIG-03 | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial | ⬜ pending |
| 02-01-04 | 01 | 1 | UIMIG-04 | unit (component) | `npm run test -- tests/ui/FieldInput.test.tsx` | Partial | ⬜ pending |
| 02-01-05 | 01 | 1 | UIMIG-05 | unit (smoke) | `npm run test -- tests/ui/smoke.test.tsx` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | UIMIG-06 | manual (grep) | `grep -r "className.*btn\|className.*input\|className.*select" src/ui/` | manual | ⬜ pending |
| 02-02-02 | 02 | 1 | CODE-01 | unit (component) | `npm run test` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | CODE-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | CODE-03 | type check | `npm run build` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 1 | CODE-04 | manual (grep) | `grep -n "required" src/ui/styles/global.css` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/ui/CategoryDropdown.test.tsx` — stubs for CODE-01
- [ ] `tests/shared/buildParsedFieldsFromData.test.ts` — stubs for CODE-02
- [ ] Existing infrastructure covers UIMIG-01..04 (FieldInput tests already have cfp mock patterns)

*Vitest + @testing-library/preact + jsdom already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No .btn/.input/.select CSS classes in component output | UIMIG-06 | CSS class grep verification | `grep -r "className.*btn\|className.*input\|className.*select" src/ui/` should return 0 results |
| No .required CSS class references | CODE-04 | CSS grep verification | `grep -n "required" src/ui/styles/global.css` should return 0 results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
