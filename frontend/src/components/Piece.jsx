import { pieceImageUrl } from '../utils'

export default function Piece({ type, color }) {
  if (!type || !color) return null

  return (
    <img
      className="chess-piece-img"
      src={pieceImageUrl(color, type)}
      alt=""
      draggable={false}
    />
  )
}
