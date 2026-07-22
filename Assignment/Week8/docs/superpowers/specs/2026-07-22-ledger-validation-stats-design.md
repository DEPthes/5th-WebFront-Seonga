# 가계부 검증/에러UI/통계 탭 설계

## 배경
`Ledger.load()`, `categories.loadCustom()`가 `JSON.parse` 결과를 무검증(`any`)으로 신뢰하고 있고, 폼 검증은 `main.ts`에 인라인으로만 존재하며 실패 시 조용히 `return`한다. 통계를 보여줄 화면도 없다.

## 범위
1. **안전한 JSON 파싱** — `src/validators.ts` 신규.
   - `isTransaction(x): x is Transaction`, `parseTransactions(raw): Transaction[]`
   - `isCategoryMap(x): x is Record<TransactionType, string[]>`, `parseCategories(raw): Record<TransactionType, string[]>`
   - 스키마에 안 맞는 항목은 걸러내고, 파싱 자체가 실패하면 기존처럼 빈 배열/기본값으로 fallback.
   - `Ledger.load()` / `categories.loadCustom()`이 이 함수를 사용하도록 교체.
2. **폼 검증 함수화** — 같은 파일에 `validateTransactionInput(input: {category, amount, date}): string | null` 추가. category 필수, amount 유한수&양수, date 필수를 검사해 에러 메시지(or null) 반환. `main.ts`의 인라인 `if (!category || ...) return;`을 이 함수 호출로 교체.
3. **에러 메시지 UI** — `index.html`에 네이티브 `<dialog id="error-dialog">` 추가 (pico.css 기본 스타일 적용). `main.ts`에 `showError(message)` 헬퍼 추가 후 `.showModal()` 호출. 폼 검증 실패 시 사용.
4. **통계 탭** — 기존 페이지에 탭 버튼(가계부/통계) 추가, 두 `<section>`을 hidden 토글로 전환 (라우터 없이). `src/stats.ts` 신규: 트랜잭션 배열을 받아 카테고리별 합계, 월별 수입/지출 추이, 수입·지출 비율을 계산하는 순수 함수. 렌더링은 테이블 + CSS width bar (차트 라이브러리 추가 없음).

## 비범위
- 백엔드/서버 저장소 연동 (계속 localStorage 사용)
- 통계 기간 필터, 내보내기(CSV 등) — 요청되지 않음
- 새 npm 의존성 추가 없음

## 에러 처리
- localStorage 파싱 실패: 기존처럼 조용히 기본값 fallback (사용자 데이터 자체가 깨진 경우라 얼럿을 띄워도 취할 액션이 없음).
- 폼 제출 시 검증 실패: `showError()`로 dialog에 메시지 표시.

## 테스트 방침
- `validators.ts`의 파싱/검증 함수는 순수 함수이므로 별도 실행 가능한 자가 점검(간단한 `assert` 스크립트 또는 브라우저 수동 테스트)으로 확인.
- UI는 dev 서버 구동 후 실제 폼 제출/삭제/탭 전환으로 수동 확인.
