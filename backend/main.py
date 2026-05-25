from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.users import router as users_router
from routers.rooms import router as rooms_router
from routers.ws import router as ws_router
from routers.comments import router as comments_router
from fastapi.security import HTTPBearer

security = HTTPBearer()

app = FastAPI(
    title="CollabReview API",
    description="Real-time collaborative code review",
    version="1.0.0",
)


origins = [
    "http://localhost:3000",  # React default port
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_credentials=True,
    allow_methods=["*"],             
    allow_headers=["*"],              
)
app.include_router(users_router, prefix="/auth", tags=["auth"])
app.include_router(rooms_router, prefix="/rooms", tags=["rooms"])
app.include_router(ws_router, tags=["websockets"])
app.include_router(comments_router, prefix="/comments", tags=["comments"])
@app.get("/")
def start():
    return {"message": "CORS configured successfully!"}

