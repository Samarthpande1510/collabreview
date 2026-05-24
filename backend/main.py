from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.users import router
from fastapi.security import HTTPBearer

security = HTTPBearer()

app = FastAPI(
    title="CollabReview API",
    description="Real-time collaborative code review",
    version="1.0.0",
)
app.include_router(router, prefix="/auth", tags=["auth"])

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

@app.get("/")
def start():
    return {"message": "CORS configured successfully!"}

