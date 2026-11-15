"""Compatibilidad: importa el motor de bot desde el paquete bot_engine."""
from bot_engine.strategy import CariocasBot, Move
from bot_engine.game import BotGameController, GameState, PlayerState

__all__ = ["CariocasBot", "Move", "BotGameController", "GameState", "PlayerState"]
