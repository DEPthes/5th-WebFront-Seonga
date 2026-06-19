# React 계산기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Week3 바닐라 JS 계산기를 React + CSS Modules로 재구현, 부동소수점 안전 처리 포함

**Architecture:** App → Calculator → Display + ButtonGrid → Button 계층 구조. 모든 계산 로직은 useCalculator 커스텀 훅에 격리. 컴포넌트는 UI + props 전달만 담당.

**Tech Stack:** React 18, Vite, CSS Modules, Inter 폰트

## Global Constraints

- rem 단위 사용 (px 금지, border/shadow 제외)
- CSS Modules: 각 컴포넌트마다 `.module.css` 파일
- global.css: reset, :root CSS 변수, 폰트 설정
- 반응형: min(100%, 24.375rem) 기준, 모바일 우선
- 부동소수점: `parseFloat((result).toPrecision(12))` 사용
- 0으로 나누기: "Error" 표시 후 초기화

---

### Task 1: Vite 프로젝트 초기화

**Files:**
- Create: `Week6/package.json`
- Create: `Week6/vite.config.js`
- Create: `Week6/index.html`
- Create: `Week6/src/main.jsx`

- [ ] Vite + React 프로젝트 초기화
```bash
cd /Users/leeseonga/5th-WebFront-Seonga/Assignment/Week6
npm create vite@latest . -- --template react
npm install
```

- [ ] 불필요한 보일러플레이트 제거
  - `src/App.css` 삭제
  - `src/assets/` 삭제
  - `src/App.jsx` 내용 비우기 (컴포넌트에서 작성)
  - `public/vite.svg` 삭제

---

### Task 2: global.css + App 셸

**Files:**
- Create: `src/styles/global.css`
- Modify: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/App.module.css`

**Interfaces:**
- Produces: `<App />` — 최상위 렌더 컴포넌트

- [ ] `src/styles/global.css` 작성
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --blue: #2e58e4;
  --white: #ffffff;
  --blue-soft: rgba(46, 88, 228, 0.08);
  --blue-line: rgba(46, 88, 228, 0.16);
  --shadow-card: 0 1.75rem 4.375rem rgba(46, 88, 228, 0.2);
  --shadow-btn: 0 0.625rem 1.375rem rgba(46, 88, 228, 0.14);
  --radius-card: 2rem;
  --radius-btn: 1.25rem;
  --gap-btn: 0.75rem;
  font-size: 16px;
}

body {
  min-height: 100vh;
  font-family: 'Inter', Arial, Helvetica, sans-serif;
  color: var(--blue);
  background:
    radial-gradient(circle at 50% 12%, var(--blue-soft), transparent 34%),
    linear-gradient(180deg, var(--white) 0%, rgba(46, 88, 228, 0.05) 100%);
}

button {
  font-family: inherit;
  border: none;
  cursor: pointer;
}
```

- [ ] `src/main.jsx` 수정
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] `src/App.jsx` 작성
```jsx
import styles from './App.module.css'
import Calculator from './components/Calculator/Calculator'

export default function App() {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>Calculator</h1>
      <Calculator />
    </main>
  )
}
```

- [ ] `src/App.module.css` 작성
```css
.wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 3rem 1.25rem;
}

.title {
  color: var(--blue);
  font-size: 1.875rem;
  font-weight: 800;
  text-shadow: 0 0.5rem 1.125rem rgba(46, 88, 228, 0.14);
}
```

---

### Task 3: useCalculator 훅

**Files:**
- Create: `src/hooks/useCalculator.js`

**Interfaces:**
- Produces:
  ```js
  const {
    currentNumber,  // string — 현재 디스플레이 숫자
    formula,        // string — "12 +" 형태의 수식
    handleNumber,   // (num: string) => void
    handleOperator, // (op: string) => void
    handleDecimal,  // () => void
    handleCalculate,// () => void
    handleClear,    // () => void
  } = useCalculator()
  ```

- [ ] `src/hooks/useCalculator.js` 작성
```js
import { useState } from 'react'

function safeCalc(a, op, b) {
  const prev = parseFloat(a)
  const curr = parseFloat(b)
  let result
  if (op === '+') result = prev + curr
  else if (op === '-') result = prev - curr
  else if (op === '*') result = prev * curr
  else if (op === '/') {
    if (curr === 0) return null
    result = prev / curr
  }
  return parseFloat(result.toPrecision(12))
}

export default function useCalculator() {
  const [currentNumber, setCurrentNumber] = useState('0')
  const [firstNumber, setFirstNumber] = useState('')
  const [operator, setOperator] = useState('')
  const [shouldReset, setShouldReset] = useState(false)

  const formula = firstNumber && operator ? `${firstNumber} ${operator}` : ''

  function handleNumber(num) {
    setCurrentNumber(prev => {
      if (prev === '0' || shouldReset) {
        setShouldReset(false)
        return num
      }
      if (prev.length >= 12) return prev
      return prev + num
    })
    if (shouldReset) setShouldReset(false)
  }

  function handleOperator(op) {
    if (firstNumber && operator && !shouldReset) {
      const result = safeCalc(firstNumber, operator, currentNumber)
      if (result === null) {
        setCurrentNumber('Error')
        setFirstNumber('')
        setOperator('')
        setShouldReset(true)
        return
      }
      const resultStr = String(result)
      setCurrentNumber(resultStr)
      setFirstNumber(resultStr)
    } else {
      setFirstNumber(currentNumber)
    }
    setOperator(op)
    setShouldReset(true)
  }

  function handleDecimal() {
    setCurrentNumber(prev => {
      const base = shouldReset ? '0' : prev
      if (shouldReset) setShouldReset(false)
      if (base.includes('.')) return base
      return base + '.'
    })
    if (shouldReset) setShouldReset(false)
  }

  function handleCalculate() {
    if (!firstNumber || !operator || shouldReset) return
    const result = safeCalc(firstNumber, operator, currentNumber)
    if (result === null) {
      setCurrentNumber('Error')
    } else {
      setCurrentNumber(String(result))
    }
    setFirstNumber('')
    setOperator('')
    setShouldReset(true)
  }

  function handleClear() {
    setCurrentNumber('0')
    setFirstNumber('')
    setOperator('')
    setShouldReset(false)
  }

  return {
    currentNumber,
    formula,
    handleNumber,
    handleOperator,
    handleDecimal,
    handleCalculate,
    handleClear,
  }
}
```

---

### Task 4: Button 컴포넌트

**Files:**
- Create: `src/components/Button/Button.jsx`
- Create: `src/components/Button/Button.module.css`

**Interfaces:**
- Consumes props: `{ label: string, variant: 'number'|'operator'|'clear'|'equal'|'decimal', onClick: () => void, span?: 'col2'|'row2' }`
- Produces: `<Button />` 재사용 컴포넌트

- [ ] `src/components/Button/Button.jsx` 작성
```jsx
import styles from './Button.module.css'

export default function Button({ label, variant = 'number', onClick, span }) {
  const cls = [
    styles.btn,
    styles[variant],
    span ? styles[span] : '',
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={cls} onClick={onClick} aria-label={label}>
      {label}
    </button>
  )
}
```

- [ ] `src/components/Button/Button.module.css` 작성
```css
.btn {
  height: 4rem;
  border: 1px solid var(--blue-line);
  border-radius: var(--radius-btn);
  background: rgba(255, 255, 255, 0.96);
  color: var(--blue);
  font-size: 1.375rem;
  font-weight: 700;
  box-shadow:
    0 0.5rem 1.125rem rgba(46, 88, 228, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  transition:
    transform 160ms ease,
    color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.btn:hover {
  color: var(--white);
  background: var(--blue);
  transform: translateY(-3px);
  box-shadow: var(--shadow-btn);
}

.btn:active {
  transform: translateY(0);
  box-shadow: 0 0.25rem 0.625rem rgba(46, 88, 228, 0.12);
}

.operator,
.equal,
.clear {
  color: var(--white);
  border-color: transparent;
  background: linear-gradient(145deg, var(--blue), #244bd0);
  box-shadow: var(--shadow-btn);
}

.operator:hover,
.equal:hover,
.clear:hover {
  color: var(--blue);
  background: var(--white);
  border-color: var(--blue-line);
}

.row2 {
  height: calc(8rem + var(--gap-btn));
  grid-row: span 2;
}

.col2 {
  grid-column: span 2;
}
```

---

### Task 5: ButtonGrid + 버튼 데이터 배열

**Files:**
- Create: `src/components/ButtonGrid/ButtonGrid.jsx`
- Create: `src/components/ButtonGrid/ButtonGrid.module.css`
- Create: `src/constants/buttons.js`

**Interfaces:**
- Consumes: `useCalculator` 에서 받은 핸들러 5개
- Produces: `<ButtonGrid handlers={...} />`

- [ ] `src/constants/buttons.js` 작성
```js
export const BUTTON_CONFIG = [
  { id: 'clear',    label: 'AC',  variant: 'clear',    action: 'clear' },
  { id: 'divide',   label: '÷',   variant: 'operator', action: 'operator', value: '/' },
  { id: 'multiply', label: '×',   variant: 'operator', action: 'operator', value: '*' },
  { id: 'subtract', label: '-',   variant: 'operator', action: 'operator', value: '-' },

  { id: 'seven',    label: '7',   variant: 'number',   action: 'number',   value: '7' },
  { id: 'eight',    label: '8',   variant: 'number',   action: 'number',   value: '8' },
  { id: 'nine',     label: '9',   variant: 'number',   action: 'number',   value: '9' },
  { id: 'add',      label: '+',   variant: 'operator', action: 'operator', value: '+', span: 'row2' },

  { id: 'four',     label: '4',   variant: 'number',   action: 'number',   value: '4' },
  { id: 'five',     label: '5',   variant: 'number',   action: 'number',   value: '5' },
  { id: 'six',      label: '6',   variant: 'number',   action: 'number',   value: '6' },

  { id: 'one',      label: '1',   variant: 'number',   action: 'number',   value: '1' },
  { id: 'two',      label: '2',   variant: 'number',   action: 'number',   value: '2' },
  { id: 'three',    label: '3',   variant: 'number',   action: 'number',   value: '3' },
  { id: 'equal',    label: '=',   variant: 'equal',    action: 'calculate', span: 'row2' },

  { id: 'zero',     label: '0',   variant: 'number',   action: 'number',   value: '0', span: 'col2' },
  { id: 'decimal',  label: '.',   variant: 'decimal',  action: 'decimal' },
]
```

- [ ] `src/components/ButtonGrid/ButtonGrid.jsx` 작성
```jsx
import Button from '../Button/Button'
import styles from './ButtonGrid.module.css'
import { BUTTON_CONFIG } from '../../constants/buttons'

export default function ButtonGrid({ handlers }) {
  function getClickHandler({ action, value }) {
    if (action === 'number')    return () => handlers.handleNumber(value)
    if (action === 'operator')  return () => handlers.handleOperator(value)
    if (action === 'decimal')   return handlers.handleDecimal
    if (action === 'calculate') return handlers.handleCalculate
    if (action === 'clear')     return handlers.handleClear
    return undefined
  }

  return (
    <div className={styles.grid}>
      {BUTTON_CONFIG.map(btn => (
        <Button
          key={btn.id}
          label={btn.label}
          variant={btn.variant}
          span={btn.span}
          onClick={getClickHandler(btn)}
        />
      ))}
    </div>
  )
}
```

- [ ] `src/components/ButtonGrid/ButtonGrid.module.css` 작성
```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap-btn);
}
```

---

### Task 6: Display 컴포넌트

**Files:**
- Create: `src/components/Display/Display.jsx`
- Create: `src/components/Display/Display.module.css`

**Interfaces:**
- Consumes props: `{ currentNumber: string, formula: string }`
- Produces: `<Display />` — 수식 + 현재값 표시

- [ ] `src/components/Display/Display.jsx` 작성
```jsx
import styles from './Display.module.css'

export default function Display({ currentNumber, formula }) {
  const isError = currentNumber === 'Error'
  const fontSize = currentNumber.length > 9
    ? styles.small
    : currentNumber.length > 6
      ? styles.medium
      : styles.large

  return (
    <div className={styles.display} aria-label="계산기 화면">
      <p className={styles.formula} aria-live="polite">{formula}</p>
      <p
        className={`${styles.current} ${fontSize} ${isError ? styles.error : ''}`}
        aria-live="polite"
      >
        {currentNumber}
      </p>
    </div>
  )
}
```

- [ ] `src/components/Display/Display.module.css` 작성
```css
.display {
  min-height: 9.625rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1.125rem;
  padding: 1.5rem;
  border-radius: 1.625rem;
  background: linear-gradient(145deg, var(--blue) 0%, #244bd0 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 1.125rem 2rem rgba(46, 88, 228, 0.22);
  overflow: hidden;
}

.formula {
  min-height: 1.25rem;
  color: var(--white);
  font-size: 0.9375rem;
  font-weight: 700;
  opacity: 0.78;
  word-break: break-all;
}

.current {
  width: 100%;
  color: var(--white);
  font-weight: 800;
  line-height: 1;
  text-align: right;
  word-break: break-all;
  transition: font-size 120ms ease;
}

.large  { font-size: clamp(2.25rem, 10vw, 3.25rem); }
.medium { font-size: clamp(1.75rem, 7vw, 2.5rem); }
.small  { font-size: clamp(1.375rem, 5vw, 1.875rem); }

.error {
  font-size: 1.5rem;
  opacity: 0.9;
}
```

---

### Task 7: Calculator 컴포넌트 + 전체 연결

**Files:**
- Create: `src/components/Calculator/Calculator.jsx`
- Create: `src/components/Calculator/Calculator.module.css`

**Interfaces:**
- Consumes: `useCalculator` 훅
- Produces: 완성된 계산기 UI

- [ ] `src/components/Calculator/Calculator.jsx` 작성
```jsx
import useCalculator from '../../hooks/useCalculator'
import Display from '../Display/Display'
import ButtonGrid from '../ButtonGrid/ButtonGrid'
import styles from './Calculator.module.css'

export default function Calculator() {
  const {
    currentNumber,
    formula,
    handleNumber,
    handleOperator,
    handleDecimal,
    handleCalculate,
    handleClear,
  } = useCalculator()

  return (
    <section className={styles.calculator} aria-label="계산기">
      <Display currentNumber={currentNumber} formula={formula} />
      <ButtonGrid
        handlers={{ handleNumber, handleOperator, handleDecimal, handleCalculate, handleClear }}
      />
    </section>
  )
}
```

- [ ] `src/components/Calculator/Calculator.module.css` 작성
```css
.calculator {
  width: min(100%, 24.375rem);
  padding: 1.375rem;
  border: 1px solid var(--blue-line);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(18px);
}

@media (max-width: 23.75rem) {
  .calculator {
    padding: 1rem;
    border-radius: 1.75rem;
  }
}
```

---

### Task 8: QA 체크리스트

- [ ] `npm run dev` 실행 후 브라우저 동작 확인
- [ ] 부동소수점: `0.1 + 0.2 = 0.3` 확인 (0.30000000000000004 아닌지)
- [ ] 0으로 나누기: `5 ÷ 0 =` → "Error" 표시 확인
- [ ] 연속 연산: `3 + 2 + 1 =` → 6 확인
- [ ] 긴 숫자 폰트 축소 확인 (10자리 이상)
- [ ] 모바일 뷰 (375px) 반응형 확인
- [ ] 소수점 중복 입력 방지 확인 (`1..` 불가)
- [ ] AC 후 상태 완전 초기화 확인
