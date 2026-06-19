// 최상위 컴포넌트
// 페이지 전체 레이아웃(배경, 중앙 정렬)을 담당하고 Calculator를 렌더링한다
import styles from './App.module.css'
import Calculator from './components/Calculator/Calculator'

export default function App() {
  return (
    // main: 페이지의 주요 콘텐츠 영역 (시맨틱 HTML)
    <main className={styles.app}>
      <Calculator />
    </main>
  )
}
