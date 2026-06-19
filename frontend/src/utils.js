const PIECES = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};

export function pieceSymbol(piece) {
  if (!piece) return "";
  const key = `${piece.color}${piece.type.toUpperCase()}`;
  return PIECES[key] || "";
}

export function statusMessage(state) {
  if (!state) return "";
  const { status, winner, turn, is_check: isCheck } = state;

  if (status === "waiting") return "Waiting for opponent to join…";
  if (status === "checkmate") return `Checkmate! ${capitalize(winner)} wins.`;
  if (status === "stalemate") return "Stalemate — draw.";
  if (status === "draw_insufficient_material")
    return "Draw — insufficient material.";
  if (status === "draw_repetition") return "Draw — threefold repetition.";
  if (status === "draw_fifty_moves") return "Draw — fifty-move rule.";
  if (status === "resigned")
    return `${capitalize(winner)} wins by resignation.`;

  const turnLabel = capitalize(turn);
  if (isCheck) return `${turnLabel} to move — check!`;
  return `${turnLabel} to move`;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

export function isGameOver(status) {
  return status && status !== "waiting" && status !== "playing";
}

const DRAW_STATUSES = [
  "stalemate",
  "draw_insufficient_material",
  "draw_repetition",
  "draw_fifty_moves",
];

export function getGameResult(state, myColor) {
  if (!state || !isGameOver(state.status)) return null;

  const { status, winner } = state;

  if (status === "checkmate" || status === "resigned") {
    const iWon = myColor && winner === myColor;
    return {
      outcome: iWon ? "win" : "loss",
      title: iWon ? "You win!" : "You lose",
      detail: statusMessage(state),
    };
  }

  if (DRAW_STATUSES.includes(status)) {
    return {
      outcome: "draw",
      title: status === "stalemate" ? "Stalemate" : "Draw",
      detail: statusMessage(state),
    };
  }

  return {
    outcome: "draw",
    title: "Game over",
    detail: statusMessage(state),
  };
}

export const API_BASE = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_BASE || window.location.origin;

export function wsUrl(roomCode) {
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/${roomCode}`;
  }

  const defaultBase = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
  const wsBase = import.meta.env.VITE_WS_BASE || defaultBase;
  return `${wsBase}/ws/${roomCode}`;
}

const TAB_PLAYER_ID_KEY = "chess-tab-player-id";
const TAB_DISPLAY_NAME_KEY = "chess-tab-display-name";

export function getPlayerId() {
  let id = sessionStorage.getItem(TAB_PLAYER_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest-${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(TAB_PLAYER_ID_KEY, id);
  }
  return id;
}

export function getDefaultName() {
  let name = sessionStorage.getItem(TAB_DISPLAY_NAME_KEY);
  if (!name) {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    name = `Guest-${suffix}`;
    sessionStorage.setItem(TAB_DISPLAY_NAME_KEY, name);
  }
  return name;
}

export function saveDisplayName(name) {
  const trimmed = name.trim();
  if (trimmed) {
    sessionStorage.setItem(TAB_DISPLAY_NAME_KEY, trimmed);
  }
}

export const CHESSCOM_PIECES =
  "https://images.chesscomfiles.com/chess-themes/pieces/neo/150";

export function pieceImageUrl(color, type) {
  return `${CHESSCOM_PIECES}/${color}${type}.png`;
}
