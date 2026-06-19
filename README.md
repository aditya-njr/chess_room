# Chess Rooms

Two-player online chess. One player creates a room and shares a 6-character code; the other joins with that code. Moves sync in real time over WebSockets.

## Stack

- **Backend:** Python, FastAPI, `python-chess`, WebSockets
- **Frontend:** React, Vite, `chess.js`

## Quick start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# python -m uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in two browser tabs (or two devices on the same network).

## How to play

1. **Create room** — get a code like `A3K9X2` and share it.
2. **Join room** — enter the code on another device/tab.
3. First joiner plays **White**, second plays **Black**.
4. Click a piece, then a highlighted square to move. Pawn promotions pick queen/rook/bishop/knight.

## API

| Method | Path            | Description       |
| ------ | --------------- | ----------------- |
| POST   | `/rooms`        | Create a new room |
| GET    | `/rooms/{code}` | Room status       |
| WS     | `/ws/{code}`    | Real-time game    |

WebSocket messages: `join`, `move`, `resign`, `sync`.
