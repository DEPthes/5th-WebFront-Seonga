// React 앱의 진입점(entry point)
// createRoot로 DOM의 #root 요소에 React 트리를 마운트한다
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 전역 스타일(reset, CSS 변수, 폰트) 적용 — 컴포넌트보다 먼저 불러와야 한다
import './styles/global.css'
import App from './App'

// StrictMode: 개발 환경에서 잠재적 문제를 감지하는 래퍼 (프로덕션에선 영향 없음)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
