/**
 * Calculator 컴포넌트
 *
 * 역할: 계산기 전체의 조합(Composition) 레이어
 *  - useCalculator 훅에서 상태와 핸들러를 가져온다
 *  - Display에 표시용 데이터를 props로 전달한다
 *  - ButtonGrid에 핸들러 객체를 props로 전달한다
 *
 * 이 컴포넌트 자체는 상태나 로직을 보유하지 않는다.
 * UI와 비즈니스 로직을 분리하는 '컨테이너 컴포넌트' 패턴이다.
 */
import useCalculator from '../../hooks/useCalculator'
import Display from '../Display/Display'
import ButtonGrid from '../ButtonGrid/ButtonGrid'
import styles from './Calculator.module.css'

export default function Calculator() {
  // 커스텀 훅에서 상태값·핸들러를 구조 분해로 꺼낸다
  const {
    currentNumber,    // 디스플레이에 표시할 현재 숫자 문자열
    formula,          // 디스플레이 상단에 표시할 수식 (예: "3 +")
    handleNumber,     // 숫자 버튼 핸들러
    handleOperator,   // 연산자 버튼 핸들러
    handleDecimal,    // 소수점 버튼 핸들러
    handleCalculate,  // = 버튼 핸들러
    handleClear,      // AC 버튼 핸들러
    handleBackspace,  // ⌫ 버튼 핸들러
    handlePercent,    // % 버튼 핸들러
    handleToggle,     // +/- 버튼 핸들러
  } = useCalculator()

  return (
    // section: 계산기 전체 영역 (시맨틱 HTML, 스크린 리더 aria-label)
    <section className={styles.calculator} aria-label="계산기">
      {/* 디스플레이: 수식(formula)과 현재 숫자(currentNumber) 표시 */}
      <Display currentNumber={currentNumber} formula={formula} />

      {/*
        ButtonGrid: 핸들러를 객체 하나로 묶어서 전달
        → ButtonGrid 내부에서 버튼의 action에 따라 적절한 핸들러를 선택한다
      */}
      <ButtonGrid
        handlers={{
          handleNumber,
          handleOperator,
          handleDecimal,
          handleCalculate,
          handleClear,
          handleBackspace,
          handlePercent,
          handleToggle,
        }}
      />
    </section>
  )
}
