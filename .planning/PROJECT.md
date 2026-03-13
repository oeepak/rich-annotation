# Rich Annotation Figma Plugin

## What This Is

Figma 플러그인으로, 사용자가 카테고리 기반 스키마를 정의하고 Figma 노드에 구조화된 어노테이션 텍스트를 작성/파싱/관리할 수 있게 해주는 도구. 디자이너와 개발자 간 스펙 전달을 구조화한다.

## Core Value

카테고리별 스키마로 정의된 구조화된 어노테이션을 Figma 노드에 직접 붙이고, 일관성 있게 파싱/표시할 수 있어야 한다.

## Requirements

### Validated

<!-- 기존에 동작하던 기능들 — 코드베이스 맵에서 확인됨 -->

- ✓ 카테고리 기반 스키마 정의 (text, number, boolean, select, group 타입) — existing
- ✓ 스키마를 Figma pluginData에 저장/로드 — existing
- ✓ 스키마 기반 어노테이션 텍스트 빌드(buildText) — existing
- ✓ 어노테이션 텍스트 파싱(parseText) — existing
- ✓ 필드 타입별 유효성 검증(validateField) — existing
- ✓ 선택된 노드의 어노테이션 조회/편집 (SelectedTab) — existing
- ✓ 전체 페이지 어노테이션 오버뷰 (OverviewTab) — existing
- ✓ 스키마 편집 UI (SchemaTab) — existing
- ✓ Plugin ↔ UI 메시지 프로토콜 — existing

### Active

- [ ] React → Preact + @create-figma-plugin/ui 컴포넌트 전환 (빌드 깨짐 해결)
- [ ] cfp UI 컴포넌트(Button, Dropdown, TextInput 등) 적용
- [ ] cfp 빌드 시스템(@create-figma-plugin/build) 완전 통합
- [ ] cfp utilities 메시징 패턴 적용 (emit/on)
- [ ] 누락 파일 복구 (usePluginMessage.ts, PluginMessage 타입)
- [ ] 중복 코드 정리 (카테고리 드롭다운, buildParsedFieldsFromData)
- [ ] AnnotationCategory 타입 중앙화 (5곳 인라인 → shared 타입)
- [ ] shared 모듈 테스트 (buildText, parseText, validateField)
- [ ] plugin 메시지 핸들러 테스트
- [ ] UI 컴포넌트 렌더링/인터랙션 테스트 (모든 탭 + 공통 컴포넌트)

### Out of Scope

- E2E 테스트 — 현재 단계에서는 유닛+컴포넌트 테스트에 집중
- 새로운 기능 추가 — 마이그레이션과 테스트에만 집중
- Nested field groups — 의도적 설계 결정 (flat groups만 지원)
- 성능 최적화 (페이지 트래버설 캐싱 등) — 기능 안정화 후

## Context

- 현재 빌드가 깨진 상태 (commit 5fd2686 "WIP: partial cfp/preact migration - broken state")
- @create-figma-plugin 패키지들 이미 설치됨 (v4.0.3)
- Preact 10.29.0 설치됨, tsconfig에 jsxImportSource: "preact" 설정 완료
- Vitest + @testing-library/preact 테스트 인프라 구축됨
- 기존 테스트 일부 존재 (OverviewTab, FieldInput 등)
- plugin code.ts (296줄)는 테스트 없음

## Constraints

- **Tech Stack**: @create-figma-plugin/build + Preact — cfp 공식 문서 패턴 준수
- **UI 컴포넌트**: @create-figma-plugin/ui 빌트인 컴포넌트 사용
- **호환성**: Figma plugin API (node.annotations 등 기존 데이터 호환 유지)
- **테스트**: Vitest + @testing-library/preact, jsdom 환경

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React → Preact + cfp 전환 | cfp 공식 스택, 번들 크기 감소, Figma 네이티브 UI | — Pending |
| cfp UI 컴포넌트 사용 | Figma 네이티브 룩앤필, 커스텀 CSS 유지보수 감소 | — Pending |
| 기능 유지 + 코드 개선 병행 | 마이그레이션하면서 중복 코드/타입 이슈 같이 정리 | — Pending |
| 모듈별 테스트+코드 병행 작업 | 각 모듈 전환 시 테스트로 동작 보장 | — Pending |

---
*Last updated: 2026-03-13 after initialization*
