/**
 * ButtonGrid 컴포넌트
 *
 * 역할: BUTTON_CONFIG 배열을 순회하여 Button 컴포넌트 20개를 렌더링한다
 *       각 버튼의 action 값에 따라 적절한 핸들러 함수를 연결한다
 *
 * Props:
 *  - handlers : Calculator에서 내려준 핸들러 객체
 *    { handleNumber, handleOperator, handleDecimal, handleCalculate,
 *      handleClear, handleBackspace, handlePercent, handleToggle }
 *
 * 렌더링 패턴: 배열 map + key
 *  BUTTON_CONFIG를 map으로 순회 → 각 버튼 객체에서 key(=id), props를 추출
 *  key는 React가 리스트를 효율적으로 업데이트하기 위해 반드시 필요하다
 */
import Button from '../Button/Button'
import styles from './ButtonGrid.module.css'
import { BUTTON_CONFIG } from '../../constants/buttons'

export default function ButtonGrid({ handlers }) {
  /**
   * 버튼 객체의 action에 따라 올바른 핸들러 함수를 반환하는 헬퍼
   *
   * number / operator 는 value를 인자로 넘겨야 하므로 화살표 함수로 감싼다
   * 그 외 action들은 핸들러를 그대로 전달한다
   */
  function getClickHandler({ action, value }) {
    if (action === 'number')    return () => handlers.handleNumber(value)
    if (action === 'operator')  return () => handlers.handleOperator(value)
    if (action === 'decimal')   return handlers.handleDecimal
    if (action === 'calculate') return handlers.handleCalculate
    if (action === 'clear')     return handlers.handleClear
    if (action === 'backspace') return handlers.handleBackspace
    if (action === 'percent')   return handlers.handlePercent
    if (action === 'toggle')    return handlers.handleToggle
    return undefined
  }

  return (
    // CSS Grid 4열로 버튼을 배치 (ButtonGrid.module.css 참고)
    <div className={styles.grid}>
      {BUTTON_CONFIG.map(btn => (
        <Button
          key={btn.id}              /* React 리스트 key: 각 버튼을 고유하게 식별 */
          label={btn.label}         /* 버튼에 표시할 텍스트 */
          variant={btn.variant}     /* 색상 스타일 ('number' | 'operator' | 'utility') */
          onClick={getClickHandler(btn)} /* action에 맞는 핸들러 함수 */
        />
      ))}
    </div>
  )
}
