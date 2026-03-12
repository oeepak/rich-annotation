# PRD: Rich Annotation

**문서 상태:** 신규 재작성
**최종 수정일:** 2026-03-12
**기준:** 현재 `wireframes/`와 최근 대화 내용만 반영

## 1. 제품 정의

Rich Annotation은 Figma annotation에 category별 스키마를 적용해, 사용자가 더 구조적으로 annotation text를 작성하고 읽을 수 있게 돕는 플러그인이다.

이 제품의 핵심은 별도 구조화 저장소를 만드는 것이 아니라, **annotation text 자체를 source of truth로 유지하면서** schema를 작성 보조와 해석 규칙으로 사용하는 데 있다.

단, schema 자체는 annotation text와 별개로 플러그인이 문서 단위 설정으로 보관한다. 이는 annotation 내용의 진실값을 대체하기 위한 것이 아니라, 같은 Figma 문서 안에서 category별 작성 규칙과 parse 규칙을 재사용하기 위한 설정 저장소다.

## 2. 제품 한줄 설명

Figma annotation을 category 기반의 schema-assisted text로 작성하고 관리하게 해주는 도구.

## 3. 문제 정의

기존 Figma annotation은 자유 텍스트로 쓰기 쉽지만, 구조가 없어서 다음 문제가 생긴다.

- 같은 종류의 annotation이라도 사람마다 형식이 달라진다.
- 특정 카테고리에서 어떤 값을 써야 하는지 합의가 깨진다.
- overview에서 annotation을 모아볼 때 비교와 검색이 어렵다.
- annotation text를 다시 읽어 기계적으로 활용하기 어렵다.
- raw text를 유지하면서도 입력을 도와줄 도구가 부족하다.

## 4. 목표

- annotation category별로 입력 스키마를 정의할 수 있어야 한다.
- 사용자는 선택한 node에서 category를 고르고 schema에 맞춰 annotation을 작성할 수 있어야 한다.
- 최종 저장 결과는 항상 annotation text여야 한다.
- annotation text는 다시 schema 기준으로 parse될 수 있어야 한다.
- parse가 실패하더라도 annotation text는 유지되어야 한다.
- overview에서 현재 페이지 annotation을 category, node, field 기준으로 탐색할 수 있어야 한다.

## 5. 비목표

이 제품은 아래를 목표로 하지 않는다.

- annotation 외부에 별도의 structured source of truth를 두는 것
- annotation text를 완전히 immutable하게 강제하는 것
- 엄격한 데이터베이스형 스키마 시스템을 만드는 것
- analytics 전용 이벤트 관리 도구로 한정하는 것
- 크로스 파일 집계나 백엔드 동기화를 제공하는 것

## 6. 제품 원칙

### 6.1 Annotation Text First

- 실제 진실 데이터는 annotation text다.
- 사용자가 raw text를 직접 수정할 수 있다.
- schema는 text를 만들고 읽기 쉽게 해주는 보조 장치다.
- annotation category 자체는 Figma annotation metadata(`categoryId`)를 사용한다.

### 6.2 Category-Scoped Schema

- schema는 annotation category별로 정의된다.
- 같은 category를 쓰는 annotation은 같은 field 구조를 따른다.
- category는 Figma annotation의 개념과 연결된다.

### 6.3 Parse, Not Enforce

- schema의 type은 저장 타입이 아니라 parse hint다.
- 저장은 항상 text다.
- 읽을 때만 number, boolean, select 등으로 해석을 시도한다.
- 해석 실패 시 값은 사라지지 않고 raw text는 유지된다.

## 7. 핵심 개념

### 7.1 Category

annotation이 속하는 분류 단위.

이 category는 Figma annotation API의 native category를 기준으로 한다. 플러그인은 category label과 `categoryId`를 읽어 사용하며, schema는 이 native category에 연결된다.

예:
- `Tracking`
- `Experiment`
- `QA`

### 7.2 Schema

특정 category에 대해 어떤 field를 어떤 parse hint로 읽을지 정의하는 규칙.

schema는 문서 단위 설정으로 저장된다. 즉, 특정 Figma 파일 안에서는 같은 category에 대해 같은 schema를 공유한다.

field 속성 예:
- `name`
- `type`: `text`, `number`, `boolean`, `select`
- `required`
- `options` (`select`일 때)
- `multiline` (`text`의 입력 UI 옵션)

### 7.3 Annotation Text

실제 Figma annotation에 저장되는 텍스트.

canonical format은 줄 단위 `field: value` 형식을 따른다. category는 text 안에 쓰지 않고 annotation metadata(`categoryId`)에서 관리한다. 즉, annotation text 본문은 field line만 유지한다.

예:
```text
experiment_id: paywall_copy_test
variant: B
surface: pricing_modal
enabled: true
```

### 7.4 Parse Match

현재 annotation text가 선택된 category schema에 얼마나 맞는지 나타내는 상태.

예:
- matched
- not matched
- no schema

`matched`는 현재 annotation text가 선택된 category schema 기준으로 해석 가능한 상태를 의미한다. `not matched`는 raw text는 존재하지만 일부 field가 schema 규칙에 맞게 parse되지 않는 상태다. `no schema`는 category는 있으나 해당 category에 연결된 schema가 아직 정의되지 않은 상태다.

## 8. 대상 사용자

- Figma에서 annotation을 자주 남기는 디자이너
- annotation을 구조적으로 읽고 싶은 개발자
- 특정 category에 대해 팀 공통 annotation 형식을 만들고 싶은 기획/운영 담당자

## 9. 핵심 사용자 흐름

### Flow A: Schema 정의

1. 사용자가 `Schema` 탭으로 이동한다.
2. category별 field 구성을 정의한다.
3. 각 field의 type, required 여부, select options, multiline 여부를 설정한다.
4. 저장하면 해당 category의 annotation text를 build/parse하는 기준이 된다.

schema는 문서 단위 plugin data에 JSON 형태로 저장한다.

### Flow B: Selected에서 annotation 작성

1. 사용자가 Figma에서 node를 선택한다.
2. `Selected` 탭에서 annotation category를 선택한다.
3. schema에 맞는 field 입력 UI가 표시된다.
4. 사용자가 값을 입력한다.
5. 플러그인은 annotation text 미리보기를 보여준다.
6. 사용자가 `Apply`하면 현재 field 값으로 canonical annotation text를 생성해 node annotation에 반영한다.

### Flow C: Raw Text 직접 수정

1. 사용자가 `Edit Raw Text`로 전환한다.
2. annotation text를 직접 수정한다.
3. `Apply`하면 text 자체가 저장된다.
4. 이후 플러그인은 현재 category schema 기준으로 parse를 다시 시도한다.

### Flow D: Schema Mismatch 처리

1. annotation text가 schema 규칙과 맞지 않으면 mismatch 상태가 된다.
2. 플러그인은 parse 실패 필드를 표시한다.
3. 사용자는 structured fields를 다시 채우거나 raw text를 직접 수정할 수 있다.
4. raw text는 실패하더라도 삭제되지 않는다.

parse 실패 field는 UI에서 경고 상태로 표시하고, annotation text 쪽에서는 해당 줄을 강조 표시할 수 있다.

### Flow E: Overview 검토

1. 사용자가 `Overview` 탭을 연다.
2. 현재 페이지 annotation 목록을 본다.
3. category, node 이름, field 기준으로 검색한다.
4. 항목을 열어 해당 node의 annotation을 편집한다.
5. 필요 시 export한다.

검색은 화면에 보이는 요약값뿐 아니라 raw annotation text 전체와 parse된 field 값까지 포함한다.

## 10. 화면 구조

### 10.1 Overview

목적:
- 현재 페이지 annotation 전체를 검토
- 검색
- category 필터링
- export

포함 요소:
- 페이지 이름
- annotation 개수
- 검색 입력
- category 필터
- annotation row 목록
- empty state

row 요약 규칙:
- category 표시
- node 이름 표시
- schema 순서 기준으로 앞의 1~2개 parsed field를 우선 노출
- parsed field가 없으면 raw text 첫 줄을 fallback으로 표시

### 10.2 Selected

목적:
- 현재 선택 node의 annotation 작성/수정

포함 요소:
- 선택 node 정보
- annotation category 선택
- schema match 상태
- category별 field 입력 UI
- annotation text 미리보기
- raw text 편집 모드
- apply/delete 액션

`Apply` 동작:
- fields 모드에서는 field 입력값으로 annotation text를 재생성해 저장
- raw text 모드에서는 현재 raw text를 그대로 저장

### 10.3 Schema

목적:
- category별 schema 정의

포함 요소:
- category별 섹션
- field 추가
- field 삭제
- field type 선택
- required 설정
- select options 설정
- multiline 입력 옵션 설정

schema 저장 범위:
- 현재 Figma 문서 전체
- category schema는 문서 루트 plugin data에 JSON으로 저장

## 11. 기능 요구사항

### FR-1 Category별 Schema 정의

- 사용자는 category별 field schema를 정의할 수 있어야 한다.
- schema는 여러 category를 동시에 가질 수 있어야 한다.
- 각 field는 이름, type, required 여부를 가져야 한다.
- `select` 타입은 option 목록을 가질 수 있어야 한다.
- `text` 타입은 multiline 옵션을 가질 수 있어야 한다.
- schema는 문서 단위로 저장되어야 한다.
- schema는 Figma native annotation category에 연결되어야 한다.

### FR-2 Annotation 작성 보조

- 사용자는 선택 node에 대해 category를 선택할 수 있어야 한다.
- 선택된 category의 schema에 맞는 입력 폼이 표시되어야 한다.
- 입력값을 기반으로 annotation text를 생성할 수 있어야 한다.
- category 선택은 Figma annotation metadata의 `categoryId`와 연결되어야 한다.

### FR-3 Raw Text 편집

- 사용자는 annotation text를 직접 수정할 수 있어야 한다.
- raw text 수정 후에도 플러그인은 schema parse를 다시 시도해야 한다.
- raw text 모드의 저장은 annotation text를 그대로 반영해야 한다.

### FR-4 Parse Hint 기반 해석

- `text`는 항상 문자열로 유지한다.
- `number`는 숫자로 변환 가능할 때만 number로 해석한다.
- `boolean`은 `true`/`false`일 때만 boolean으로 해석한다.
- `select`는 schema option과 일치할 때만 유효값으로 해석한다.
- 해석 실패 시 parsed value는 `null`이며 raw text는 그대로 유지한다.
- `multiline`은 별도 저장 타입이 아니라 `text`의 입력 UI 옵션이다.

### FR-5 Match / Mismatch 상태

- 현재 annotation text가 schema와 맞는지 표시해야 한다.
- parse 실패 field를 사용자에게 알려줘야 한다.
- mismatch 상태에서도 annotation text는 보존해야 한다.

### FR-6 Schema 없음 상태

- 선택한 annotation category에 schema가 없으면 이를 표시해야 한다.
- 사용자가 `Schema` 화면으로 이동하거나 raw text 편집을 선택할 수 있어야 한다.

### FR-7 Overview

- 현재 페이지의 annotation을 목록으로 보여야 한다.
- category 기준 필터링이 가능해야 한다.
- node 이름, category, field 값, raw annotation text 기준 검색이 가능해야 한다.
- overview empty state를 지원해야 한다.
- row는 category, node name, 주요 parsed field 일부를 보여야 한다.

### FR-8 Export

- 현재 페이지 annotation 목록을 export할 수 있어야 한다.
- export format은 `JSON`과 `CSV`를 지원해야 한다.
- export는 최소한 category, node 정보, annotation text, parse 결과를 포함해야 한다.

## 12. 데이터 해석 원칙

- 저장 포맷은 annotation text다.
- schema는 parse hint다.
- parse 성공 시 typed value를 얻는다.
- parse 실패 시 raw는 남기고 parsed value만 `null` 처리한다.
- 값은 몰래 제거하지 않는다.
- canonical text는 기본적으로 `field: value`의 줄 단위 구조를 따른다.
- category identity는 text가 아니라 annotation metadata(`categoryId`)를 기준으로 본다.
- category heading이나 title line은 annotation text에 포함하지 않는다.

## 13. 저장 및 API 원칙

- annotation 본문은 Figma `node.annotations`의 `label` 또는 `labelMarkdown`에 저장한다.
- category 연결은 annotation의 `categoryId`를 사용한다.
- schema는 문서 단위 plugin data에 JSON string으로 저장한다.
- schema 저장은 `figma.root.setPluginData(...)` 형태의 문서 루트 저장을 기본으로 한다.
- annotation 지원 노드가 아닌 경우에는 structured annotation 작성 UI를 제한해야 한다.
- codegen이 제공되는 경우, generate callback은 3초 제한 안에서 동작하도록 가볍게 유지해야 한다.

## 14. 초기 제공 Schema 예시

### Tracking

- `action`: `text`, required
- `source`: `text`, required
- `owner`: `text`, optional
- `screen`: `text`, optional

### Experiment

- `experiment_id`: `text`, required
- `variant`: `select`, required, options `A`, `B`, `C`
- `surface`: `text`, optional
- `enabled`: `boolean`, optional

### QA

- `status`: `select`, required, options `open`, `blocked`, `done`
- `owner`: `text`, optional
- `note`: `text`, optional, multiline input

## 15. 주요 상태

제품은 최소한 아래 상태를 지원해야 한다.

- overview with annotations
- overview empty
- selected with schema matched
- selected empty
- selected schema mismatch
- selected raw text mode
- selected no schema

## 16. UX 원칙

- annotation text를 가리지 않는다.
- 구조화 입력과 raw text 편집을 모두 허용한다.
- schema mismatch를 에러가 아니라 복구 가능한 상태로 다룬다.
- field 입력과 annotation text 결과를 함께 보여준다.
- category별 schema 구성이 직관적으로 보여야 한다.
- 검색은 화면에 보이는 값뿐 아니라 annotation field 전반을 대상으로 해야 한다.
- mismatch line은 경고 색상이나 강조 상태로 보여줄 수 있어야 한다.

## 17. 성공 기준

- 사용자가 자유 텍스트 대신 category 기반 annotation 작성을 반복적으로 사용한다.
- 같은 category annotation의 형식 일관성이 높아진다.
- raw text를 유지하면서도 parse 가능한 annotation 비율이 높아진다.
- overview에서 annotation을 더 쉽게 찾고 비교할 수 있다.

## 18. 향후 확장 가능성

현재 PRD는 annotation-text-first 모델을 전제로 한다. 이후 확장 가능성은 있지만, 현재 범위에는 포함하지 않는다.

- 더 정교한 parse rules
- annotation text 내 하이라이트/부분 강조
- category 가져오기/동기화 UX 고도화
- codegen이나 export 포맷 확장
- 크로스 파일 운영 기능

---

이 문서는 기존 PRD를 계승하지 않고, 현재 `wireframes/`와 최근 대화에서 합의한 방향만을 기준으로 다시 작성했다.
