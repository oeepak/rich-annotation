# Requirements: Rich Annotation Plugin

**Defined:** 2026-03-13
**Core Value:** 카테고리별 스키마로 정의된 구조화된 어노테이션을 Figma 노드에 직접 붙이고, 일관성 있게 파싱/표시할 수 있어야 한다.

## v1 Requirements

### Build Recovery

- [ ] **BUILD-01**: tsconfig.json JSX 설정을 cfp 빌드와 호환되게 수정 (jsx: "react", jsxFactory: "h")
- [ ] **BUILD-02**: 모든 UI 파일에서 React 임포트를 제거하고 preact/hooks + `import { h } from 'preact'`로 전환
- [ ] **BUILD-03**: usePluginMessage 훅을 cfp emit/on 패턴으로 재구축
- [ ] **BUILD-04**: 불필요한 PluginMessage union 타입 제거, EventHandler 패턴으로 통일
- [ ] **BUILD-05**: `npm run build`가 에러 없이 성공

### UI Migration

- [ ] **UIMIG-01**: Button 컴포넌트를 @create-figma-plugin/ui Button으로 교체
- [ ] **UIMIG-02**: Textbox/TextboxNumeric/TextboxMultiline을 cfp 컴포넌트로 교체
- [ ] **UIMIG-03**: Dropdown을 cfp Dropdown으로 교체 (null 초기값 처리 포함)
- [ ] **UIMIG-04**: Checkbox를 cfp Checkbox로 교체 (boolean/string 변환 포함)
- [ ] **UIMIG-05**: Banner, Divider 등 보조 UI 컴포넌트를 cfp로 교체
- [ ] **UIMIG-06**: cfp 컴포넌트 적용 후 불필요한 커스텀 CSS 제거

### Code Improvement

- [ ] **CODE-01**: 카테고리 드롭다운 중복 로직을 공통 컴포넌트로 추출
- [ ] **CODE-02**: buildParsedFieldsFromData 함수를 shared 모듈로 추출 (plugin/UI 중복 제거)
- [ ] **CODE-03**: AnnotationCategory 타입을 shared/types.ts로 중앙화 (5곳 인라인 제거)
- [ ] **CODE-04**: schema.required 잔재 참조 제거 (FieldInput.tsx의 4곳)

### Testing

- [ ] **TEST-01**: buildText 유닛 테스트 (모든 필드 타입, 그룹, 엣지 케이스)
- [ ] **TEST-02**: parseText 유닛 테스트 (정상 파싱, 불완전 텍스트, 빈 입력)
- [ ] **TEST-03**: validateField 유닛 테스트 (모든 필드 타입별 유효/무효 케이스)
- [ ] **TEST-04**: plugin 메시지 핸들러 테스트 (APPLY_ANNOTATION, SAVE_SCHEMAS 등 주요 핸들러)
- [ ] **TEST-05**: OverviewTab 컴포넌트 렌더링/인터랙션 테스트
- [ ] **TEST-06**: SelectedTab 컴포넌트 렌더링/인터랙션 테스트
- [ ] **TEST-07**: SchemaTab 컴포넌트 렌더링/인터랙션 테스트
- [ ] **TEST-08**: FieldInput 컴포넌트 렌더링/인터랙션 테스트
- [ ] **TEST-09**: 공통 컴포넌트 테스트 (SchemaFieldRow, AnnotationPreview 등)

## v2 Requirements

### Performance

- **PERF-01**: 페이지 어노테이션 트래버설 캐싱 (대형 페이지 성능 개선)
- **PERF-02**: 카테고리 캐시 갱신 메커니즘 (현재 무한 캐시)

### Validation

- **VALID-01**: pluginData 역직렬화 시 스키마 유효성 검증
- **VALID-02**: 필드 min/max 범위, 커스텀 regex 패턴 검증

## Out of Scope

| Feature | Reason |
|---------|--------|
| Nested field groups | 의도적 설계 결정 — flat groups만 지원 |
| E2E/Integration 테스트 | 유닛+컴포넌트 테스트에 집중 |
| 새로운 기능 추가 | 마이그레이션과 테스트에만 집중 |
| OAuth/인증 | Figma 플러그인 권한 모델에 의존 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | — | Pending |
| BUILD-02 | — | Pending |
| BUILD-03 | — | Pending |
| BUILD-04 | — | Pending |
| BUILD-05 | — | Pending |
| UIMIG-01 | — | Pending |
| UIMIG-02 | — | Pending |
| UIMIG-03 | — | Pending |
| UIMIG-04 | — | Pending |
| UIMIG-05 | — | Pending |
| UIMIG-06 | — | Pending |
| CODE-01 | — | Pending |
| CODE-02 | — | Pending |
| CODE-03 | — | Pending |
| CODE-04 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| TEST-04 | — | Pending |
| TEST-05 | — | Pending |
| TEST-06 | — | Pending |
| TEST-07 | — | Pending |
| TEST-08 | — | Pending |
| TEST-09 | — | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 0
- Unmapped: 24 ⚠️

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after initial definition*
