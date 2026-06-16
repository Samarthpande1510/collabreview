from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from datetime import datetime,timedelta
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    google_id = Column(String, unique=True)
    is_active = Column(Boolean, default=True)

class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    share_token = Column(String, default=lambda: str(uuid.uuid4())[:8], unique=True)
    name = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    language = Column(String)
    code_content = Column(Text)
    updated_at = Column(DateTime,onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    share_mode = Column(String, default="reviewer")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    line_number = Column(Integer)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class RefreshToken(Base):
    __tablename__ = "refreshtokens"
    id = Column(Integer, primary_key = True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token = Column(String)
    expires_at = Column(DateTime,default=lambda: datetime.utcnow() + timedelta(days=7))
    revoked = Column(Boolean,default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

