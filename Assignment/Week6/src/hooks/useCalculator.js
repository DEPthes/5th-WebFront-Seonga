// 계산기 로직을 담당하는 커스텀 훅
// UI와 완전히 분리된 상태(state)·연산 함수를 제공한다
import { useReducer } from 'react'

/**
 * 두 숫자를 안전하게 연산하는 순수 함수
 * - toPrecision(12): 부동소수점 오차 방지 (예: 0.1 + 0.2 → 0.3)
 * - 알 수 없는 연산자 입력 시 null 반환 → 호출부에서 'Error' 처리
 * - 0 나누기 / Infinity / NaN 발생 시 null 반환 → 호출부에서 'Error' 처리
 */
function safeCalc(a, op, b) {
  const prev = parseFloat(a)
  const curr = parseFloat(b)
  let result
  if (op === '+') result = prev + curr
  else if (op === '-') result = prev - curr
  else if (op === '*') result = prev * curr
  else if (op === '/') {
    if (curr === 0) return null // 0 나누기 → Error
    result = prev / curr
  } else {
    return null // 알 수 없는 연산자 → TypeError 방지
  }
  const rounded = parseFloat(result.toPrecision(12))
  // Infinity(오버플로우)·NaN(0*Infinity 등) 모두 Error로 처리
  if (!isFinite(rounded) || isNaN(rounded)) return null
  return rounded
}

// ─────────────────────────────────────────
// 초기 상태
// ─────────────────────────────────────────
const initialState = {
  currentNumber: '0', // 현재 디스플레이에 표시되는 숫자 문자열
  firstNumber: '',    // 연산자 입력 전 저장해두는 첫 번째 피연산자
  operator: '',       // 현재 선택된 연산자 (+, -, *, /)
  shouldReset: false, // true이면 다음 숫자 입력 시 디스플레이를 초기화한다
                      // (연산자 누른 직후 / = 누른 직후에 true가 됨)
}

// ─────────────────────────────────────────
// reducer: action.type에 따라 새로운 state를 반환하는 순수 함수
// 모든 상태 전환 로직이 한 곳에 모여 있어 흐름을 추적하기 쉽다
// ─────────────────────────────────────────
function reducer(state, action) {
  const { currentNumber, firstNumber, operator, shouldReset } = state

  switch (action.type) {

    // ── 숫자 버튼 (0~9) 처리 ──────────────────────────────
    case 'number': {
      const num = action.payload
      // shouldReset이 true면 새 숫자로 교체 (= / 연산자 직후)
      if (shouldReset) return { ...state, currentNumber: num, shouldReset: false }
      if (currentNumber === '0') return { ...state, currentNumber: num } // 선행 0 제거 (01 → 1)
      // 부호(-)·소수점(.)을 제외한 실제 자릿수 기준으로 최대 12자리 제한
      if (currentNumber.replace(/[-.]/, '').length >= 12) return state
      return { ...state, currentNumber: currentNumber + num }
    }

    // ── 연산자 버튼 (+, -, *, /) 처리 ─────────────────────
    case 'operator': {
      const op = action.payload
      // Error 상태에서는 연산자 입력 무시
      if (currentNumber === 'Error') return state

      // 이미 firstNumber와 operator가 있고 새 숫자도 입력된 경우 → 연쇄 연산
      // 예: 3 + 2 + → 먼저 3+2=5 계산 후 5를 firstNumber로 저장
      if (firstNumber && operator && !shouldReset) {
        const result = safeCalc(firstNumber, operator, currentNumber)
        if (result === null) {
          return { currentNumber: 'Error', firstNumber: '', operator: '', shouldReset: true }
        }
        const resultStr = String(result)
        return { currentNumber: resultStr, firstNumber: resultStr, operator: op, shouldReset: true }
      }

      // 첫 연산자 입력: 현재 숫자를 firstNumber로 저장
      return { ...state, firstNumber: currentNumber, operator: op, shouldReset: true }
    }

    // ── 소수점(.) 처리 ─────────────────────────────────────
    case 'decimal': {
      // shouldReset 상태에서 소수점 누르면 "0."으로 시작
      if (shouldReset) return { ...state, currentNumber: '0.', shouldReset: false }
      // 이미 소수점이 있으면 중복 입력 방지
      if (currentNumber.includes('.')) return state
      return { ...state, currentNumber: currentNumber + '.' }
    }

    // ── = 버튼 처리 ────────────────────────────────────────
    case 'calculate': {
      // 연산에 필요한 값이 없거나 이미 결과 상태면 무시 (= 연타 방지)
      if (!firstNumber || !operator || shouldReset) return state
      const result = safeCalc(firstNumber, operator, currentNumber)
      return {
        currentNumber: result === null ? 'Error' : String(result),
        firstNumber: '',
        operator: '',
        shouldReset: true,
      }
    }

    // ── AC(All Clear) 처리 — 모든 상태를 초기값으로 리셋 ──
    case 'clear':
      return initialState

    // ── ⌫ (백스페이스) 처리 — 마지막 한 자리 삭제 ──────────
    case 'backspace': {
      // 계산 결과 / 연산자 입력 직후에는 삭제 불가
      if (shouldReset) return state
      // Error 상태면 0으로 초기화
      if (currentNumber === 'Error') return { ...state, currentNumber: '0' }
      // 한 자리 남았거나 "-X" 형태이면 0으로
      if (currentNumber.length <= 1) return { ...state, currentNumber: '0' }
      if (currentNumber.length === 2 && currentNumber.startsWith('-')) return { ...state, currentNumber: '0' }
      return { ...state, currentNumber: currentNumber.slice(0, -1) }
    }

    // ── % 처리 — 현재 숫자를 100으로 나눔 ─────────────────
    case 'percent': {
      if (currentNumber === 'Error') return state
      const value = parseFloat(currentNumber) / 100
      return { ...state, currentNumber: String(parseFloat(value.toPrecision(12))) }
    }

    // ── +/- 처리 — 부호 전환 (양수 ↔ 음수) ────────────────
    case 'toggle': {
      // 0이나 Error에서는 부호 전환 불필요
      if (currentNumber === 'Error' || currentNumber === '0') return state
      const toggled = currentNumber.startsWith('-') ? currentNumber.slice(1) : '-' + currentNumber
      return { ...state, currentNumber: toggled }
    }

    default:
      return state
  }
}

export default function useCalculator() {
  // 모든 계산기 상태를 단일 useReducer로 관리
  // reducer와 initialState는 모듈 레벨에 정의되어 렌더마다 재생성되지 않는다
  const [state, dispatch] = useReducer(reducer, initialState)
  const { currentNumber, firstNumber, operator } = state

  // 디스플레이 상단에 보여줄 수식 문자열 (예: "3 ×")
  // 내부 연산자(*·/)를 UI 표기(×·÷)로 변환, firstNumber와 operator가 모두 있을 때만 표시
  const displayOperator = operator === '*' ? '×' : operator === '/' ? '÷' : operator
  const formula = firstNumber && operator ? `${firstNumber} ${displayOperator}` : ''

  // 컴포넌트에서 사용할 상태값과 핸들러를 반환
  // 핸들러는 dispatch를 감싸 action 객체 생성을 컴포넌트에서 숨긴다
  return {
    currentNumber, // 현재 디스플레이 숫자
    formula,       // 상단 수식 텍스트
    handleNumber:    (num) => dispatch({ type: 'number',   payload: num }),
    handleOperator:  (op)  => dispatch({ type: 'operator', payload: op }),
    handleDecimal:   ()    => dispatch({ type: 'decimal' }),
    handleCalculate: ()    => dispatch({ type: 'calculate' }),
    handleClear:     ()    => dispatch({ type: 'clear' }),
    handleBackspace: ()    => dispatch({ type: 'backspace' }),
    handlePercent:   ()    => dispatch({ type: 'percent' }),
    handleToggle:    ()    => dispatch({ type: 'toggle' }),
  }
}
