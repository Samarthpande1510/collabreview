from auth import hash_password, verify_password, create_access_token, decode_token,create_refresh_token,revoke_refresh_token
from fastapi import APIRouter, Depends, HTTPException,Request,Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import User

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
    token = create_access_token({"user_id": user.id,"email": user.email,"name": user.name})
    message = {"message": "Signed in successfully","user_id": user.id,"user_name": user.name,"email": user.email}
    response = JSONResponse(content=message)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=900,
        secure=True,
        samesite="lax"
    )
    refresh_token = create_refresh_token({"user_id": user.id}, db=db)

    response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,
    max_age=604800,  
    secure=True,
    samesite="lax"
    )
    return response

@router.post("/login")
def login(data: LoginReq, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password,user.password):
        raise HTTPException(status_code=400,detail="Invalid Email or Password")
    token = create_access_token({"user_id": user.id,"email": user.email,"name": user.name})
    message = {"message": "Logged in successfully","user_id": user.id,"user_name": user.name,"email": user.email}
    response = JSONResponse(content=message)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=900,
        secure=True,
        samesite="lax"
    )
    refresh_token = create_refresh_token({"user_id": user.id}, db=db)
    response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    httponly=True,
    max_age=604800,  
    secure=True,
    samesite="lax"
)
    return response


@router.post("/logout")
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token  = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    response.delete_cookie(key="access_token", httponly=True, secure=True, samesite="lax")
    response.delete_cookie(key="refresh_token",httponly=True,secure=True, samesite="lax")
    revoke_refresh_token(refresh_token,db=db)
    return {"message": "Logged out successfully"}


@router.get("/me")
def me(request: Request):
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    response_data = decode_token(access_token)
    if not response_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {
        "user_name": response_data["name"],
        "email": response_data["email"],
        "user_id": response_data["user_id"]
    }

@router.delete("/delete")
def delete(request: Request,response: Response,db: Session = Depends(get_db)):
    access_token  = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    response_data = decode_token(access_token)
    if not response_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    db.query(User).filter(User.id == response_data["user_id"]).delete()
    db.commit()
    response.delete_cookie(key="access_token",httponly=True, secure=True, samesite="lax")
    response.delete_cookie(key="refresh_token",httponly=True,secure=True,samesite="lax")
    return {"message": "User deleted successfully"}
    

    


    

    
    
