from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from database import get_db
from models import Room
from auth import decode_token
from sqlalchemy.orm import Session
import json
from connection_manager import manager
import asyncio


router = APIRouter()
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    room_id: int,
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=1008)
        return
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=1008)
        return
    user_name = payload["name"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        await websocket.close(code=1008)
        return


    await manager.connect(room_id, websocket)
    manager.add_user(room_id, user_name)


    current_users = list(manager.user_names.get(room_id, []))
    await websocket.send_text(json.dumps({
        "type": "presence_list",
        "users": current_users
    }))
    await manager.broadcast(room_id, json.dumps({
        "type": "presence",
        "name": user_name,
        "event": "joined",
        "language": room.language
    }))

    async def receive_from_client():
        try:
            while True:
                data = await websocket.receive_text()
                await manager.broadcast(room_id, data)
        except WebSocketDisconnect:
            manager.disconnect(room_id, websocket)
            manager.remove_user(room_id, user_name)
            await manager.broadcast(room_id, json.dumps({
                "type": "presence",
                "name": user_name,
                "event": "left",
                "language": room.language
            }))
    
    async def receive_from_redis():
        try:
            async for message in manager.listen(room_id):
                await websocket.send_text(message)
        except Exception as e:
            print(f"redis listener stopped: {e}")
            return
    
    await asyncio.gather(receive_from_client(), receive_from_redis())



