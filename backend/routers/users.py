from auth import hash_password, verify_password, create_access_token, decode_token
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security
router = APIRouter()

class SignupReq(BaseModel):
    email: str
    password: str
    name: str

class LoginReq(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(data: SignupReq, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this email!")
    user = User(email=data.email,name=data.name,password = hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Account created", "user_id": user.id}

@router.post("/login")
def login(data: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password,user.password):
        raise HTTPException(status_code=400,detail="Invalid Email or Password")
    token = create_access_token({"user_id": user.id, "email": user.email,"name": user.name})
    return {"user_id": user.id,"user_name": user.name,"email": user.email,"message": user.is_active}

security = HTTPBearer()

@router.delete("/me")
def delete(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="No Such User")
    db.delete(user)
    db.commit()
    return {"message": "Account deleted", "user_id": user.id}

    
    
