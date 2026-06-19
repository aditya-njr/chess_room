import { useEffect, useState } from 'react'
import Lobby from './components/Lobby'
import ChessBoard from './components/ChessBoard'
import { useGameSocket } from './hooks/useGameSocket'
import { getGameResult, isGameOver, statusMessage } from './utils'

export default function App() {
  const [session, setSession] = useState(null)
  const [hint, setHint] = useState('')
  const [toast, setToast] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const { connected, gameState, myColor, error, sendMove, resign } = useGameSocket(
    session?.roomCode,
    session?.name,
    session?.playerId,
    Boolean(session),
  )

  const handleJoinRoom = (roomCode, name, playerId) => {
    setSession({ roomCode, name, playerId })
    setHint('')
  }

  useEffect(() => {
    if (error) setToast({ id: Date.now(), kind: 'error', text: error })
  }, [error])

  useEffect(() => {
    if (hint) setToast({ id: Date.now(), kind: 'hint', text: hint })
  }, [hint])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const handleLeave = () => {
    setSession(null)
    setHint('')
    setToast(null)
    setShowResult(false)
  }

  const gameOver = gameState && isGameOver(gameState.status)
  const result = getGameResult(gameState, myColor)
  const playerCount = gameState?.players ? Object.keys(gameState.players).length : 0
  const waiting =
    !gameState ||
    !myColor ||
    gameState.status === 'waiting' ||
    playerCount < 2

  useEffect(() => {
    setShowResult(Boolean(gameOver))
  }, [gameOver])

  const isMyTurn = myColor && gameState?.turn === myColor
  const turnBannerText = gameOver
    ? result?.detail || statusMessage(gameState)
    : !myColor
      ? 'Connecting — assigning your color…'
      : isMyTurn
        ? 'Your move — click a piece, then a highlighted square'
        : `Opponent's move (${gameState?.turn === 'white' ? 'White' : 'Black'})`
  const turnBannerClass = gameOver
    ? 'over'
    : !myColor
      ? 'connecting'
      : isMyTurn
        ? 'your-turn'
        : 'opponent-turn'

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chess Rooms</h1>
        <p>Play online with a friend — create a room or join with a code.</p>
      </header>

      {toast && (
        <div className="toast-container" aria-live="polite">
          <div
            key={toast.id}
            className={`toast toast-${toast.kind}`}
            onClick={() => setToast(null)}
            role="button"
          >
            {toast.text}
          </div>
        </div>
      )}

      {!session ? (
        <Lobby onJoinRoom={handleJoinRoom} />
      ) : (
        <>
          <div className="game-layout">
            <div className="card board-card">
              {waiting ? (
                <div className="waiting-text">
                  <div className="room-code-display" style={{ marginBottom: '1rem' }}>
                    {session.roomCode}
                  </div>
                  <p>Share this code with your opponent.</p>
                  <p style={{ fontSize: '0.9rem' }}>
                    {connected ? 'Connected — waiting for player 2…' : 'Connecting…'}
                  </p>
                  <p className="waiting-note">
                    You need <strong>two browser tabs</strong> (or two devices) to play.
                    Open this page again and join with the same code.
                  </p>
                </div>
              ) : (
                <>
                  <div className={`turn-banner ${turnBannerClass}`}>
                    {turnBannerText}
                  </div>
                  <ChessBoard
                    fen={gameState?.fen}
                    myColor={myColor}
                    onMove={sendMove}
                    lastMove={gameState?.last_move}
                    disabled={gameOver}
                    onHint={setHint}
                  />
                </>
              )}
            </div>

            <div className="card status-panel">
              <h2>Game info</h2>
              <div className="status-row">
                <span>Room</span>
                <strong>{session.roomCode}</strong>
              </div>
              <div className="status-row">
                <span>You</span>
                <strong>{session.name}</strong>
              </div>
              <div className="status-row">
                <span>You play</span>
                <strong className={myColor === 'white' ? 'color-white' : myColor === 'black' ? 'color-black' : ''}>
                  {myColor ? myColor.charAt(0).toUpperCase() + myColor.slice(1) : '—'}
                </strong>
              </div>
              <div className="status-row">
                <span>White</span>
                <span>{gameState?.players?.white || '—'}</span>
              </div>
              <div className="status-row">
                <span>Black</span>
                <span>{gameState?.players?.black || '—'}</span>
              </div>
              <div className="status-row">
                <span>Connection</span>
                <span>{connected ? 'Online' : 'Offline'}</span>
              </div>

              {gameState && (
                <p className="turn-indicator" style={{ marginTop: '1rem' }}>
                  {statusMessage(gameState)}
                </p>
              )}

              {gameOver && (
                <div className="game-over" style={{ marginTop: '1rem' }}>
                  {statusMessage(gameState)}
                </div>
              )}

              <div className="legend" style={{ marginTop: '1rem' }}>
                <div className="legend-item">
                  <span className="legend-swatch piece-white-swatch" /> White pieces
                </div>
                <div className="legend-item">
                  <span className="legend-swatch piece-black-swatch" /> Black pieces
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!gameOver && !waiting && (
                  <button className="secondary" onClick={resign}>
                    Resign
                  </button>
                )}
                <button className="secondary" onClick={handleLeave}>
                  Leave room
                </button>
              </div>
            </div>
          </div>

          {showResult && result && (
            <div className="result-overlay" onClick={() => setShowResult(false)}>
              <div
                className={`result-modal result-${result.outcome}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                {result.outcome === 'win' && (
                  <div className="result-confetti" aria-hidden="true">
                    {['🎉', '✨', '🎊', '⭐', '✨', '🎉'].map((c, i) => (
                      <span key={i} style={{ '--i': i }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  className="result-close"
                  onClick={() => setShowResult(false)}
                  aria-label="Close"
                >
                  ×
                </button>
                <div className="result-badge">
                  <span className="result-icon">
                    {result.outcome === 'win'
                      ? '🏆'
                      : result.outcome === 'loss'
                        ? '🛡️'
                        : '🤝'}
                  </span>
                </div>
                <p className="result-label">
                  {result.outcome === 'win'
                    ? 'Victory'
                    : result.outcome === 'loss'
                      ? 'Defeat'
                      : 'Draw'}
                </p>
                <h2 className="result-title">{result.title}</h2>
                <p className="result-detail">{result.detail}</p>
                <div className="result-actions">
                  <button onClick={handleLeave}>New game</button>
                  <button className="secondary" onClick={() => setShowResult(false)}>
                    View board
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
