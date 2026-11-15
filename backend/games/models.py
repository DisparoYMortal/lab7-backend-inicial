"""Modelos persistentes de salas y participantes de Cariocas."""
import secrets, string
from django.conf import settings
from django.db import models
# Genera un código corto y único para compartir una sala.
def room_code():
    alphabet = string.ascii_uppercase + "23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))
# Guarda configuración, estado JSON, propietario y ciclo de vida de una partida.
class GameRoom(models.Model):
    MODE_CHOICES = [("online", "Multijugador"), ("bot", "Contra bot")]
    STATUS_CHOICES = [("waiting", "Esperando"), ("playing", "Jugando"), ("finished", "Finalizada")]
    code = models.CharField(max_length=6, unique=True, default=room_code)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_rooms")
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    is_public = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="waiting")
    state = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
# Relaciona usuarios con asientos, nombres visibles y condición de bot.
class GamePlayer(models.Model):
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="players")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    seat = models.PositiveSmallIntegerField()
    is_bot = models.BooleanField(default=False)
    display_name = models.CharField(max_length=80)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_connected = models.BooleanField(default=False)
    class Meta:
        unique_together = [("room", "user"), ("room", "seat")]
        ordering = ["seat"]
