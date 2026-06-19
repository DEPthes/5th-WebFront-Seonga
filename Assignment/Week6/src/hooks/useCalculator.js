// 계산기 로직을 담당하는 커스텀 훅
// UI와 완전히 분리된 상태(state)·연산 함수를 제공한다
import { useState } from 'react'

/**
 * 두 숫자를 안전하게 연산하는 순수 함수
 * - toPrecision(12): 부동소수점 오차 방지 (예: 0.1 + 0.2 → 0.3)
 * - 0 나누기 시 null 반환 → 호출부에서 'Error' 처리
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
  }
  // toPrecision(12) 후 parseFloat으로 불필요한 후행 0 제거
  return parseFloat(result.toPrecision(12))
}

export default function useCalculator() {
  // 현재 디스플레이에 표시되는 숫자 문자열
  const [currentNumber, setCurrentNumber] = useState('0')
  // 연산자 입력 전 저장해두는 첫 번째 피연산자
  const [firstNumber, setFirstNumber] = useState('')
  // 현재 선택된 연산자 (+, -, *, /)
  const [operator, setOperator] = useState('')
  // true이면 다음 숫자 입력 시 디스플레이를 초기화한다
  // (연산자 누른 직후 / = 누른 직후에 true가 됨)
  const [shouldReset, setShouldReset] = useState(false)

  // 디스플레이 상단에 보여줄 수식 문자열 (예: "3 +")
  // firstNumber와 operator가 모두 있을 때만 표시
  const formula = firstNumber && operator ? `${firstNumber} ${operator}` : ''

  // ─────────────────────────────────────────
  // 숫자 버튼 (0~9) 처리
  // ─────────────────────────────────────────
  function handleNumber(num) {
    // shouldReset이 true면 새 숫자로 교체 (= / 연산자 직후)
    if (shouldReset) {
      setCurrentNumber(num)
      setShouldReset(false)
      return
    }
    setCurrentNumber(prev => {
      if (prev === '0') return num          // 선행 0 제거 (01 → 1)
      if (prev.length >= 12) return prev    // 최대 12자리 입력 제한
      return prev + num
    })
  }

  // ─────────────────────────────────────────
  // 연산자 버튼 (+, -, ×, ÷) 처리
  // ─────────────────────────────────────────
  function handleOperator(op) {
    // Error 상태에서는 연산자 입력 무시
    if (currentNumber === 'Error') return

    // 이미 firstNumber와 operator가 있고 새 숫자도 입력된 경우 → 연쇄 연산
    // 예: 3 + 2 + → 먼저 3+2=5 계산 후 5를 firstNumber로 저장
    if (firstNumber && operator && !shouldReset) {
      const result = safeCalc(firstNumber, operator, currentNumber)
      if (result === null) {
        // 0 나누기 오류 처리
        setCurrentNumber('Error')
        setFirstNumber('')
        setOperator('')
        setShouldReset(true)
        return
      }
      const resultStr = String(result)
      setCurrentNumber(resultStr)
      setFirstNumber(resultStr)
      setOperator(op)
      setShouldReset(true)
      return
    }

    // 첫 연산자 입력: 현재 숫자를 firstNumber로 저장
    setFirstNumber(currentNumber)
    setOperator(op)
    setShouldReset(true)
  }

  // ─────────────────────────────────────────
  // 소수점(.) 처리
  // ─────────────────────────────────────────
  function handleDecimal() {
    // shouldReset 상태에서 소수점 누르면 "0."으로 시작
    if (shouldReset) {
      setCurrentNumber('0.')
      setShouldReset(false)
      return
    }
    // 이미 소수점이 있으면 중복 입력 방지
    setCurrentNumber(prev => {
      if (prev.includes('.')) return prev
      return prev + '.'
    })
  }

  // ─────────────────────────────────────────
  // = 버튼 처리
  // ─────────────────────────────────────────
  function handleCalculate() {
    // 연산에 필요한 값이 없거나 이미 결과 상태면 무시 (= 연타 방지)
    if (!firstNumber || !operator || shouldReset) return

    const result = safeCalc(firstNumber, operator, currentNumber)
    if (result === null) {
      setCurrentNumber('Error')
    } else {
      setCurrentNumber(String(result))
    }
    // 연산 완료 후 firstNumber·operator 초기화
    setFirstNumber('')
    setOperator('')
    setShouldReset(true)
  }

  // ─────────────────────────────────────────
  // AC(All Clear) 처리 — 모든 상태를 초기값으로 리셋
  // ─────────────────────────────────────────
  function handleClear() {
    setCurrentNumber('0')
    setFirstNumber('')
    setOperator('')
    setShouldReset(false)
  }

  // ─────────────────────────────────────────
  // ⌫ (백스페이스) 처리 — 마지막 한 자리 삭제
  // ─────────────────────────────────────────
  function handleBackspace() {
    // 계산 결과 / 연산자 입력 직후에는 삭제 불가
    if (shouldReset) return
    // Error 상태면 0으로 초기화
    if (currentNumber === 'Error') {
      setCurrentNumber('0')
      return
    }
    setCurrentNumber(prev => {
      // 한 자리 남았거나 "-X" 형태이면 0으로
      if (prev.length <= 1) return '0'
      if (prev.length === 2 && prev.startsWith('-')) return '0'
      return prev.slice(0, -1)
    })
  }

  // ─────────────────────────────────────────
  // % 처리 — 현재 숫자를 100으로 나눔
  // ─────────────────────────────────────────
  function handlePercent() {
    if (currentNumber === 'Error') return
    const value = parseFloat(currentNumber) / 100
    setCurrentNumber(String(parseFloat(value.toPrecision(12))))
  }

  // ─────────────────────────────────────────
  // +/- 처리 — 부호 전환 (양수 ↔ 음수)
  // ─────────────────────────────────────────
  function handleToggle() {
    // 0이나 Error에서는 부호 전환 불필요
    if (currentNumber === 'Error' || currentNumber === '0') return
    setCurrentNumber(prev =>
      prev.startsWith('-') ? prev.slice(1) : '-' + prev
    )
  }

  // 컴포넌트에서 사용할 상태값과 핸들러를 반환
  return {
    currentNumber, // 현재 디스플레이 숫자
    formula,       // 상단 수식 텍스트
    handleNumber,
    handleOperator,
    handleDecimal,
    handleCalculate,
    handleClear,
    handleBackspace,
    handlePercent,
    handleToggle,
  }
}
