from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from sqlalchemy.orm import Session
from models import RefreshToken
from datetime import timezone

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = 15
REFRESH_TOKEN_TTL_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"],deprecated="auto")

def hash_password(password:str) -> str:
    return pwd_context.hash(password)

def verify_password(plain:str, password:str) -> bool:
    return pwd_context.verify(plain,password)

def create_access_token(data:dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)

def create_refresh_token(data:dict,db: Session) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
    payload["type"] = "refresh"
    encoded_token = jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)
    refresh_token = RefreshToken(
        user_id = data["user_id"],
        token = pwd_context.hash(encoded_token),
    )
    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return encoded_token

def decode_token(token:str) -> dict:
    try:
       return jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
    except JWTError:
        return None
    
def verify_refresh_token(token: str, db: Session) -> int | None:
    decoded_token = decode_token(token)
    if not decoded_token:
        return None
    if decoded_token["type"] == "refresh":
        db_token = db.query(RefreshToken).filter(RefreshToken.user_id == decoded_token["user_id"],
                                                RefreshToken.revoked == False,
                                                RefreshToken.expires_at > datetime.utcnow()).first()
        if not db_token:
            return None
        if not pwd_context.verify(token,db_token.token):
            return None
        
    else: return None

    return db_token.user_id

def revoke_refresh_token(token:str,db:Session):
    user_id = verify_refresh_token(token=token,db=db)
    if not user_id:
        return None
    decoded_token = decode_token(token)
    if not decoded_token:
        return None
    expires_at = datetime.fromtimestamp(decoded_token["exp"], tz=timezone.utc)

    token = db.query(RefreshToken).filter(RefreshToken.user_id == user_id,
                                          RefreshToken.expires_at == expires_at).first()
    if not token:
        return None
    
    token.revoked = True
    db.commit()
    


        


