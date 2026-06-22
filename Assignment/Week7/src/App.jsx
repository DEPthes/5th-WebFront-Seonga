import { useState } from 'react'
import './index.css'

function Square({ value, onSquareClick, highlight, label }) {
  return (
    <button
      className={`square${highlight ? ' square--win' : ''}`}
      data-mark={value ?? ''} // null일 때 '' 을 넣어야 CSS [data-mark='X'] 셀렉터에 걸리지 않음
      onClick={onSquareClick}
      aria-label={value ? `${value} - ${label}` : label}
    >
      {value}
    </button>
  )
}

function Board({ xIsNext, squares, onPlay }) {
  function handleClick(i) {
    if (squares[i] || calculateWinner(squares)) return

    const nextSquares = squares.slice()
    nextSquares[i] = xIsNext ? 'X' : 'O'
    onPlay(nextSquares, i)
  }

  const result = calculateWinner(squares)
  const winnerLine = result ? result.line : []

  let status
  if (result) {
    status = `승자: ${result.winner}`
  } else if (squares.every(Boolean)) {
    status = '무승부!'
  } else {
    status = `다음 플레이어: ${xIsNext ? 'X' : 'O'}`
  }

  return (
    <>
      <div className="status">{status}</div>
      {/* .board 래퍼: 행들을 .game-board의 flex gap에서 분리해 행 간격이 2배로 벌어지는 것을 방지 */}
      <div className="board">
        {[0, 1, 2].map((row) => (
          <div key={row} className="board-row">
            {[0, 1, 2].map((col) => {
              const i = row * 3 + col
              return (
                <Square
                  key={i}
                  value={squares[i]}
                  onSquareClick={() => handleClick(i)}
                  highlight={winnerLine.includes(i)}
                  label={`${row + 1}행 ${col + 1}열`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

export default function Game() {
  const [history, setHistory] = useState([
    { squares: Array(9).fill(null), location: null },
  ])
  const [currentMove, setCurrentMove] = useState(0)
  const [isAscending, setIsAscending] = useState(true)
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 })

  const xIsNext = currentMove % 2 === 0
  const currentSquares = history[currentMove].squares

  function handlePlay(nextSquares, location) {
    const nextHistory = [
      ...history.slice(0, currentMove + 1),
      { squares: nextSquares, location },
    ]
    setHistory(nextHistory)
    setCurrentMove(nextHistory.length - 1)
  }

  function jumpTo(move) {
    setCurrentMove(move)
  }

  function handleRestart() {
    // currentMove가 아닌 history 마지막 항목으로 판정:
    // 타임트래블 후 재시작해도 최종 결과가 정확히 반영된다
    const latestSquares = history[history.length - 1].squares
    const latestResult = calculateWinner(latestSquares)
    const latestIsDraw = !latestResult && latestSquares.every(Boolean)

    if (latestResult) {
      setScores((prev) => ({
        ...prev,
        [latestResult.winner]: prev[latestResult.winner] + 1,
      }))
    } else if (latestIsDraw) {
      setScores((prev) => ({ ...prev, draw: prev.draw + 1 }))
    }

    setHistory([{ squares: Array(9).fill(null), location: null }])
    setCurrentMove(0)
  }

  const moves = history.map(({ location }, move) => {
    const row = location !== null ? Math.floor(location / 3) + 1 : null
    const col = location !== null ? (location % 3) + 1 : null
    const label = move === 0 ? '게임 시작' : `${move}수 (${row}행 ${col}열)`

    return {
      move,
      element:
        move === currentMove ? (
          <span className="current-move">현재: {label}</span>
        ) : (
          <button onClick={() => jumpTo(move)}>{label}</button>
        ),
    }
  })

  const sortedMoves = isAscending ? moves : [...moves].reverse()

  return (
    <div className="game">
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
        <button className="restart-btn" onClick={handleRestart}>
          새 게임
        </button>
      </div>

      <div className="game-info">
        <div className="scoreboard">
          <span className="score-x">X  {scores.X}승</span>
          <span className="score-draw">무 {scores.draw}</span>
          <span className="score-o">O  {scores.O}승</span>
        </div>

        <button className="sort-btn" onClick={() => setIsAscending((v) => !v)}>
          {isAscending ? '▼ 내림차순' : '▲ 오름차순'}
        </button>

        {/* key={move}: 정렬 방향이 바뀌어도 항목 식별이 일관되도록 index 대신 move 값 사용 */}
        <ol>
          {sortedMoves.map(({ move, element }) => (
            <li key={move}>{element}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // 가로
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // 세로
    [0, 4, 8], [2, 4, 6],             // 대각
  ]
  for (const line of lines) {
    const [a, b, c] = line
    // squares[a] 선행 체크: null 셋이 일치하는 오탐 방지
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line }
    }
  }
  return null
}
