# 가계부 검증/에러UI/통계 탭 설계

## 배경
`Ledger.load()`, `categories.loadCustom()`가 `JSON.parse` 결과를 무검증(`any`)으로 신뢰하고 있고, 폼 검증은 `main.ts`에 인라인으로만 존재하며 실패 시 조용히 `return`한다. 통계를 보여줄 화면도 없다.

## 범위
1. **안전한 JSON 파싱** — `src/validators.ts` 신규.
   - `isTransaction(x): x is Transaction`, `parseTransactions(raw): Transaction[]`
   - `isCategoryMap(x): x is Record<TransactionType, string[]>`, `parseCategories(raw): Record<TransactionType, string[]>`
   - 스키마에 안 맞는 항목은 걸러내고, 파싱 자체가 실패하면 기존처럼 빈 배열/기본값으로 fallback.
   - `Ledger.load()` / `categories.loadCustom()`이 이 함수를 사용하도록 교체.
2. **폼 검증 함수화** — 같은 파일에 `validateTransactionInput(input: {category, amount, date, memo}): string | null` 추가. `main.ts`의 인라인 `if (!category || ...) return;`을 이 함수 호출로 교체. 필드별 규칙:
   - `category`: trim 후 필수 (빈 문자열/공백만 입력 거부).
   - `amount`: 유한수, 정수(원화라 소수 불가), 0보다 크고 `Number.MAX_SAFE_INTEGER` 이하.
   - `date`: 필수. `<input type="date">`가 형식(ISO)은 보장하므로 존재 여부만 확인.
   - `memo`: 선택 항목이라 값 자체는 검증하지 않되, 과도한 길이를 막기 위해 `index.html`에 `maxlength` 네이티브 속성 추가(메모 200자, 커스텀 카테고리명 30자) — JS 검증 대신 브라우저 기본 기능 사용.
3. **에러 메시지 UI** — `index.html`에 네이티브 `<dialog id="error-dialog">` 추가 (pico.css 기본 스타일 적용). `main.ts`에 `showError(message)` 헬퍼 추가 후 `.showModal()` 호출. 폼 검증 실패뿐 아니라 아래 저장/로드 예외 상황에도 사용.
   - `Ledger.save()` / `categories.addCategory()`가 `boolean`(성공 여부)을 반환하도록 변경. localStorage 쓰기 실패(저장공간 초과, 시크릿 모드 등) 시 `main.ts`가 `showError()`로 안내하되, 메모리 상의 데이터/화면은 그대로 유지.
   - `Ledger`가 생성 시점에 거래 데이터 파싱이 손상되어 있었는지 나타내는 `hadCorruptData` 플래그를 노출. 앱 시작 시 true면 1회 `showError()`로 "저장된 데이터 일부가 손상되어 초기화되었습니다" 안내.
   - 커스텀 카테고리 목록 손상은 영향이 작으므로(단순 목록 축소) 기존처럼 조용히 기본값 fallback 유지, 별도 알림 없음.
4. **통계 탭** — 기존 페이지에 탭 버튼(가계부/통계) 추가, 두 `<section>`을 hidden 토글로 전환 (라우터 없이). `src/stats.ts` 신규: 트랜잭션 배열을 받아 카테고리별 합계, 월별 수입/지출 추이, 수입·지출 비율을 계산하는 순수 함수. 렌더링은 테이블 + CSS width bar (차트 라이브러리 추가 없음).

## 비범위
- 백엔드/서버 저장소 연동 (계속 localStorage 사용)
- 통계 기간 필터, 내보내기(CSV 등) — 요청되지 않음
- 새 npm 의존성 추가 없음

## 에러 처리
- 폼 제출 시 검증 실패 (카테고리 미입력, 금액이 유한한 양의 정수가 아님, 금액이 안전 범위를 넘음, 날짜 미입력 등): `validateTransactionInput()`이 필드별 원인에 맞는 메시지를 반환하고, `showError()`로 dialog에 표시 후 제출 중단.
- 거래 데이터 localStorage 파싱 손상: 빈 배열로 fallback하되, 앱 시작 시 `showError()`로 1회 안내 (조용히 지나가면 사용자가 데이터가 사라진 이유를 모름).
- localStorage 쓰기 실패 (저장공간 초과, 시크릿 모드 등): 메모리 상태는 유지한 채 `showError()`로 "이 항목은 저장되지 못했습니다" 안내.
- 커스텀 카테고리 목록 파싱 손상: 영향이 작아(단순 편의 기능) 기존처럼 조용히 기본값 fallback, 별도 알림 없음.

## 테스트 방침
- `validators.ts`의 파싱/검증 함수는 순수 함수이므로 별도 실행 가능한 자가 점검(간단한 `assert` 스크립트 또는 브라우저 수동 테스트)으로 확인.
- UI는 dev 서버 구동 후 실제 폼 제출/삭제/탭 전환으로 수동 확인.
