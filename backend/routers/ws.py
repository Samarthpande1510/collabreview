from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from database import get_db
from models import Room, User
from auth import decode_token
from sqlalchemy.orm import Session
import json
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self,room_id,websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self,room_id,websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)
        if self.active_connections[room_id] == []:
             self.active_connections.pop(room_id, None)
    
    async def broadcast(self,room_id,message: str):
        if room_id not in self.active_connections:
            return
        for connection in self.active_connections[room_id]:
            await connection.send_text(message)
    
manager = ConnectionManager()
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(room_id: int,
                             websocket: WebSocket,
                             token: str = Query(...),
                             db: Session = Depends(get_db)
                             ):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    user_name = payload["name"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        await websocket.close(code=1008)
        return
    await manager.connect(room_id=room_id,websocket=websocket)
    await manager.broadcast(room_id, json.dumps({
    "type": "presence",
    "name": user_name,
    "event": "joined",
    "language": room.language
}))
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, json.dumps({
            "type": "presence",
            "name": user_name,
            "event": "left",
            "language": room.language
        }))
        
