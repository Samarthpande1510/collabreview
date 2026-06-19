from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import decode_token
from models import Room
from connection_manager import manager
import uuid
import json

router = APIRouter()
class RoomCreate(BaseModel):
    name: str
    language: str

class ResetToken(BaseModel):
    share_mode: str = "reviewer"

class CodeUpdate(BaseModel):
    code_content: str

@router.post("/create")
def create(data: RoomCreate,request: Request,db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid Token")
    owner_id = payload["user_id"]
    share_token = str(uuid.uuid4())[:8]
    room = Room(share_token=share_token, name=data.name, language=data.language, owner_id=owner_id)
    db.add(room)
    db.commit()
    db.refresh(room)
    return {"message": "Room created!", "id": room.id, "share_token": room.share_token}

@router.get("/")
def getroom(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token=token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    owner_id = payload["user_id"]
    rooms = db.query(Room).filter(Room.owner_id == owner_id).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "language": r.language,
            "share_token": r.share_token,
            "created_at": r.created_at
        }
        for r in rooms
    ]

@router.get("/info/{share_token}")
def room_info(share_token: str,request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    room = db.query(Room).filter(Room.share_token == share_token).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "id": room.id,
        "name": room.name,
        "language": room.language,
        "code_content": room.code_content,
        "owner_id": room.owner_id,
        "share_mode": room.share_mode,
        "share_token": room.share_token,
    }

@router.get("/join/{share_token}")
def join(share_token: str,request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    room = db.query(Room).filter(Room.share_token == share_token).first()
    if not room:
        raise HTTPException(status_code=404, detail="No such Room!")
    return {
        "room_id": room.id,
        "name": room.name,
        "language": room.language,
        "owner_id": room.owner_id,
        "share_mode": room.share_mode,
        "code_content": room.code_content,
        "share_token": room.share_token,
    }

@router.get("/{room_id}")
def roomdetails(room_id: int,request: Request,db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    owner_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found!")
    if room.owner_id != owner_id:
        raise HTTPException(status_code=403, detail="Not your room!")
    return {
        "id": room.id,
        "name": room.name,
        "language": room.language,
        "owner_id": room.owner_id,
        "share_token": room.share_token,
        "code_content": room.code_content,
        "share_mode": room.share_mode,
    }

@router.post("/{room_id}/reset-token")
def reset(data: ResetToken,room_id: int,request: Request,db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    owner_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found!")
    if owner_id != room.owner_id:
        raise HTTPException(status_code=403, detail="Not your Room!")
    share_token = str(uuid.uuid4())[:8]
    room.share_token = share_token
    room.share_mode = data.share_mode
    db.commit()
    db.refresh(room)
    return {"share_token": share_token, "share_mode": room.share_mode}

@router.delete("/{room_id}")
def delete(room_id: int,request: Request,db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You're not the owner")
    db.delete(room)
    db.commit()
    return {"message": "Room deleted", "room_id": room_id}

@router.patch("/{room_id}/code")
async def update_code(
    room_id: int,
    data: CodeUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.owner_id != user_id and room.share_mode != "editor":
        raise HTTPException(status_code=403, detail="No edit permission")
    room.code_content = data.code_content
    db.commit()
    try:
        await manager.broadcast(int(room_id), json.dumps({
            "type": "code_update",
            "code": data.code_content,
            "user_id": user_id
        }))
    except Exception as e:
        print(f"Broadcast error: {e}")
    return {"message": "Code saved", "room_id": room_id}