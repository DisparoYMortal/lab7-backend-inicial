from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from .models import GameRoom
from .engine import public_state

class TokenRoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.code=self.scope["url_route"]["kwargs"]["code"].upper()
        query=parse_qs(self.scope.get("query_string",b"").decode())
        token_key=query.get("token",[None])[0]
        user=await self.get_user(token_key)
        if not user or not await self.is_member(user.id,self.code):
            await self.close(code=4403); return
        self.user_id=user.id
        self.group_name=f"room_{self.code}"
        await self.channel_layer.group_add(self.group_name,self.channel_name)
        await self.accept()
        payload=await self.get_state(user.id,self.code)
        await self.send_json({"type":"state","state":payload})
    @database_sync_to_async
    def get_user(self,key):
        if not key: return None
        try: return Token.objects.select_related("user").get(key=key).user
        except Token.DoesNotExist: return None
    @database_sync_to_async
    def is_member(self,user_id,code):
        return GameRoom.objects.filter(code=code,players__user_id=user_id).exists()
    @database_sync_to_async
    def get_state(self,user_id,code):
        room=GameRoom.objects.get(code=code)
        if room.state and room.status in ("playing","finished"):
            return public_state(room.state,str(user_id))
        return {"code":room.code,"status":room.status,
                "players":[{"name":p.display_name,"seat":p.seat} for p in room.players.all()]}
    async def game_update(self,event):
        payload=await self.get_state(self.user_id,self.code)
        await self.send_json({"type":"state","state":payload})
    async def disconnect(self,close_code):
        if hasattr(self,"group_name"):
            await self.channel_layer.group_discard(self.group_name,self.channel_name)
