import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type PieceKey = 'k'|'a'|'e'|'r'|'h'|'c'|'p'|'K'|'A'|'E'|'R'|'H'|'C'|'P'
type Player = 'red'|'black'
type Cell = { p: PieceKey; r: Player } | null
type Pos = { r: number; c: number }

// ─── Constants ────────────────────────────────────────────────────────────────
const ROWS = 10, COLS = 9
const CELL = 48
const W = COLS * CELL, H = ROWS * CELL  // 432 × 480
const INIT_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'
const PC: Record<PieceKey, string> = {
  k:'将', a:'士', e:'象', r:'车', h:'马', c:'炮', p:'卒',
  K:'帅', A:'仕', E:'相', R:'车', H:'马', C:'炮', P:'兵',
}

// ─── FEN ──────────────────────────────────────────────────────────────────────
function parseFen(f: string): Cell[][] {
  const rows = f.trim().split(/\s+/)[0].split('/')
  const b: Cell[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  for (let r = 0; r < ROWS; r++) {
    let c = 0
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '9') { c += parseInt(ch, 10) }
      else {
        const R: Player = (ch >= 'A' && ch <= 'Z') ? 'red' : 'black'
        b[r][c++] = { p: ch as PieceKey, r: R }
      }
    }
  }
  return b
}

// ─── Rules ───────────────────────────────────────────────────────────────────
function bnd(r: number, c: number) { return r >= 0 && r < ROWS && c >= 0 && c < COLS }
function own(b: Cell[][], r: number, c: number, R: Player) { return !!b[r]?.[c] && b[r][c]!.r === R }
function add(b: Cell[][], r: number, c: number, R: Player, m: Pos[]) { if (bnd(r,c) && !own(b,r,c,R)) m.push({r,c}) }

function lmoves(b: Cell[][], r: number, c: number): Pos[] {
  const cell = b[r]?.[c]; if (!cell) return []
  const R = cell.r, P = cell.p, m: Pos[] = []

  if (P === 'k' || P === 'K') {
    const pp: Pos[] = R==='red' ? [{r:7,c:3},{r:7,c:5},{r:9,c:3},{r:9,c:5}]
                      : [{r:0,c:3},{r:0,c:5},{r:2,c:3},{r:2,c:5}]
    ;([-1,1,0,0] as number[]).forEach((dr,i) => {
      const dc = [0,0,-1,1][i] as number
      const nr=r+dr,nc=c+dc
      if(pp.some(p=>p.r===nr&&p.c===nc)) add(b,nr,nc,R,m)
    })
    for (let nr = r+(R==='red'?-1:1); bnd(nr,c); nr += (R==='red'?-1:1)) {
      if (b[nr]?.[c]) { if (b[nr][c]!.p==='k'||b[nr][c]!.p==='K') m.push({r:nr,c}); break }
    }
  } else if (P === 'a' || P === 'A') {
    const ap: Pos[] = R==='red' ? [{r:7,c:3},{r:7,c:5},{r:8,c:4},{r:9,c:3},{r:9,c:5}]
                      : [{r:0,c:3},{r:0,c:5},{r:1,c:4},{r:2,c:3},{r:2,c:5}]
    ;([-1,-1,1,1] as number[]).forEach((dr,i) => {
      const dc = [-1,1,-1,1][i] as number
      const nr=r+dr,nc=c+dc
      if(ap.some(p=>p.r===nr&&p.c===nc)) add(b,nr,nc,R,m)
    })
  } else if (P === 'e' || P === 'E') {
    if ((R==='red'&&r<5)||(R==='black'&&r>4)) { /* blocked */ }
    else {
      ;([-2,-2,2,2] as number[]).forEach((dr,i) => {
        const dc = [-2,2,-2,2][i] as number
        const mr=r+dr/2,mc=c+dc/2,nr=r+dr,nc=c+dc
        if(bnd(nr,nc)&&!b[mr]?.[mc]&&!own(b,nr,nc,R)) m.push({r:nr,c:nc})
      })
    }
  } else if (P === 'r' || P === 'R') {
    ;([-1,1,0,0] as number[]).forEach((dr,i) => {
      const dc = [0,0,-1,1][i] as number
      for(let j=1;j<=9;j++){const nr=r+dr*j,nc=c+dc*j;if(!bnd(nr,nc))break;if(own(b,nr,nc,R))break;m.push({r:nr,c:nc});if(b[nr]?.[nc])break;}
    })
  } else if (P === 'h' || P === 'H') {
    ;([-2,-2,-1,-1,1,1,2,2] as number[]).forEach((dr,i) => {
      const dc = [-1,1,-2,2,-2,2,-1,1][i] as number
      const mr=r+(dr>0?1:dr<-1?-1:0),mc=c+(dc>0?1:dc<-1?-1:0)
      const nr=r+dr,nc=c+dc
      if(bnd(nr,nc)&&!b[mr]?.[mc]&&!own(b,nr,nc,R)) m.push({r:nr,c:nc})
    })
  } else if (P === 'c' || P === 'C') {
    ;([-1,1,0,0] as number[]).forEach((dr,i) => {
      const dc=[0,0,-1,1][i] as number
      let jumped=false
      for(let j=1;j<=9;j++){const nr=r+dr*j,nc=c+dc*j;if(!bnd(nr,nc))break
        if(!jumped){if(b[nr]?.[nc]){jumped=true;continue}m.push({r:nr,c:nc})}
        else{if(b[nr]?.[nc]){if(!own(b,nr,nc,R))m.push({r:nr,c:nc});break}}
      })
    })
  } else if (P === 'p' || P === 'P') {
    const dr = R==='red'?-1:1; add(b,r+dr,c,R,m)
    const crossed = R==='red'?r<=4:r>=5
    if(crossed){add(b,r,c-1,R,m);add(b,r,c+1,R,m)}
  }
  return m
}

function isCheck(b: Cell[][], R: Player): boolean {
  let kr=-1,kc=-1
  outer: for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(b[r]?.[c]?.p==='k'&&b[r][c]!.r===R){kr=r;kc=c;break outer}
  if(kr<0)return false
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){if(!b[r]?.[c])continue;if(b[r][c]!.r===R)continue;if(lmoves(b,r,c).some(m=>m.r===kr&&m.c===kc))return true}
  return false
}
function isMate(b: Cell[][], R: Player): boolean {
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(b[r]?.[c]?.r===R&&lmoves(b,r,c).length>0) return false
  return true
}

// ─── Board SVG Drawing ──────────────────────────────────────────────────────
function boardSvg(showLegal: boolean, legalMoves: Pos[], lastMv: {f:Pos,t:Pos}|null, hlR: number, hlC: number): React.ReactNode {
  const lines: React.ReactNode[] = []
  // Horizontal grid
  for(let r=0;r<ROWS;r++) lines.push(<line key={`h${r}`} x1={0} y1={r*CELL} x2={W} y2={r*CELL} stroke="rgba(80,50,10,.7)" strokeWidth="1"/>)
  // Vertical grid
  for(let c=0;c<COLS;c++) {
    const x = c*CELL
    const endY = (c===0||c===COLS-1) ? H : (ROWS-2)*CELL
    lines.push(<line key={`v${c}`} x1={x} y1={0} x2={x} y2={endY} stroke="rgba(80,50,10,.7)" strokeWidth="1"/>)
  }
  // River
  const river = <rect key="river" x={0} y={4*CELL} width={W} height={CELL*2} fill="rgba(80,120,180,.15)"/>
  const riverTxt = (
    <text key="ch" x={W*.3} y={5*CELL+CELL*.5} fill="rgba(100,140,200,.6)" fontSize={CELL*.28} fontWeight="bold" fontFamily="serif" textAnchor="middle" dominantBaseline="middle">楚 河</text>
  )
  const hanTxt = (
    <text key="hh" x={W*.7} y={5*CELL+CELL*.5} fill="rgba(100,140,200,.6)" fontSize={CELL*.28} fontWeight="bold" fontFamily="serif" textAnchor="middle" dominantBaseline="middle">汉 界</text>
  )
  // Palace crosses
  const palace = (bx: number, by: number) => (
    <g key={`p${bx}`} stroke="rgba(80,50,10,.7)" strokeWidth="1">
      <line x1={bx} y1={by+CELL*2} x2={bx+CELL*2} y2={by}/>
      <line x1={bx} y1={by} x2={bx+CELL*2} y2={by+CELL*2}/>
    </g>
  )
  // Coord labels
  const coordNums = ['1','2','3','4','5','6','7','8','9'].map((v,i) => (
    <text key={`cn${i}`} x={i*CELL} y={-5} fill="rgba(80,50,10,.55)" fontSize={11} textAnchor="middle" fontFamily="sans-serif">{v}</text>
  ))
  const files = ['九','八','七','六','五','四','三','二','一'].map((v,i) => (
    <text key={`fl${i}`} x={i*CELL} y={H+14} fill="rgba(80,50,10,.55)" fontSize={11} textAnchor="middle" fontFamily="sans-serif">{v}</text>
  ))
  // Highlight last move
  const hl = lastMv ? (
    <g>
      {[{r:lastMv.f.r,c:lastMv.f.c},{r:lastMv.t.r,c:lastMv.t.c}].map((p,i) => (
        <rect key={`lm${i}`} x={p.c*CELL+1} y={p.r*CELL+1} width={CELL-2} height={CELL-2}
          fill="none" stroke="rgba(100,180,255,.8)" strokeWidth={2}/>
      ))}
    </g>
  ) : null
  // Selection
  const selHl = hlC >= 0 ? (
    <rect x={hlC*CELL+1} y={hlR*CELL+1} width={CELL-2} height={CELL-2}
      fill="none" stroke="rgba(255,220,50,.9)" strokeWidth={2.5}/>
  ) : null
  // Legal move dots
  const dots = showLegal ? legalMoves.map((m,i) => (
    m.r===hlR&&m.c===hlC ? null :
    !board[r]?.[c] ? <circle key={`ld${i}`} cx={m.c*CELL+CELL/2} cy={m.r*CELL+CELL/2} r={CELL*.16}
      fill="rgba(100,200,100,.35)"/> : null
  )) : null

  return (
    <svg width={W} height={H} style={{ display: 'block', borderRadius: 6 }}>
      {/* Board background */}
      <rect width={W} height={H} fill="#c8a046"/>
      {lines}
      {river}
      {riverTxt}{hanTxt}
      {palace(3*CELL,0)}
      {palace(5*CELL,0)}
      {coordNums}
      {files}
      {hl}
      {selHl}
      {dots}
    </svg>
  )
}

// Need board in scope for dots
const _board: Cell[][] = []
function PieceEl({ cell, r, c, onClick, isSel }: { cell: Cell, r: number, c: number, onClick: ()=>void, isSel: boolean }) {
  const x = c * CELL + CELL / 2, y = r * CELL + CELL / 2, R = CELL * .44
  const isRed = cell.r === 'red'
  const gradId = `grad${r}${c}`
  const borderCol = isRed ? '#aa2222' : '#2222aa'
  const textCol = isRed ? '#cc1111' : '#1111cc'
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={gradId} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor={isRed ? '#fff5f5' : '#f0f0ff'}/>
          <stop offset="70%" stopColor={isRed ? '#ffcccc' : '#ccccff'}/>
          <stop offset="100%" stopColor={isRed ? '#e85555' : '#5555cc'}/>
        </radialGradient>
      </defs>
      {/* Shadow */}
      <circle cx={x+1.5} cy={y+1.5} r={R} fill="rgba(0,0,0,.3)"/>
      {/* Stone */}
      <circle cx={x} cy={y} r={R} fill={`url(#${gradId})`} stroke={borderCol} strokeWidth={1.8}/>
      {/* Text */}
      <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle"
        fill={textCol} fontSize={R*.88} fontWeight="bold" fontFamily="serif">
        {PC[cell.p]}
      </text>
      {/* Selection ring */}
      {isSel && <circle cx={x} cy={y} r={R+2} fill="none" stroke="rgba(255,220,50,.9)" strokeWidth={2.5}/>}
    </g>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function App() {
  const [board, setBoard] = useState<Cell[][]>(() => parseFen(INIT_FEN))
  const [player, setPlayer] = useState<Player>('red')
  const [sel, setSel] = useState<Pos | null>(null)
  const [lm, setLm] = useState<Pos[]>([])
  const [capR, setCapR] = useState<Cell[]>([])
  const [capB, setCapB] = useState<Cell[]>([])
  const [over, setOver] = useState(false)
  const [winner, setWinner] = useState('')
  const [warn, setWarn] = useState('')
  const [mode, setMode] = useState<'play'|'setup'>('play')
  const [setupB, setSetupB] = useState<Cell[][]>(() => parseFen(INIT_FEN))
  const [fenText, setFenText] = useState('')
  const [dragFrom, setDragFrom] = useState<Pos|null>(null)

  const doMove = useCallback((fr: number, fc: number, tr: number, tc: number) => {
    setBoard(prev => {
      const nb = prev.map(row => [...row])
      const cap = nb[tr][tc]
      if (cap) { if (cap.r==='red') setCapB(b=>[...b,cap]); else setCapR(b=>[...b,cap]) }
      nb[tr][tc] = nb[fr][fc]; nb[fr][fc] = null
      const next: Player = player==='red'?'black':'red'
      setPlayer(next)
      if (isMate(nb, next)) { setOver(true); setWinner(player==='red'?'红方':'黑方') }
      else if (isCheck(nb, next)) setWarn(`${next==='red'?'黑':'红'}方被将！`)
      else setWarn('')
      return nb
    })
    setSel(null); setLm([])
  }, [player])

  const handleCellClick = useCallback((r: number, c: number) => {
    if (mode !== 'play' || over) return
    const clicked = board[r]?.[c]
    if (sel) {
      const mv = lm.find(m => m.r===r && m.c===c)
      if (mv) { doMove(sel.r, sel.c, r, c); return }
      setSel(null); setLm([])
      if (clicked && clicked.r === player) { setSel({r,c}); setLm(lmoves(board,r,c)) }
    } else {
      if (clicked && clicked.r === player) { setSel({r,c}); setLm(lmoves(board,r,c)) }
    }
  }, [mode, over, board, sel, lm, player, doMove])

  const handleDrop = (r: number, c: number, piece: {p:PieceKey,r:Player}) => {
    setSetupB(prev => { const nb=prev.map(row=>[...row]); nb[r][c]={p:piece.p,r:piece.r}; return nb })
  }

  const applySetup = () => {
    setBoard(setupB.map(row=>[...row]))
    setSel(null); setLm([]); setCapR([]); setCapB([]); setOver(false); setWinner(''); setWarn(''); setPlayer('red')
    setMode('play')
  }
  const loadFen = () => { try { setSetupB(parseFen(fenText)) } catch { alert('FEN格式错误') } }

  const PAL: {p:PieceKey, side:Player}[] = [
    {p:'K',side:'red'},{p:'A',side:'red'},{p:'E',side:'red'},{p:'R',side:'red'},{p:'H',side:'red'},{p:'C',side:'red'},{p:'P',side:'red'},
    {p:'k',side:'black'},{p:'a',side:'black'},{p:'e',side:'black'},{p:'r',side:'black'},{p:'h',side:'black'},{p:'c',side:'black'},{p:'p',side:'black'},
  ]

  const canDrop = mode === 'setup'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-3"
      style={{fontFamily:"'PingFang SC','Microsoft YaHei',sans-serif",background:'linear-gradient(135deg,#1a1209 0%,#2d1f0f 50%,#1a1209 100%)'}}>
      <h1 className="text-2xl font-bold tracking-widest" style={{color:'#c8a040',textShadow:'0 2px 8px rgba(200,160,64,.4)'}}>♟ 中国象棋 ♟</h1>

      {/* Top bar */}
      <div className="flex gap-3 items-center flex-wrap justify-center">
        <div className={`px-4 py-1 rounded-full font-bold text-sm border-2 transition-all ${over?'bg-yellow-800 text-yellow-200 border-yellow-500':player==='red'?'bg-red-900 text-red-100 border-red-600':'bg-blue-900 text-blue-100 border-blue-600'}`}>
          {over ? `🏆 ${winner}获胜` : player==='red' ? '⚪ 红方回合' : '⚫ 黑方回合'}
        </div>
        <button onClick={()=>setMode('play')} className={`px-3 py-1 rounded border text-sm font-medium transition ${mode==='play'?'border-yellow-500 bg-yellow-900/30 text-yellow-400':'border-yellow-700 text-yellow-700'}`}>▶ 对局</button>
        <button onClick={()=>setMode('setup')} className={`px-3 py-1 rounded border text-sm font-medium transition ${mode==='setup'?'border-yellow-500 bg-yellow-900/30 text-yellow-400':'border-yellow-700 text-yellow-700'}`}>⚙ 摆棋</button>
        <div className="text-xs text-yellow-700 flex gap-4">
          <span>红方吃：<span className="text-base">{capR.map(x=>PC[x.p]).join(' ')}</span></span>
          <span>黑方吃：<span className="text-base">{capB.map(x=>PC[x.p]).join(' ')}</span></span>
        </div>
      </div>

      {warn && <div className="text-orange-400 text-sm font-bold animate-pulse">{warn}</div>}

      {/* Board */}
      <div style={{position:'relative', width:W, height:H, borderRadius:6, boxShadow:'0 12px 60px rgba(0,0,0,.8), 0 0 0 3px #8b6914', background:'#c8a046'}}>

        {/* Grid SVG */}
        <svg width={W} height={H} style={{position:'absolute',top:0,left:0}}>
          <rect width={W} height={H} fill="#c8a046"/>
          {/* H lines */}
          {Array.from({length:ROWS},(_,r)=><line key={`h${r}`} x1={0} y1={r*CELL} x2={W} y2={r*CELL} stroke="rgba(80,50,10,.7)" strokeWidth="1"/>)}
          {/* V lines */}
          {Array.from({length:COLS},(_,c)=>{
            const x=c*CELL; const endY=(c===0||c===COLS-1)?H:(ROWS-2)*CELL
            return <line key={`v${c}`} x1={x} y1={0} x2={x} y2={endY} stroke="rgba(80,50,10,.7)" strokeWidth="1"/>
          })}
          {/* River */}
          <rect x={0} y={4*CELL} width={W} height={CELL*2} fill="rgba(80,120,180,.15)"/>
          <text x={W*.3} y={5*CELL+CELL*.5} fill="rgba(100,140,200,.6)" fontSize={CELL*.26} fontWeight="bold" fontFamily="serif" textAnchor="middle" dominantBaseline="middle">楚 河</text>
          <text x={W*.7} y={5*CELL+CELL*.5} fill="rgba(100,140,200,.6)" fontSize={CELL*.26} fontWeight="bold" fontFamily="serif" textAnchor="middle" dominantBaseline="middle">汉 界</text>
          {/* Palaces */}
          <g stroke="rgba(80,50,10,.7)" strokeWidth="1">
            <line x1={3*CELL} y1={2*CELL} x2={5*CELL} y2={0}/><line x1={3*CELL} y1={0} x2={5*CELL} y2={2*CELL}/>
            <line x1={5*CELL} y1={2*CELL} x2={7*CELL} y2={0}/><line x1={5*CELL} y1={0} x2={7*CELL} y2={2*CELL}/>
          </g>
          {/* Last move hl */}
          {lastMv ? [{r:lastMv.f.r,c:lastMv.f.c},{r:lastMv.t.r,c:lastMv.t.c}].map((p,i)=>(
            <rect key={`lm${i}`} x={p.c*CELL+1} y={p.r*CELL+1} width={CELL-2} height={CELL-2} fill="none" stroke="rgba(100,180,255,.8)" strokeWidth={2}/>
          )) : null}
          {/* Selection hl */}
          {sel ? <rect x={sel.c*CELL+1} y={sel.r*CELL+1} width={CELL-2} height={CELL-2} fill="none" stroke="rgba(255,220,50,.9)" strokeWidth={2.5}/> : null}
          {/* Legal move dots */}
          {lm.map((m,i)=>(
            !board[m.r]?.[m.c] ?
            <circle key={`ld${i}`} cx={m.c*CELL+CELL/2} cy={m.r*CELL+CELL/2} r={CELL*.16} fill="rgba(100,200,100,.4)"/>
            : null
          ))}
        </svg>

        {/* Pieces */}
        {board.map((row, r) =>
          row.map((cell, c) => cell ? (
            <div key={`${r}${c}`} onClick={() => handleCellClick(r,c)}
              style={{
                position:'absolute', left:c*CELL, top:r*CELL, width:CELL, height:CELL,
                display:'flex', alignItems:'center', justifyContent:'center', cursor: mode==='play'?'pointer':'default', zIndex:2,
              }}>
              <svg width={CELL} height={CELL} viewBox={`0 0 ${CELL} ${CELL}`} style={{overflow:'visible'}}>
                <defs>
                  <radialGradient id={`g${r}${c}`} cx="38%" cy="35%" r="65%">
                    <stop offset="0%" stopColor={cell.r==='red'?'#fff5f5':'#f0f0ff'}/>
                    <stop offset="70%" stopColor={cell.r==='red'?'#ffcccc':'#ccccff'}/>
                    <stop offset="100%" stopColor={cell.r==='red'?'#e85555':'#5555cc'}/>
                  </radialGradient>
                </defs>
                <circle cx={CELL/2+1} cy={CELL/2+1.5} r={CELL*.44} fill="rgba(0,0,0,.3)"/>
                <circle cx={CELL/2} cy={CELL/2} r={CELL*.44} fill={`url(#g${r}${c})`} stroke={cell.r==='red'?'#aa2222':'#2222aa'} strokeWidth={1.8}/>
                <text x={CELL/2} y={CELL/2+1.5} textAnchor="middle" dominantBaseline="middle"
                  fill={cell.r==='red'?'#cc1111':'#1111cc'} fontSize={CELL*.42} fontWeight="bold" fontFamily="serif">
                  {PC[cell.p]}
                </text>
                {sel && sel.r===r && sel.c===c && <circle cx={CELL/2} cy={CELL/2} r={CELL*.46} fill="none" stroke="rgba(255,220,50,.9)" strokeWidth={2.5}/>}
              </svg>
            </div>
          ) : (
            /* Empty clickable cell */
            <div key={`${r}${c}`} onClick={() => mode==='setup' && handleDrop(r,c,{p:'k',r:'black'})}
              onDragOver={e => { if(canDrop) e.preventDefault() }}
              onDrop={e => {
                if(!canDrop) return
                e.preventDefault()
                const d = e.dataTransfer.getData('piece')
                if(d) handleDrop(r,c,JSON.parse(d))
              }}
              style={{position:'absolute', left:c*CELL, top:r*CELL, width:CELL, height:CELL, zIndex:1}}/>
          ))
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex gap-2 flex-wrap justify-center items-center">
        <button onClick={()=>{setBoard(parseFen(INIT_FEN));setPlayer('red');setSel(null);setLm([]);setCapR([]);setCapB([]);setOver(false);setWinner('');setWarn('')}}
          className="px-4 py-2 rounded border text-sm font-medium transition hover:bg-yellow-900/30" style={{borderColor:'#c8a040',color:'#c8a040'}}>重新开始</button>
        <button onClick={()=>setPlayer(p=>p==='red'?'black':'red')}
          className="px-4 py-2 rounded border text-sm font-medium transition hover:bg-yellow-900/30" style={{borderColor:'#c8a040',color:'#c8a040'}}>换先手</button>
        <div className="px-4 py-2 rounded text-sm" style={{background:'rgba(200,160,64,.1)',border:'1px solid rgba(200,160,64,.3)',color:'#a09070'}}>
          {over ? winner+'获胜！' : player==='red'?'红方行棋':'黑方行棋'}
        </div>
      </div>

      {/* Setup panel */}
      {mode==='setup' && (
        <div className="rounded-xl p-4 w-full max-w-md" style={{background:'rgba(12,8,3,.97)',border:'2px solid #8b6914',boxShadow:'0 20px 60px rgba(0,0,0,.8)'}}>
          <h2 className="text-sm font-bold mb-3 tracking-widest" style={{color:'#c8a040'}}>⚙ 棋局设置</h2>
          <div className="flex flex-wrap gap-2 mb-3 justify-center p-2 rounded-lg" style={{background:'rgba(200,160,64,.07)'}}>
            {PAL.map(({p,side}) => (
              <div key={p+side} draggable
                onDragStart={e => e.dataTransfer.setData('piece',JSON.stringify({p,r:side}))}
                className={`w-8 h-8 flex items-center justify-center text-lg cursor-grab rounded border transition hover:border-yellow-400 ${side==='red'?'text-red-400 border-red-900':'text-blue-400 border-blue-900'}`}
                style={{background:'rgba(0,0,0,.35)',fontFamily:'serif'}}>
                {PC[p]}
              </div>
            ))}
          </div>
          <div className="grid mb-3 mx-auto select-none" style={{gridTemplateColumns:`repeat(${COLS},34px)`,width:'fit-content',background:'#c8a046',border:'2px solid #8b6914',borderRadius:3}}>
            {Array.from({length:ROWS*COLS},(_,i)=>{
              const r=Math.floor(i/COLS),c=i%COLS
              const cell=setupB[r]?.[c]
              return (
                <div key={i}
                  onClick={()=>setSetupB(prev=>{const nb=prev.map(row=>[...row]);nb[r][c]=null;return nb})}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();const d=e.dataTransfer.getData('piece');if(d){const {p,r}=JSON.parse(d)as{PieceKey,Player};setSetupB(nb=>{const b2=nb.map(row=>[...row]);b2[r][c]={p,r};return b2})}}}
                  className="w-8 h-8 flex items-center justify-center text-sm border cursor-pointer transition-all"
                  style={{borderColor:'rgba(0,0,0,.08)',fontFamily:'serif',fontSize:'1.05rem',...cell?(cell.r==='red'?{color:'#ff5555'}:{color:'#5555ff'}):{}}}
                >
                  {cell?PC[cell.p]:''}
                </div>
              )
            })}
          </div>
          <textarea className="w-full rounded px-2 py-1 text-xs mb-2 resize-none"
            style={{background:'rgba(0,0,0,.45)',border:'1px solid rgba(200,160,64,.4)',color:'#c8a040',fontFamily:'monospace',height:44,fontSize:'0.72rem'}}
            placeholder="粘贴