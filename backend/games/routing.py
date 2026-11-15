from django.urls import re_path
from .consumers import TokenRoomConsumer
websocket_urlpatterns = [
    re_path(r"ws/rooms/(?P<code>[A-Z0-9]{6})/$", TokenRoomConsumer.as_asgi()),
]
