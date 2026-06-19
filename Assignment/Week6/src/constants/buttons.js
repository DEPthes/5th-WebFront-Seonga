/**
 * 계산기 버튼 설정 배열
 *
 * 각 버튼 객체 구조:
 *  - id      : React의 key prop에 사용 (리스트 렌더링 시 필수)
 *  - label   : 버튼에 표시되는 텍스트
 *  - variant : 버튼 색상 스타일 ('number' | 'operator' | 'utility')
 *  - action  : ButtonGrid에서 어떤 핸들러를 연결할지 결정하는 식별자
 *  - value   : action이 'number' 또는 'operator'일 때 핸들러에 전달하는 값
 *
 * 배열 순서가 그대로 그리드 배치 순서가 된다 (grid-template-columns: repeat(4, 1fr))
 */
export const BUTTON_CONFIG = [
  // ── 1행: 유틸리티·연산자 ──────────────────────────
  { id: 'backspace', label: '⌫',   variant: 'utility',  action: 'backspace' },           // 마지막 자리 삭제
  { id: 'clear',     label: 'AC',  variant: 'utility',  action: 'clear' },                // 전체 초기화
  { id: 'percent',   label: '%',   variant: 'utility',  action: 'percent' },              // ÷ 100
  { id: 'divide',    label: '÷',   variant: 'operator', action: 'operator', value: '/' }, // 나누기

  // ── 2행: 7 8 9 × ─────────────────────────────────
  { id: 'seven',     label: '7',   variant: 'number',   action: 'number',   value: '7' },
  { id: 'eight',     label: '8',   variant: 'number',   action: 'number',   value: '8' },
  { id: 'nine',      label: '9',   variant: 'number',   action: 'number',   value: '9' },
  { id: 'multiply',  label: '×',   variant: 'operator', action: 'operator', value: '*' }, // 곱하기

  // ── 3행: 4 5 6 - ─────────────────────────────────
  { id: 'four',      label: '4',   variant: 'number',   action: 'number',   value: '4' },
  { id: 'five',      label: '5',   variant: 'number',   action: 'number',   value: '5' },
  { id: 'six',       label: '6',   variant: 'number',   action: 'number',   value: '6' },
  { id: 'subtract',  label: '-',   variant: 'operator', action: 'operator', value: '-' }, // 빼기

  // ── 4행: 1 2 3 + ─────────────────────────────────
  { id: 'one',       label: '1',   variant: 'number',   action: 'number',   value: '1' },
  { id: 'two',       label: '2',   variant: 'number',   action: 'number',   value: '2' },
  { id: 'three',     label: '3',   variant: 'number',   action: 'number',   value: '3' },
  { id: 'add',       label: '+',   variant: 'operator', action: 'operator', value: '+' }, // 더하기

  // ── 5행: +/- 0 . = ───────────────────────────────
  { id: 'toggle',    label: '+/-', variant: 'utility',  action: 'toggle' },               // 부호 전환
  { id: 'zero',      label: '0',   variant: 'number',   action: 'number',   value: '0' },
  { id: 'decimal',   label: '.',   variant: 'number',   action: 'decimal' },              // 소수점
  { id: 'equal',     label: '=',   variant: 'operator', action: 'calculate' },            // 계산 실행
]
