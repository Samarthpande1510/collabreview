import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}
        self.user_names: dict = {}

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

    async def broadcast(self, room_id: int, message: str):
        if room_id not in self.active_connections:
            return
        dead = []
        for connection in self.active_connections[room_id]:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.active_connections[room_id].remove(d)


manager = ConnectionManager()
print(f"connection_manager loaded, id: {id(manager)}")