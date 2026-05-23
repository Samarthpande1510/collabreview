from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv("SECRET_KEY","your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"],deprecated="auto")

def hash_password(password:str) -> str:
    return pwd_context.hash(password)

def verify_password(plain:str, password:str) -> bool:
    return pwd_context.verify(plain,password)

def create_token(data:dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)

