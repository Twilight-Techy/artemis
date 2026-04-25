from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Map user_id to active websocket connections
        self.active_connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def push_to_user(self, user_id: str, payload: dict):
        if user_id in self.active_connections:
            # We want to convert the dictionary to a JSON string first
            msg = json.dumps(payload)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(msg)
                except Exception as e:
                    print(f"Error sending message to client: {e}")

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # In a full system, you could handle client-to-server WS messages here
            # For proactive pushes, we just keep the connection open.
            await websocket.send_text(json.dumps({"status": "received", "data": data}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

