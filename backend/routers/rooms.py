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
    share_token = str(uuid.uuid4())
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
        "room_id": room.id,
        "name": room.name,
        "language": room.language,
        "owner_id": room.owner_id,
        "share_token": room.share_token
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
    }

@router.post("/{room_id}/reset-token")
def reset(room_id: int, db: Session = Depends(get_db),
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
    share_token = str(uuid.uuid4())
    room.share_token = share_token
    db.commit()
    db.refresh(room)
    return {"share_token": share_token}