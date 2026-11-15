"""Validación y enumeración de tríos y escalas.

Este módulo es la autoridad de las reglas de combinaciones para el bot y el
servidor: no decide estrategia, solo determina si un grupo es legal.
"""

from dataclasses import dataclass
from itertools import combinations
from .cards import Card

# Grupo validado: conserva cartas y asignaciones concretas de cualquier Joker.
@dataclass(frozen=True)
class Meld:
    kind: str
    cards: tuple[Card, ...]
    # (joker_id, rango representado, palo representado o "any"/"red"/"black")
    assignments: tuple[tuple[int, int, str], ...] = ()

    def to_dict(self):
        return {"kind": self.kind, "cards": [c.to_dict() for c in self.cards],
                "assignments": [list(x) for x in self.assignments]}

# Evita que una misma carta física aparezca dos veces dentro de una combinación.
def _valid_unique(cards):
    return len({c.uid for c in cards}) == len(cards)

# Comprueba rango común, tamaño mínimo y máximo de un Joker para un trío.
def trio_assignments(cards):
    cards = tuple(cards)
    if len(cards) < 3 or not _valid_unique(cards):
        return None
    naturals = [c for c in cards if not c.is_joker]
    jokers = [c for c in cards if c.is_joker]
    if not naturals or len(jokers) > 1 or len({c.rank for c in naturals}) != 1:
        return None
    # En una baraja de dos mazos puede haber más de tres cartas del mismo rango.
    return tuple((j.joker_id, naturals[0].rank, "any") for j in jokers)

# Valida escalas normales y contratos especiales; devuelve cómo se asigna el Joker si existe.
def sequence_assignments(cards, kind="normal", scale_length=4):
    cards = tuple(cards)
    if not _valid_unique(cards):
        return None
    naturals = [c for c in cards if not c.is_joker]
    jokers = [c for c in cards if c.is_joker]
    if not naturals or len(jokers) > 1:
        return None

    if kind == "normal":
        if len(cards) != scale_length:
            return None
        suits = {c.suit for c in naturals}
        if len(suits) != 1 or len({c.rank for c in naturals}) != len(naturals):
            return None
        suit = next(iter(suits))
        natural_ranks = {c.rank for c in naturals}
        # Secuencia circular con As alto: ... Q-K-A-2-3 ...
        # Las posiciones 1..13 representan A..K; 14 vuelve a A,
        # 15 representa 2 y 16 representa 3.
        rank_positions = {
            1: (1, 14), 2: (2, 15), 3: (3, 16),
            **{rank: (rank,) for rank in range(4, 14)},
        }
        for start in range(1, 14):
            target = tuple(range(start, start + scale_length))
            target_set = set(target)
            mapped_options = [tuple(pos for pos in rank_positions[c.rank] if pos in target_set)
                              for c in naturals]
            if any(not options for options in mapped_options):
                continue
            # Each natural card must occupy a distinct position in this window.
            from itertools import product
            for mapped in product(*mapped_options):
                if len(set(mapped)) != len(mapped):
                    continue
                missing = sorted(target_set - set(mapped))
                if len(missing) == len(jokers):
                    return tuple((j.joker_id, rank, suit.value)
                                 for j, rank in zip(jokers, missing))
        return None

    # Los contratos especiales son siempre A-K y NO aceptan comodines.
    if jokers or len(cards) != 13 or {c.rank for c in naturals} != set(range(1, 14)):
        return None
    if kind == "loca":
        return ()
    if kind == "real":
        return () if len({c.suit for c in naturals}) == 1 else None
    if kind == "primavera":
        colors = [next(c.color for c in naturals if c.rank == rank) for rank in range(1, 14)]
        return () if all(colors[i] != colors[i + 1] for i in range(12)) else None
    raise ValueError(f"Tipo de escala desconocido: {kind}")

# Atajo booleano para comprobar un trío sin necesitar sus asignaciones.
def is_trio(cards):
    return trio_assignments(cards) is not None

# Atajo booleano para comprobar una escala de cualquier modalidad.
def is_sequence(cards, kind="normal", scale_length=4):
    return sequence_assignments(cards, kind, scale_length) is not None

# Enumera todas las combinaciones legales del tamaño solicitado dentro de una mano.
def find_melds(hand, kind, size, scale_length=4, limit=10000):
    result = []
    for group in combinations(hand, size):
        if kind == "trio":
            assignments = trio_assignments(group)
        else:
            assignments = sequence_assignments(group, kind, scale_length)
        if assignments is not None:
            result.append(Meld(kind, tuple(group), assignments))
            if len(result) >= limit:
                break
    return result
