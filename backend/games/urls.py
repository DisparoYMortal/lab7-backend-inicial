from django.urls import path
from . import views
urlpatterns = [
    path("rooms/", views.create_room),
    path("rooms/public/", views.public_rooms),
    path("rooms/<str:code>/", views.room_detail),
    path("rooms/<str:code>/join/", views.join_room),
    path("rooms/<str:code>/start/", views.start_room),
    path("rooms/<str:code>/action/", views.game_action),
    path("rooms/<str:code>/next-round/", views.next_round),
    path("rooms/<str:code>/finish/", views.finish_game),
    path("history/", views.history),
    path("stats/", views.stats),
]
