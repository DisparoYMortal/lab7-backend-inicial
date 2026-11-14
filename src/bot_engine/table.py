from dataclasses import dataclass, field
from .cards import Card
from .combinations import Meld

@dataclass
class TableMeld:
    owner: str
    kind: str
    cards: list[Card]
    # Para escalas normales: palo y rangos representados.
    assignments: dict = field(default_factory=dict)
    special: bool = False

def can_add_to_meld(card: Card, meld: TableMeld):
    if meld.special:
        return False
    if meld.kind == "trio":
        naturals = [c for c in meld.cards if not c.is_joker]
        jokers = [c for c in meld.cards if c.is_joker]
        if card.is_joker:
            return bool(naturals) and len(jokers) == 0
        return bool(naturals) and card.rank == naturals[0].rank
    if meld.kind == "normal":
        naturals = [c for c in meld.cards if not c.is_joker]
        if not naturals:
            return False
        suit = naturals[0].suit
        if any(c.suit != suit for c in naturals):
            return False
        assigned = meld.assignments or {}
        represented = [c.rank for c in naturals]
        for value in assigned.values():
            represented.append(value["rank"] if isinstance(value, dict) else int(value))
        lo, hi = min(represented), max(represented)
        if card.is_joker:
            return lo > 1 or hi < 13
        return card.suit == suit and card.rank in (lo - 1, hi + 1) and 1 <= card.rank <= 13
    return False

def add_card_to_meld(card: Card, meld: TableMeld):
    if not can_add_to_meld(card, meld):
        raise ValueError("La carta no se puede agregar a esta combinación.")
    if meld.kind == "normal" and card.is_joker:
        naturals = [c for c in meld.cards if not c.is_joker]
        suit = naturals[0].suit
        represented = [c.rank for c in naturals]
        for value in (meld.assignments or {}).values():
            represented.append(value["rank"] if isinstance(value, dict) else int(value))
        lo, hi = min(represented), max(represented)
        rank = lo - 1 if lo > 1 else hi + 1
        meld.assignments[str(card.joker_id)] = {"rank": rank, "suit": suit.value}
    meld.cards.append(card)
    return meld

def find_additions(hand, table_melds):
    """Devuelve agregados legales posibles, incluso a combinaciones de otros jugadores."""
    remaining = list(hand)
    additions = []
    for meld_index, meld in enumerate(table_melds):
        for card in list(remaining):
            if can_add_to_meld(card, meld):
                additions.append({"card": card, "meld_index": meld_index,
                                  "owner": meld.owner})
                remaining.remove(card)
    return additions
