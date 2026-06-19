/**
 * Button 컴포넌트
 *
 * 역할: 계산기의 개별 버튼 하나를 렌더링하는 프레젠테이션(표현) 컴포넌트
 *       상태나 로직은 없으며, props만 받아서 UI를 표현한다
 *
 * Props:
 *  - label   : 버튼에 표시할 텍스트 (예: "7", "+", "AC", "⌫")
 *  - variant : 색상 스타일 클래스 ('number' | 'operator' | 'utility')
 *              기본값은 'number'
 *  - onClick : 클릭 시 실행할 핸들러 함수 (ButtonGrid에서 전달)
 *
 * CSS Modules 클래스 조합:
 *  styles.btn     → 모든 버튼 공통 스타일 (원형, 크기, 트랜지션)
 *  styles[variant] → variant 값에 해당하는 색상 스타일
 *  예: variant='operator' → styles.btn + styles.operator (주황색)
 */
import styles from './Button.module.css'

export default function Button({ label, variant = 'number', onClick }) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]}`}
      onClick={onClick}
      aria-label={label}  /* 스크린 리더가 버튼 내용을 읽도록 */
    >
      {label}
    </button>
  )
}
