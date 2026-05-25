from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, WebSocket, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from auth import decode_token
from database import get_db
from models import Room,Comment
from routers.ws import manager  
import json

router = APIRouter()
security = HTTPBearer()

class CommentCreate(BaseModel):
    line_number: int
    content: str

@router.post("/{room_id}")
async def addComment(room_id: int, data: CommentCreate,
               credentials: HTTPAuthorizationCredentials = Security(security),
               db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token=token)
    if not payload:
        raise HTTPException(status_code=401,detail="Invalid Token")
    user_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404,detail="Room not found")
    comment = Comment(line_number=data.line_number,content=data.content,user_id=user_id,room_id=room.id,)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    await manager.broadcast(room.id, json.dumps({   
    "type": "comment",
    "user_id": user_id,
    "line_number": data.line_number,
    "content": data.content,
    "comment_id": comment.id
}))
    return {
    "message": "commented successfully",
    "comment_id": comment.id,
    "line_number": comment.line_number,
    "content": comment.content
}

@router.get("/{room_id}")
async def getComment(room_id: int,credentials: HTTPAuthorizationCredentials = Security(security),
                     db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401,detail="Invalid Token")
    user_id = payload["user_id"]
    comment = db.query(Comment).filter(Comment.room_id == room_id).all()
    if not comment:
        raise HTTPException(status_code=404,detail="Room not found")
    return [
    {
        "comment_id": c.id,
        "user_id": c.user_id,
        "room_id": c.room_id,
        "line_number": c.line_number,
        "content": c.content,
        "created_at": c.created_at
    }
    for c in comment
]
    
@router.delete("/{comment_id}")
def deleteComment(comment_id: int,credentials: HTTPAuthorizationCredentials = Security(security),
                     db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401,detail="Invalid Token")
    user_id = payload["user_id"]
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404,detail="Comment does not exist!")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403,detail="Not your comment!!")
    db.delete(comment)
    db.commit()
    return {"message":"Comment deleted successfully!","id":comment_id}
    