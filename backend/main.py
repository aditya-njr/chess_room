import json
from typing import Optional

import chess
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from rooms import Player, Room, RoomManager

app = FastAPI(title="Chess Rooms API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

room_manager = RoomManager()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/rooms")
async def create_room() -> dict:
    room = room_manager.create_room()
    return {
        "room_code": room.code,
        "status": room.status,
        "players": len(room.players),
    }


@app.get("/rooms/{room_code}")
async def get_room(room_code: str) -> dict:
    room = room_manager.get_room(room_code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "room_code": room.code,
        "status": room.status,
        "players": len(room.players),
        "player_names": {
            ("white" if color == chess.WHITE else "black"): player.name
            for color, player in room.players.items()
        },
    }


async def broadcast(room: Room, message: dict) -> None:
    payload = json.dumps(message)
    dead: list = []
    for connection in room_manager.list_connections(room):
        try:
            await connection.send_text(payload)
        except Exception:
            dead.append(connection)
    for connection in dead:
        room_manager.disconnect_player(connection)


async def send_error(websocket: WebSocket, message: str) -> None:
    await websocket.send_text(json.dumps({"type": "error", "message": message}))


def parse_move(room: Room, move_data: dict) -> Optional[chess.Move]:
    from_square = move_data.get("from")
    to_square = move_data.get("to")
    promotion = move_data.get("promotion")

    if not from_square or not to_square:
        return None

    uci = f"{from_square}{to_square}"
    if promotion:
        uci += promotion.lower()

    try:
        move = chess.Move.from_uci(uci)
    except ValueError:
        return None

    if move not in room.board.legal_moves:
        return None
    return move


@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str) -> None:
    await websocket.accept()
    room = room_manager.get_room(room_code)
    if room is None:
        await send_error(websocket, "Room not found")
        await websocket.close(code=1008)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "join":
                player_name = (data.get("name") or "Player").strip()[:24] or "Player"
                player_id = (data.get("playerId") or "").strip()[:64]

                if not player_id:
                    await send_error(websocket, "Missing player identity")
                    continue

                existing_color = room.player_id_color(player_id)
                if existing_color is not None:
                    room.players[existing_color] = Player(
                        websocket=websocket,
                        color=existing_color,
                        name=player_name,
                        player_id=player_id,
                    )
                    color_label = "white" if existing_color == chess.WHITE else "black"
                    await websocket.send_text(
                        json.dumps(
                            {
                                **room.game_state(),
                                "type": "joined",
                                "color": color_label,
                            }
                        )
                    )
                    await broadcast(
                        room,
                        {
                            "type": "player_reconnected",
                            "color": color_label,
                            "name": player_name,
                            "player_count": room.connected_count,
                        },
                    )
                    await broadcast(room, room.game_state())
                    continue

                if room.player_color(websocket) is not None:
                    existing = room.player_color(websocket)
                    color_label = "white" if existing == chess.WHITE else "black"
                    await websocket.send_text(
                        json.dumps(
                            {
                                **room.game_state(),
                                "type": "joined",
                                "color": color_label,
                            }
                        )
                    )
                    continue

                if not room.is_full:
                    assigned_color = (
                        chess.WHITE if chess.WHITE not in room.players else chess.BLACK
                    )
                    room.players[assigned_color] = Player(
                        websocket=websocket,
                        color=assigned_color,
                        name=player_name,
                        player_id=player_id,
                    )
                    color_label = "white" if assigned_color == chess.WHITE else "black"

                    await websocket.send_text(
                        json.dumps(
                            {
                                **room.game_state(),
                                "type": "joined",
                                "color": color_label,
                            }
                        )
                    )
                    await broadcast(
                        room,
                        {
                            "type": "player_joined",
                            "color": color_label,
                            "name": player_name,
                            "player_count": len(room.players),
                        },
                    )
                    if room.is_full:
                        await broadcast(room, room.game_state())
                else:
                    room.spectators.add(websocket)
                    await websocket.send_text(
                        json.dumps({**room.game_state(), "type": "spectating"})
                    )

            elif msg_type == "move":
                color = room.player_color(websocket)
                if color is None:
                    await send_error(websocket, "You are not a player in this room")
                    continue
                if not room.is_full:
                    await send_error(websocket, "Waiting for opponent")
                    continue
                if room.board.turn != color:
                    await send_error(websocket, "Not your turn")
                    continue
                if room.status != "playing":
                    await send_error(websocket, "Game is over")
                    continue

                move = parse_move(room, data)
                if move is None:
                    await send_error(websocket, "Illegal move")
                    continue

                room.board.push(move)
                await broadcast(
                    room, {**room.game_state(), "type": "move", "last_move": data}
                )

            elif msg_type == "resign":
                color = room.player_color(websocket)
                if color is None:
                    await send_error(websocket, "You are not a player in this room")
                    continue
                winner = "black" if color == chess.WHITE else "white"
                await broadcast(
                    room,
                    {
                        **room.game_state(),
                        "type": "resign",
                        "status": "resigned",
                        "winner": winner,
                    },
                )

            elif msg_type == "sync":
                await websocket.send_text(json.dumps(room.game_state()))

    except WebSocketDisconnect:
        pass
    finally:
        removed_from = room_manager.disconnect_player(websocket)
        if removed_from:
            room = room_manager.get_room(removed_from)
            if room is not None:
                await broadcast(
                    room,
                    {
                        **room.game_state(),
                        "type": "player_left",
                        "player_count": room.connected_count,
                    },
                )
