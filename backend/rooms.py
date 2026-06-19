import random
import string
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

import chess


def generate_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))


@dataclass
class Player:
    websocket: Optional[object]
    color: chess.Color
    name: str
    player_id: str


@dataclass
class Room:
    code: str
    board: chess.Board = field(default_factory=chess.Board)
    players: Dict[chess.Color, Player] = field(default_factory=dict)
    spectators: Set[object] = field(default_factory=set)

    @property
    def is_full(self) -> bool:
        return len(self.players) >= 2

    @property
    def connected_count(self) -> int:
        return sum(1 for player in self.players.values() if player.websocket is not None)

    @property
    def status(self) -> str:
        if len(self.players) < 2:
            return "waiting"
        if self.board.is_checkmate():
            winner = "black" if self.board.turn == chess.WHITE else "white"
            return f"checkmate_{winner}"
        if self.board.is_stalemate():
            return "stalemate"
        if self.board.is_insufficient_material():
            return "draw_insufficient_material"
        if self.board.can_claim_threefold_repetition():
            return "draw_repetition"
        if self.board.can_claim_fifty_moves():
            return "draw_fifty_moves"
        return "playing"

    def player_color(self, websocket: object) -> Optional[chess.Color]:
        for color, player in self.players.items():
            if player.websocket is websocket:
                return color
        return None

    def player_id_color(self, player_id: str) -> Optional[chess.Color]:
        for color, player in self.players.items():
            if player.player_id == player_id:
                return color
        return None

    def game_state(self) -> dict:
        status = self.status
        winner = None
        if status.startswith("checkmate_"):
            winner = status.split("_", 1)[1]
            status = "checkmate"

        return {
            "type": "state",
            "fen": self.board.fen(),
            "turn": "white" if self.board.turn == chess.WHITE else "black",
            "status": status,
            "winner": winner,
            "is_check": self.board.is_check(),
            "players": {
                ("white" if color == chess.WHITE else "black"): player.name
                for color, player in self.players.items()
            },
            "room_code": self.code,
        }


class RoomManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, Room] = {}

    def create_room(self) -> Room:
        for _ in range(20):
            code = generate_room_code()
            if code not in self._rooms:
                room = Room(code=code)
                self._rooms[code] = room
                return room
        raise RuntimeError("Unable to generate unique room code")

    def get_room(self, code: str) -> Optional[Room]:
        return self._rooms.get(code.upper())

    def disconnect_player(self, websocket: object) -> Optional[str]:
        for code, room in list(self._rooms.items()):
            color = room.player_color(websocket)
            if color is not None:
                player = room.players[color]
                room.players[color] = Player(
                    websocket=None,
                    color=color,
                    name=player.name,
                    player_id=player.player_id,
                )
                return code
            if websocket in room.spectators:
                room.spectators.discard(websocket)
                return code
        return None

    def list_connections(self, room: Room) -> List[object]:
        connections = [
            player.websocket
            for player in room.players.values()
            if player.websocket is not None
        ]
        connections.extend(room.spectators)
        return connections
