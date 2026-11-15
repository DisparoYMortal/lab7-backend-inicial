"""WebSocket autenticado y presencia persistente de participantes."""
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.db import transaction
from rest_framework.authtoken.models import Token
from .models import GameRoom, GamePlayer
from .engine import public_state

class TokenRoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.code = self.scope["url_route"]["kwargs"]["code"].upper()
        query = parse_qs(self.scope.get("query_string", b"").decode())
        user = await self.get_user(query.get("token", [None])[0])
        if not user or not await self.set_presence(user.id, self.code, True):
            await self.close(code=4403)
            return
        self.user_id = user.id
        self.group_name = f"room_{self.code}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type":"state","state":await self.get_state(user.id,self.code)})
        await self.channel_layer.group_send(self.group_name, {"type":"game.update"})

    @database_sync_to_async
    def get_user(self, key):
        if not key: return None
        try: return Token.objects.select_related("user").get(key=key).user
        except Token.DoesNotExist: return None

    @database_sync_to_async
    def set_presence(self, user_id, code, connected):
        try:
            with transaction.atomic():
                room = GameRoom.objects.select_for_update().get(code=code)
                player = GamePlayer.objects.select_for_update().get(room=room,user_id=user_id)
                player.is_connected = connected
                player.save(update_fields=["is_connected"])
                owner_online = bool(room.owner_id and room.players.filter(user_id=room.owner_id,is_connected=True).exists())
                if connected and not owner_online:
                    room.owner_id = user_id
                    room.save(update_fields=["owner"])
                elif not connected and room.owner_id == user_id:
                    next_host = room.players.filter(is_connected=True,user__isnull=False).exclude(user_id=user_id).order_by("seat").first()
                    if next_host:
                        room.owner_id = next_host.user_id
                        room.save(update_fields=["owner"])
            return True
        except (GameRoom.DoesNotExist,GamePlayer.DoesNotExist):
            return False

    @database_sync_to_async
    def get_state(self,user_id,code):
        room=GameRoom.objects.get(code=code)
        if room.state and room.status in ("playing","finished"):
            payload=public_state(room.state,str(user_id))
        else:
            payload={"code":room.code,"mode":room.mode,"status":room.status,
                     "players":[{"player_id":str(p.user_id),"name":p.display_name,"seat":p.seat,
                                 "is_bot":p.is_bot,"is_connected":p.is_connected}
                                for p in room.players.all()]}
        payload["owner_id"]=str(room.owner_id) if room.owner_id else None
        payload["is_owner_connected"]=bool(room.owner_id and room.players.filter(user_id=room.owner_id,is_connected=True).exists())
        for p in payload.get("players",[]):
            member=room.players.filter(user_id=p.get("player_id")).first()
            p["is_connected"]=bool(member and member.is_connected)
            p["is_host"]=bool(room.owner_id and str(room.owner_id)==p.get("player_id"))
        return payload

    async def game_update(self,event):
        await self.send_json({"type":"state","state":await self.get_state(self.user_id,self.code)})

    async def disconnect(self,close_code):
        if hasattr(self,"group_name"):
            await self.channel_layer.group_discard(self.group_name,self.channel_name)
        if hasattr(self,"user_id"):
            await self.set_presence(self.user_id,self.code,False)
            if hasattr(self,"group_name"):
                await self.channel_layer.group_send(self.group_name,{"type":"game.update"})
