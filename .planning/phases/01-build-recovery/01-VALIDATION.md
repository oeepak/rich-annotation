---
phase: 1
slug: build-recovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | BUILD-01 | build | `npm run build 2>&1 \| head -20` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | BUILD-02 | build | `npm run build 2>&1 \| head -20` | ✅ | ⬜ pending |
| 1-01-03 | 01 | 1 | BUILD-03 | build | `npm run build 2>&1 \| head -20` | ✅ | ⬜ pending |
| 1-01-04 | 01 | 1 | BUILD-04 | build | `npm run build 2>&1 \| head -20` | ✅ | ⬜ pending |
| 1-01-05 | 01 | 1 | BUILD-05 | build | `npm run build 2>&1 \| tail -5` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Build verification uses `npm run build` exit code.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin loads in Figma with 3 tabs | BUILD-05 | Requires Figma desktop app | Open Figma → Plugins → Development → rich-annotation → verify 3 tabs render |
| Annotate node E2E | BUILD-05 | Requires Figma runtime | Select node → choose category → fill fields → save → verify annotation appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
