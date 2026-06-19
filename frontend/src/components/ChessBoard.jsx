import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import Piece from './Piece'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PROMOTION_PIECES = ['q', 'r', 'b', 'n']

export default function ChessBoard({
  fen,
  myColor,
  onMove,
  lastMove,
  disabled,
  onHint,
}) {
  const [selected, setSelected] = useState(null)
  const [pendingPromotion, setPendingPromotion] = useState(null)

  const { board, legalMoves, turn } = useMemo(() => {
    try {
      const chess = new Chess(fen || undefined)
      return {
        board: chess.board(),
        legalMoves: chess.moves({ verbose: true }),
        turn: chess.turn(),
      }
    } catch {
      const chess = new Chess()
      return {
        board: chess.board(),
        legalMoves: chess.moves({ verbose: true }),
        turn: chess.turn(),
      }
    }
  }, [fen])

  const isMyTurn =
    myColor &&
    ((myColor === 'white' && turn === 'w') || (myColor === 'black' && turn === 'b'))
  const canMove = !disabled && isMyTurn && myColor

  const orientedBoard = useMemo(() => {
    const rows = myColor === 'black' ? [...board].reverse() : board
    return rows.map((row) => (myColor === 'black' ? [...row].reverse() : row))
  }, [board, myColor])

  const displayRank = (rowIndex) => (myColor === 'black' ? rowIndex + 1 : 8 - rowIndex)
  const displayFile = (colIndex) => FILES[myColor === 'black' ? 7 - colIndex : colIndex]
  const squareName = (rowIndex, colIndex) => `${displayFile(colIndex)}${displayRank(rowIndex)}`

  const movesFromSelected = selected
    ? legalMoves.filter((m) => m.from === selected)
    : []

  const handleSquareClick = (rowIndex, colIndex) => {
    if (disabled) return

    if (!myColor) {
      onHint?.('Connecting… assign your color before moving.')
      return
    }

    if (!isMyTurn) {
      onHint?.(`Wait — it's ${turn === 'w' ? 'White' : 'Black'}'s turn.`)
      return
    }

    const name = squareName(rowIndex, colIndex)
    const piece = orientedBoard[rowIndex][colIndex]
    const isOwnPiece =
      piece &&
      ((myColor === 'white' && piece.color === 'w') || (myColor === 'black' && piece.color === 'b'))

    const matchingMove = movesFromSelected.find((m) => m.to === name)

    if (matchingMove) {
      if (matchingMove.flags.includes('p')) {
        setPendingPromotion({ from: matchingMove.from, to: matchingMove.to })
        setSelected(null)
        return
      }
      onMove(matchingMove.from, matchingMove.to)
      setSelected(null)
      return
    }

    if (isOwnPiece) {
      setSelected(name)
      return
    }

    setSelected(null)
  }

  const completePromotion = (pieceType) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, pieceType)
    }
    setPendingPromotion(null)
  }

  const isLastMoveSquare = (name) =>
    lastMove && (lastMove.from === name || lastMove.to === name)

  const isLegalTarget = (name) => movesFromSelected.some((m) => m.to === name)
  const isLegalCapture = (name) =>
    movesFromSelected.some((m) => m.to === name && m.flags.includes('c'))

  return (
    <div className="board-container">
      <div className="chess-board">
        {orientedBoard.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const name = squareName(rowIndex, colIndex)
            const isLight = (rowIndex + colIndex) % 2 === 0
            const classes = [
              'square',
              isLight ? 'light' : 'dark',
              selected === name ? 'selected' : '',
              isLegalTarget(name) && !isLegalCapture(name) ? 'legal-target' : '',
              isLegalCapture(name) ? 'legal-capture' : '',
              isLastMoveSquare(name) ? 'last-move' : '',
              canMove ? 'interactive' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                key={name}
                className={classes}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
                role="button"
                tabIndex={0}
                aria-label={name}
              >
                {rowIndex === orientedBoard.length - 1 && (
                  <span className="file-label">{displayFile(colIndex)}</span>
                )}
                {colIndex === 0 && (
                  <span className="rank-label">{displayRank(rowIndex)}</span>
                )}
                {piece && <Piece type={piece.type} color={piece.color} />}
              </div>
            )
          }),
        )}
      </div>

      {pendingPromotion && (
        <div className="promotion-overlay" onClick={() => setPendingPromotion(null)}>
          <div className="promotion-picker" onClick={(e) => e.stopPropagation()}>
            <p className="promotion-title">Promote pawn to:</p>
            <div className="promotion-options">
              {PROMOTION_PIECES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="promotion-option"
                  onClick={() => completePromotion(type)}
                >
                  <Piece type={type} color={myColor === 'white' ? 'w' : 'b'} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
