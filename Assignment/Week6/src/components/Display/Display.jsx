/**
 * Display 컴포넌트
 *
 * 역할: 계산기 화면 영역 — 수식(formula)과 현재 숫자(currentNumber)를 표시한다
 *
 * Props:
 *  - currentNumber : 표시할 숫자 문자열 (예: "3.14", "-42", "Error")
 *  - formula       : 디스플레이 상단의 수식 문자열 (예: "3 +" / "" = 숨김)
 *
 * 글자 크기 자동 조절:
 *  숫자 자릿수에 따라 4단계 CSS 클래스를 적용해 넘침(overflow)을 방지한다
 *  (부호 '-'는 자릿수 계산에서 제외)
 */
import styles from './Display.module.css'

export default function Display({ currentNumber, formula }) {
  // Error 상태 감지 → 별도 에러 스타일 클래스 적용
  const isError = currentNumber === 'Error'

  // 부호를 제외한 실제 자릿수 계산 (예: "-1234" → 4자리)
  const len = currentNumber.replace('-', '').length

  // 자릿수에 따른 글자 크기 클래스 선택
  // 10자리 이상 → tiny / 7~9자리 → small / 5~6자리 → medium / 1~4자리 → large
  const sizeClass =
    len > 9 ? styles.tiny
    : len > 6 ? styles.small
    : len > 4 ? styles.medium
    : styles.large

  return (
    // 스크린 리더에게 이 영역이 "계산기 화면"임을 알림
    <div className={styles.display} aria-label="계산기 화면">

      {/*
        조건부 렌더링: formula가 빈 문자열('')이면 수식 줄을 렌더링하지 않는다
        aria-live="polite": 값이 바뀔 때 스크린 리더가 조용히 읽어준다
      */}
      {formula && (
        <p className={styles.formula} aria-live="polite">{formula}</p>
      )}

      {/*
        현재 숫자: 자릿수 클래스 + 에러 클래스를 동적으로 합성
        template literal로 여러 CSS Modules 클래스를 조합한다
      */}
      <p
        className={`${styles.current} ${sizeClass} ${isError ? styles.error : ''}`}
        aria-live="polite"
      >
        {currentNumber}
      </p>
    </div>
  )
}
