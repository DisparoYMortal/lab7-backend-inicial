from dataclasses import dataclass
from itertools import combinations
from .cards import Card

@dataclass(frozen=True)
class Meld:
    kind: str
    cards: tuple[Card, ...]
    # (joker_id, rango representado, palo representado o "any"/"red"/"black")
    assignments: tuple[tuple[int, int, str], ...] = ()

    def to_dict(self):
        return {"kind": self.kind, "cards": [c.to_dict() for c in self.cards],
                "assignments": [list(x) for x in self.assignments]}

def _valid_unique(cards):
    return len({c.uid for c in cards}) == len(cards)

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

def sequence_assignments(cards, kind="normal", scale_length=4):
    cards = tuple(cards)
    if not _valid_unique(cards):
        return None
    naturals = [c for c in cards if not c.is_joker]
    jokers = [c for c in cards if c.is_joker]
    if not naturals:
        return None

    if kind == "normal":
        if len(cards) != scale_length:
            return None
        suits = {c.suit for c in naturals}
        if len(suits) != 1 or len({c.rank for c in naturals}) != len(naturals):
            return None
        suit = next(iter(suits))
        natural_ranks = {c.rank for c in naturals}
        for start in range(1, 15 - scale_length):
            target = set(range(start, start + scale_length))
            missing = sorted(target - natural_ranks)
            if len(missing) == len(jokers) and natural_ranks <= target:
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

def is_trio(cards):
    return trio_assignments(cards) is not None

def is_sequence(cards, kind="normal", scale_length=4):
    return sequence_assignments(cards, kind, scale_length) is not None

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
