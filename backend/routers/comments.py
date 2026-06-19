from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from auth import decode_token
from database import get_db
from models import Room, Comment
from connection_manager import manager
import json

router = APIRouter()

class CommentCreate(BaseModel):
    line_number: int
    content: str

@router.post("/{room_id}")
async def addComment(
    room_id: int,
    data: CommentCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid Token")
    user_id = payload["user_id"]
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    comment = Comment(
        line_number=data.line_number,
        content=data.content,
        user_id=user_id,
        room_id=room_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    try:
        await manager.broadcast(int(room_id), json.dumps({
            "type": "comment_added",
            "comment": {
                "comment_id": comment.id,
                "user_id": user_id,
                "room_id": room_id,
                "line_number": data.line_number,
                "content": data.content,
                "created_at": str(comment.created_at)
            }
        }))
    except Exception as e:
        print(f"Broadcast error: {e}")
    return {
        "message": "commented successfully",
        "comment_id": comment.id,
        "line_number": comment.line_number,
        "content": comment.content
    }

@router.get("/room/{room_id}")
async def getComment(
    room_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid Token")
    comments = db.query(Comment).filter(Comment.room_id == room_id).all()
    if not comments:
        return []
    return [
        {
            "comment_id": c.id,
            "user_id": c.user_id,
            "room_id": c.room_id,
            "line_number": c.line_number,
            "content": c.content,
            "created_at": c.created_at
        }
        for c in comments
    ]

@router.delete("/{comment_id}")
async def deleteComment(
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Invalid Token")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid Token")
    user_id = payload["user_id"]
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your comment!")
    room_id = int(comment.room_id)
    db.delete(comment)
    db.commit()
    try:
        await manager.broadcast(room_id, json.dumps({
            "type": "comment_deleted",
            "comment_id": comment_id
        }))
    except Exception as e:
        print(f"Broadcast error: {e}")
    return {"message": "Comment deleted successfully!", "id": comment_id}