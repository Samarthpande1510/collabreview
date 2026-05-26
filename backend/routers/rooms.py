from fastapi import APIRouter, HTTPException, Security, Depends
from sqlalchemy.orm import Session
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from pydantic import BaseModel
from database import get_db
from auth import decode_token
from models import User, Room
import uuid
class RoomCreate(BaseModel):
    name: str
    language: str

class ResetToken(BaseModel):
    share_mode: str = "reviewer"

router = APIRouter()

security = HTTPBearer()
@router.post("/create")
def create(data: RoomCreate,credentials: HTTPAuthorizationCredentials = Security(security), 
           db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid Token")
    owner_id = payload["user_id"]
    share_token = str(uuid.uuid4())[:8]
    room = Room(share_token=share_token,name = data.name,language= data.language,owner_id = owner_id)
    db.add(room)
    db.commit()
    db.refresh(room)
    return {"message": "Room created!","id": room.id,"share_token": room.share_token}

@router.get("/")
def getroom(credentials: HTTPAuthorizationCredentials = Security(security),db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token=token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    owner_id = payload["user_id"]
    owner = db.query(Room).filter(Room.owner_id == owner_id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "language": c.language,
            "share_token": c.share_token,
            "created_at": c.created_at

        }
        for c in owner
    ]
    
@router.get("/info/{room_id}")
def room_info(room_id: int, credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    room = db.query(Room).filter(Room.id == room_id).first()
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
 
@router.get("/{room_id}") 
def roomdetails(
                room_id: int,
                 db: Session = Depends(get_db),
                 credentials: HTTPAuthorizationCredentials = Security(security)):

    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found!")
    owner_id = payload["user_id"]
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


@router.get("/join/{share_token}")
def join( share_token: str, db: Session = Depends(get_db)):
    can_join = db.query(Room).filter(Room.share_token == share_token).first()
    if not can_join:
        raise HTTPException(status_code=404, detail="No such Room!")
    return {
        "room_id": can_join.id,
        "name": can_join.name,
        "language": can_join.language,
        "owner_id": can_join.owner_id,
        "share_mode": can_join.share_mode
    }

@router.post("/{room_id}/reset-token")
def reset(data: ResetToken,room_id: int, db: Session = Depends(get_db),
          credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
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
def delete(room_id: int ,db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
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

class CodeUpdate(BaseModel):
    code_content: str

@router.patch("/{room_id}/code")
def update_code(
    room_id: int,
    data: CodeUpdate,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    token = credentials.credentials
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
    db.refresh(room)
    return {"message": "Code saved", "room_id": room_id}