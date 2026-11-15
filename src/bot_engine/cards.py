"""Modelo de cartas y utilidades de conversión del motor Cariocas.

El bot utiliza objetos Card en lugar de cadenas de interfaz para que las reglas
puedan comparar rangos, palos, duplicados y comodines sin depender del frontend.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Iterable

# Enumera los cuatro palos usados internamente; sus nombres no dependen de la interfaz.
class Suit(str, Enum):
    CLUBS = "clubs"
    SPADES = "spades"
    DIAMONDS = "diamonds"
    HEARTS = "hearts"

RED_SUITS = {Suit.DIAMONDS, Suit.HEARTS}
BLACK_SUITS = {Suit.CLUBS, Suit.SPADES}
RANK_NAMES = {1: "A", 11: "J", 12: "Q", 13: "K"}

# Carta inmutable: la identidad incluye el mazo de origen para distinguir duplicados físicos.
@dataclass(frozen=True, slots=True)
class Card:
    rank: int | None
    suit: Suit | None
    deck_id: int = 0
    joker_id: int | None = None

    def __post_init__(self):
        if self.joker_id is not None:
            if self.rank is not None or self.suit is not None:
                raise ValueError("Un comodín no puede tener rango ni palo.")
        elif self.rank not in range(1, 14) or self.suit is None:
            raise ValueError("Carta inválida: rango 1..13 y palo obligatorio.")

    @property
    def is_joker(self) -> bool:
        return self.joker_id is not None

    @property
    def color(self) -> str | None:
        if self.suit in RED_SUITS:
            return "red"
        if self.suit in BLACK_SUITS:
            return "black"
        return None

    @property
    def uid(self) -> str:
        return f"joker:{self.joker_id}" if self.is_joker else f"{self.deck_id}:{self.rank}:{self.suit.value}"

    def to_dict(self) -> dict:
        if self.is_joker:
            return {"joker": True, "joker_id": self.joker_id}
        return {"rank": self.rank, "suit": self.suit.value, "deck_id": self.deck_id}

    def __str__(self):
        if self.is_joker:
            return f"JOKER-{self.joker_id}"
        return f"{RANK_NAMES.get(self.rank, self.rank)}-{self.suit.value}"

# Construye dos mazos completos y agrega cuatro Jokers identificables.
def standard_deck() -> list[Card]:
    cards = [Card(rank, suit, deck_id)
             for deck_id in (0, 1)
             for suit in Suit
             for rank in range(1, 14)]
    cards.extend(Card(None, None, joker_id=i) for i in range(4))
    return cards

# Convierte datos serializados a Card y deja pasar objetos Card ya construidos.
def parse_card(value: dict | Card) -> Card:
    if isinstance(value, Card):
        return value
    if value.get("joker") or value.get("is_joker"):
        return Card(None, None, joker_id=int(value["joker_id"]))
    return Card(int(value["rank"]), Suit(value["suit"]), int(value.get("deck_id", 0)))

# Normaliza una mano completa para que el motor trabaje con objetos Card.
def parse_hand(values: Iterable[dict | Card]) -> list[Card]:
    return [parse_card(v) for v in values]
