import os
from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()


class ConnectionManager:

    def __init__(self):
        self.active_connections: dict = {}
        self.user_names: dict = {}
        self._redis = None

    async def connect(self, room_id: int, websocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    def add_user(self, room_id: int, name: str):
        if room_id not in self.user_names:
            self.user_names[room_id] = []
        if name not in self.user_names[room_id]:
            self.user_names[room_id].append(name)

    def remove_user(self, room_id: int, name: str):
        if room_id in self.user_names:
            if name in self.user_names[room_id]:
                self.user_names[room_id].remove(name)
            if not self.user_names[room_id]:
                del self.user_names[room_id]
    
    async def get_redis(self):
        if self._redis is None:
            self._redis = Redis.from_url(
    os.getenv("REDIS_URL"),
    health_check_interval=30,
    socket_keepalive=True,
)
        return self._redis

    async def broadcast(self, room_id: int, message: str):
        await self.get_redis()
        channel = f"room:{room_id}"
        await self._redis.publish(channel,message)

    async def listen(self,room_id: int):
        await self.get_redis()
        channel = f"room:{room_id}"
        subscribe =  self._redis.pubsub()
        await subscribe.subscribe(channel)
        async for m in subscribe.listen():
            if m["type"] == "message":
                yield m["data"].decode()

manager = ConnectionManager()
print(f"connection_manager loaded, id: {id(manager)}")