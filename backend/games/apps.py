"""Configuración de la aplicación Django que contiene el motor de partidas."""
from django.apps import AppConfig
class GamesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "games"
