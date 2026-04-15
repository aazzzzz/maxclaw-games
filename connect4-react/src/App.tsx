import { useState, useCallback, useEffect, useRef } from 'react'

type Player = 1 | 2
type Cell = 0 | Player
type Board = Cell[][]
type GameMode = 'pvp' | 'ai'

const ROWS = 6
const COLS = 7
const EMPTY = 0
const RED: Player = 1
const YELLOW: Player = 2

const RED_COLOR = '#e84040'
const YELLOW_COLOR = '#f5c518'
const BLUE_BOARD = '#2266cc'
const EMPTY_SLOT = '#0a1a3a'
const CELL_SIZE = 64

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as Cell[])
}

function getDropRow(board: Board, col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r
  }
  return -1
}

function checkWin(board: Board, col: number, row: number, player: Player): [boolean, [number, number][]] {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    const cells: [number, number][] = [[row, col]]
    for (let i = 1; i < 4; i++) {
      const nr = row + dr * i, nc = col + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break
      cells.push([nr, nc])
    }
    for (let i = 1; i < 4; i++) {
      const nr = row - dr * i, nc = col - dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break
      cells.push([nr, nc])
    }
    cells.sort((a, b) => a[0] * COLS + a[1] - (b[0] * COLS + b[1]))
    if (cells.length >= 4) return [true, cells.slice(0, 4)]
  }
  return [false, []]
}

function isDraw(board: Board): boolean {
  return board[0].every(c => c !== EMPTY)
}

// ─── AI ────────────────────────────────────────────────────────────────
function countThreats(board: Board, r: number, c: number, player: Player): number {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]]
  let score = 0
  for (const [dr, dc] of dirs) {
    let cnt = 1, open = 0
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      if (board[nr][nc] === player) cnt++
      else { if (!board[nr][nc]) open++; break }
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
      if (board[nr][nc] === player) cnt++
      else { if (!board[nr][nc]) open++; break }
    }
    if (cnt >= 4 && open > 0) score += 10000
    else if (cnt === 3 && open > 0) score += 3000
    else if (cnt === 2 && open > 1) score += 300
  }
  return score
}

function simpleEval(board: Board, player: Player): number {
  let score = 0
  const centerCol = Math.floor(COLS / 2)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === player) {
        score += (3 - Math.abs(c - centerCol)) * 2 + (ROWS - r) * 0.5
        score += countThreats(board, r, c, player)
      }
    }
  }
  return score
}

function bestAiColumn(board: Board): number {
  // 1. Win immediately?
  for (let c = 0; c < COLS; c++) {
    const r = getDropRow(board, c)
    if (r < 0) continue
    board[r][c] = YELLOW
    const [w] = checkWin(board, c, r, YELLOW)
    board[r][c] = EMPTY
    if (w) return c
  }
  // 2. Block opponent win?
  for (let c = 0; c < COLS; c++) {
    const r = getDropRow(board, c)
    if (r < 0) continue
    board[r][c] = RED
    const [w] = checkWin(board, c, r, RED)
    board[r][c] = EMPTY
    if (w) return c
  }
  // 3. Best position by evaluation
  let best = -Infinity, bestC = 3
  for (let c = 0; c < COLS; c++) {
    const r = getDropRow(board, c)
    if (r < 0) continue
    board[r][c] = YELLOW
    const sc = simpleEval(board, YELLOW)
    board[r][c] = EMPTY
    if (sc > best) { best = sc; bestC = c }
  }
  return bestC
}

// ─── Components ─────────────────────────────────────────────────────────
function Piece({ player, glow = false, win = false }: { player: Player; glow?: boolean; win?: boolean }) {
  const color = player === RED ? RED_COLOR : YELLOW_COLOR
  return (
    <div
      className="rounded-full w-full h-full flex items-center justify-center"
      style={{
        background: win
          ? `radial-gradient(circle at 35% 35%, ${color}, ${color} 70%, #111)`
          : `radial-gradient(circle at 35% 35%, ${lighten(color)}, ${color} 70%, ${darken(color)} 100%)`,
        boxShadow: glow
          ? `0 0 12px 4px ${color}80`
          : `inset 0 -3px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)`,
        border: `2px solid ${darken(color)}`,
      }}
    >
      {win && (
        <div className="w-3/4 h-3/4 rounded-full border-4 border-white/60" style={{ borderColor: 'rgba(255,255,255,0.6)' }} />
      )}
    </div>
  )
}

function PreviewPiece({ player }: { player: Player }) {
  const color = player === RED ? RED_COLOR : YELLOW_COLOR
  return (
    <div
      className="rounded-full w-full h-full flex items-center justify-center opacity-55"
      style={{
        background: `radial-gradient(circle at 35% 35%, ${lighten(color)}, ${color} 70%, ${darken(color)} 100%)`,
        boxShadow: `0 0 8px ${color}60`,
      }}
    />
  )
}

function adjust(hex: string, amt: number): string {
  const c = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((c >> 16) & 0xff) + Math.round(255 * amt)))
  const g = Math.min(255, Math.max(0, ((c >> 8) & 0xff) + Math.round(255 * amt)))
  const b = Math.min(255, Math.max(0, (c & 0xff) + Math.round(255 * amt)))
  return `rgb(${r},${g},${b})`
}
const lighten = (hex: string) => adjust(hex, 0.35)
const darken = (hex: string) => adjust(hex, -0.2)

// ─── Main App ───────────────────────────────────────────────────────────
export default function App() {
  const [board, setBoard] = useState<Board>(createBoard)
  const [currentPlayer, setCurrentPlayer] = useState<Player>(RED)
  const [gameOver, setGameOver] = useState(false)
  const [gameMode, setGameMode] = useState<GameMode>('pvp')
  const [winner, setWinner] = useState<Player | 'draw' | null>(null)
  const [winCells, setWinCells] = useState<[number, number][]>([])
  const [hoverCol, setHoverCol] = useState<number>(-1)
  const [lastMove, setLastMove] = useState<[number, number] | null>(null)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const resetGame = useCallback(() => {
    setBoard(createBoard())
    setCurrentPlayer(RED)
    setGameOver(false)
    setWinner(null)
    setWinCells([])
    setHoverCol(-1)
    setLastMove(null)
    setIsAiThinking(false)
  }, [])

  const placePiece = useCallback((col: number, player: Player): boolean => {
    const row = getDropRow(board, col)
    if (row < 0) return false
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = player
    setBoard(newBoard)
    setLastMove([row, col])
    const [won, cells] = checkWin(newBoard, col, row, player)
    if (won) {
      setGameOver(true)
      setWinner(player)
      setWinCells(cells)
      return true
    }
    if (isDraw(newBoard)) {
      setGameOver(true)
      setWinner('draw')
      return true
    }
    setCurrentPlayer(player === RED ? YELLOW : RED)
    return true
  }, [board])

  const handleAiMove = useCallback(() => {
    // Need current board state, use a slight delay
    setIsAiThinking(true)
    setTimeout(() => {
      const col = bestAiColumn(board)
      if (col >= 0) {
        const row = getDropRow(board, col)
        if (row >= 0) {
          const newBoard = board.map(r => [...r])
          newBoard[row][col] = YELLOW
          setBoard(newBoard)
          setLastMove([row, col])
          const [won, cells] = checkWin(newBoard, col, row, YELLOW)
          if (won) {
            setGameOver(true)
            setWinner(YELLOW)
            setWinCells(cells)
            setIsAiThinking(false)
            return
          }
          if (isDraw(newBoard)) {
            setGameOver(true)
            setWinner('draw')
            setIsAiThinking(false)
            return
          }
          setCurrentPlayer(RED)
        }
      }
      setIsAiThinking(false)
    }, 600)
  }, [board])

  const handleCellClick = (col: number) => {
    if (gameOver) return
    if (gameMode === 'ai' && currentPlayer === YELLOW) return
    if (isAiThinking) return
    const row = getDropRow(board, col)
    if (row < 0) return
    const placed = placePiece(col, currentPlayer)
    if (placed && gameMode === 'ai' && currentPlayer === RED && !gameOver) {
      // AI move triggered after state update
    }
  }

  // Trigger AI move when currentPlayer changes to YELLOW in AI mode
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === YELLOW && !gameOver && !isAiThinking) {
      handleAiMove()
    }
  }, [currentPlayer, gameMode, gameOver, isAiThinking, handleAiMove])

  const statusColor =
    winner === 'draw' ? 'text-yellow-400' :
    winner ? (winner === RED ? 'text-red-400' : 'text-yellow-400') :
    currentPlayer === RED ? 'text-red-400' : 'text-yellow-400'

  const statusText =
    winner === 'draw' ? '🤝 平局！' :
    winner === RED ? '🔴 红方获胜！' :
    winner === YELLOW ? '🟡 黄方获胜！' :
    isAiThinking ? '🤖 AI思考中…' :
    currentPlayer === RED ? '🔴 红方回合' : '🟡 黄方回合'

  const cellWidth = boardRef.current
    ? Math.min(
        (boardRef.current.clientWidth - 16) / COLS,
        CELL_SIZE,
        (window.innerHeight - 280) / ROWS
      )
    : CELL_SIZE

  return (
    <div className="min-h-screen bg-[#0a0a18] flex flex-col items-center justify-center px-3 py-4 gap-3 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[#c8a040] text-lg font-bold tracking-widest">🟡 Connect 4</h1>
        <a
          href="../"
          className="px-3 py-1 text-[#c8a040] text-xs rounded-lg border border-[#c8a040]/40 bg-[#c8a040]/10 backdrop-blur hover:bg-[#c8a040]/25 transition-colors"
        >
          🏠 返回主页
        </a>
      </div>

      {/* Status */}
      <div className={`px-4 py-1.5 rounded-xl border font-bold text-sm ${statusColor} ${
        winner === 'draw' ? 'border-yellow-400/40 bg-yellow-400/10' :
        winner === RED ? 'border-red-400/40 bg-red-400/10' :
        winner === YELLOW ? 'border-yellow-400/40 bg-yellow-400/10' :
        currentPlayer === RED ? 'border-red-400/40 bg-red-400/10' : 'border-yellow-400/40 bg-yellow-400/10'
      }`}>
        {statusText}
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: BLUE_BOARD, padding: 4 }}
      >
        {/* Column hover indicators */}
        {!gameOver && !isAiThinking && hoverCol >= 0 && hoverCol < COLS && getDropRow(board, hoverCol) >= 0 && (
          <div
            className="absolute top-0 z-10 flex"
            style={{
              left: hoverCol * cellWidth + 4,
              width: cellWidth,
              height: cellWidth,
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          >
            <div className="w-full h-full p-1">
              <PreviewPiece player={currentPlayer} />
            </div>
          </div>
        )}

        {/* Column selection strip */}
        <div
          className="flex"
          style={{ height: cellWidth * 0.8 }}
          onMouseLeave={() => setHoverCol(-1)}
        >
          {Array.from({ length: COLS }).map((_, col) => (
            <div
              key={col}
              className="flex-1 cursor-pointer"
              style={{ width: cellWidth }}
              onMouseEnter={() => setHoverCol(col)}
              onClick={() => handleCellClick(col)}
            />
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-1"
          style={{
            gridTemplateRows: `repeat(${ROWS}, ${cellWidth}px)`,
            gridTemplateColumns: `repeat(${COLS}, ${cellWidth}px)`,
          }}
        >
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const isWin = winCells.some(([wr, wc]) => wr === r && wc === c)
              const isLast = lastMove?.[0] === r && lastMove?.[1] === c
              return (
                <div
                  key={`${r}-${c}`}
                  className="relative"
                  style={{ width: cellWidth, height: cellWidth }}
                >
                  {/* Slot hole */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: EMPTY_SLOT, margin: cellWidth * 0.08 }}
                  />
                  {/* Piece */}
                  {cell !== EMPTY && (
                    <div
                      className="absolute inset-0 p-1"
                      style={{
                        animation: isLast ? `dropIn 0.3s ease-out` : undefined,
                      }}
                    >
                      <Piece player={cell} win={isWin} />
                    </div>
                  )}
                  {/* Last move ring */}
                  {isLast && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `3px solid #ffee00`,
                        margin: cellWidth * 0.08,
                        boxShadow: '0 0 6px #ffee0080',
                        animation: 'none',
                      }}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          onClick={resetGame}
          className="px-4 py-2 rounded-lg border border-[#c8a040] text-[#c8a040] text-sm bg-[#c8a040]/10 hover:bg-[#c8a040]/25 transition-colors"
        >
          重新开始
        </button>
        <div className="flex gap-1 ml-2">
          {(['pvp', 'ai'] as GameMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setGameMode(mode); resetGame() }}
              className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                gameMode === mode
                  ? 'border-[#c8a040] bg-[#c8a040]/25 text-[#c8a040]'
                  : 'border-[#c8a040]/30 bg-[#c8a040]/8 text-[#c8a040]/60 hover:bg-[#c8a040]/15'
              }`}
            >
              {mode === 'pvp' ? '双人对战' : '🤖 对战AI'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[#445566] text-xs">点击列投放 · 四子连珠获胜</p>

      {/* Drop animation keyframe */}
      <style>{`
        @keyframes dropIn {
          from { transform: translateY(-100%); opacity: 0.5; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
