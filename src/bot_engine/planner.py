"""Evaluación de progreso, selección de robos y descarte estratégico.

El planificador compara subconjuntos de la mano y maximiza el avance real hacia
el contrato, evitando contabilizar una carta como parte de dos grupos distintos.
"""

from collections import Counter
from itertools import combinations
from .contracts import get_contract, meld_size, enumerate_contract_plans
from .combinations import Meld, find_melds
from .cards import RED_SUITS

def _candidate_groups(hand, kind, target_size, scale_length):
    """Grupos completos o parciales que realmente pueden convertirse en el contrato."""
    # Primero genera subconjuntos que respetan ya las restricciones básicas del tipo de grupo.
    # Los grupos parciales se usan para estimar progreso, nunca se presentan como contrato terminado.
    found = []
    if kind == "trio":
        for size in (2, 3):
            for group in combinations(hand, size):
                naturals = [c for c in group if not c.is_joker]
                jokers = [c for c in group if c.is_joker]
                if naturals and len(jokers) <= 1 and len({c.rank for c in naturals}) == 1:
                    found.append(Meld(kind, tuple(group)))
        return found

    if kind == "normal":
        for size in range(2, target_size + 1):
            for group in combinations(hand, size):
                naturals = [c for c in group if not c.is_joker]
                jokers = [c for c in group if c.is_joker]
                if not naturals or len(jokers) > 1:
                    continue
                if len({c.suit for c in naturals}) != 1:
                    continue
                ranks = [c.rank for c in naturals]
                if len(set(ranks)) != len(ranks):
                    continue
                suit = naturals[0].suit
                fits = False
                for first in range(1, 15 - scale_length):
                    window = set(range(first, first + scale_length))
                    if set(ranks) <= window and len(window - set(ranks)) >= len(jokers):
                        fits = True
                        break
                if fits:
                    found.append(Meld(kind, tuple(group)))
        return found

    # Escalas especiales: se conservan rangos únicos mientras se completa A-K.
    for size in range(2, min(13, len(hand)) + 1):
        for group in combinations(hand, size):
            if any(c.is_joker for c in group):
                continue
            ranks = [c.rank for c in group]
            if len(set(ranks)) != len(ranks):
                continue
            ordered = sorted(group, key=lambda c: c.rank)
            if kind == "real" and len({c.suit for c in group}) != 1:
                continue
            if kind == "primavera":
                first_rank = ordered[0].rank
                first_red = ordered[0].suit in RED_SUITS
                if any((c.suit in RED_SUITS) != (first_red ^ bool((c.rank - first_rank) % 2))
                       for c in ordered[1:]):
                    continue
            found.append(Meld(kind, tuple(group)))
    return found

def progress_score(hand, contract_id, normal_scale_length=4):
    """Puntúa cartas útiles para el contrato objetivo, evitando contar una carta dos veces."""
    # PASO 1: prepara un conjunto de grupos candidatos para cada grupo exigido por el contrato.
    contract = get_contract(contract_id)
    pools = []
    for kind in contract.melds:
        target = meld_size(kind, normal_scale_length)
        pools.append(_candidate_groups(hand, kind, target, normal_scale_length))
    # PASO 2: explora combinaciones de candidatos con búsqueda recursiva.
    # `used` contiene los identificadores de cartas ya asignadas a grupos previos.
    best = 0
    def visit(i, used, score):
        nonlocal best
        if i == len(pools):
            best = max(best, score)
            return
        # PASO 3: permite no asignar cartas a este grupo, para evaluar manos aún incompletas.
        visit(i + 1, used, score)
        # PASO 4: prueba cada grupo candidato que no comparta cartas con los ya elegidos.
        for meld in pools[i]:
            ids = {c.uid for c in meld.cards}
            if ids.isdisjoint(used):
                # Prioriza grupos próximos a completarse, pero premia cada carta útil.
                target = meld_size(meld.kind, normal_scale_length)
                bonus = 0.35 if len(meld.cards) == target else 0
                # PASO 5: suma una bonificación pequeña si el grupo ya está completo.
                visit(i + 1, used | ids, score + len(ids) + bonus)
    visit(0, set(), 0)
    return best

def discard_value(card, hand_after_draw, contract_id, normal_scale_length=4):
    # Un Joker es un recurso flexible y casi nunca conviene descartarlo voluntariamente.
    if card.is_joker:
        return -1000
    remaining = [c for c in hand_after_draw if c.uid != card.uid]
    # Compara el progreso antes y después de retirar la carta candidata.
    before = progress_score(hand_after_draw, contract_id, normal_scale_length)
    after = progress_score(remaining, contract_id, normal_scale_length)
    # Valor bajo = mejor descarte; evita desprenderse de cartas que sostienen el progreso.
    return before - after

def choose_best_discard(hand, contract_id, normal_scale_length=4):
    if not hand:
        return None
    return min(hand, key=lambda c: discard_value(c, hand, contract_id, normal_scale_length))

def choose_draw_source(hand, discard_top, contract_id, normal_scale_length=4):
    """Toma el descarte solo si mejora el progreso del contrato."""
    # Si no existe carta visible, la única opción válida es robar del mazo.
    if discard_top is None:
        return "stock"
    current = progress_score(hand, contract_id, normal_scale_length)
    with_top = progress_score(hand + [discard_top], contract_id, normal_scale_length)
    return "discard" if with_top > current else "stock"

def ready_plan(hand, contract_id, normal_scale_length=4):
    return enumerate_contract_plans(hand, get_contract(contract_id), normal_scale_length)
