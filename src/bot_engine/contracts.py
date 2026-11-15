"""Definición de contratos y búsqueda de planes completos.

Un plan es una lista de grupos que cumple todas las exigencias del contrato y
usa cada carta física una sola vez.
"""

from dataclasses import dataclass
from .cards import Card
from .combinations import Meld, find_melds

# Contrato inmutable: la tupla melds define exactamente los grupos que hay que bajar.
@dataclass(frozen=True)
class Contract:
    id: int
    name: str
    melds: tuple[str, ...]
    special: bool = False

CONTRACTS = (
    Contract(1, "2 Tríos", ("trio", "trio")),
    Contract(2, "1 Trío y 1 Escala", ("trio", "normal")),
    Contract(3, "2 Escalas", ("normal", "normal")),
    Contract(4, "3 Tríos", ("trio", "trio", "trio")),
    Contract(5, "2 Tríos y 1 Escala", ("trio", "trio", "normal")),
    Contract(6, "1 Trío y 2 Escalas", ("trio", "normal", "normal")),
    Contract(7, "3 Escalas", ("normal", "normal", "normal")),
    Contract(8, "4 Tríos", ("trio", "trio", "trio", "trio")),
    Contract(9, "Escala loca", ("loca",), True),
    Contract(10, "Escala primavera", ("primavera",), True),
    Contract(11, "Escala real", ("real",), True),
)

# Recupera un contrato por identificador y falla de forma explícita si no existe.
def get_contract(contract_id):
    try:
        return next(c for c in CONTRACTS if c.id == int(contract_id))
    except StopIteration:
        raise ValueError(f"Contrato desconocido: {contract_id}")

# Devuelve el número de cartas exigido por un tipo de grupo.
def meld_size(kind, normal_scale_length=4):
    return 3 if kind == "trio" else (13 if kind in ("loca", "primavera", "real")
                                     else normal_scale_length)

# Suma el tamaño de todos los grupos requeridos por un contrato.
def contract_size(contract, normal_scale_length=4):
    return sum(meld_size(k, normal_scale_length) for k in contract.melds)

# Busca planes completos y disjuntos; un contrato mixto no se considera listo a medias.
def enumerate_contract_plans(hand, contract, normal_scale_length=4):
    """Solo devuelve planes completos: TODOS los grupos del contrato deben estar listos."""
    pools = [find_melds(hand, kind, meld_size(kind, normal_scale_length),
                        normal_scale_length)
             for kind in contract.melds]
    if any(not pool for pool in pools):
        return []
    plans = []
    def visit(index, chosen, used):
        if index == len(pools):
            plans.append(tuple(chosen))
            return
        for meld in pools[index]:
            ids = {c.uid for c in meld.cards}
            if not ids & used:
                visit(index + 1, chosen + [meld], used | ids)
    visit(0, [], set())
    return plans

# Devuelve únicamente si existe al menos una distribución completa de la mano.
def contract_is_ready(hand, contract_id, normal_scale_length=4):
    return bool(enumerate_contract_plans(
        hand, get_contract(contract_id), normal_scale_length))
