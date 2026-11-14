from dataclasses import dataclass
from .contracts import get_contract
from .planner import choose_best_discard, choose_draw_source, ready_plan
from .table import find_additions

@dataclass
class Move:
    action: str
    data: dict
    reason: str

    def to_dict(self):
        def convert(v):
            if hasattr(v, "to_dict"):
                return v.to_dict()
            if isinstance(v, list):
                return [convert(x) for x in v]
            if isinstance(v, dict):
                return {k: convert(x) for k, x in v.items()}
            return v
        return {"action": self.action, "data": convert(self.data), "reason": self.reason}

class CariocasBot:
    """Decisor de turno; el controlador ejecuta y persiste las acciones."""
    def __init__(self, normal_scale_length=4):
        if normal_scale_length < 3 or normal_scale_length > 13:
            raise ValueError("La escala normal debe medir entre 3 y 13 cartas.")
        self.normal_scale_length = normal_scale_length

    def choose_draw(self, hand, discard_top, contract_id):
        source = choose_draw_source(hand, discard_top, contract_id, self.normal_scale_length)
        reason = "El descarte superior mejora el progreso." if source == "discard" else "Robar del mazo para buscar cartas útiles."
        return Move("draw", {"source": source}, reason)

    def choose_post_draw(self, hand, contract_id, table_melds=(), player_id="bot", has_laid_contract=False):
        contract = get_contract(contract_id)
        # Regla fundamental: el contrato entero debe estar completo y disjunto.
        plans = ready_plan(hand, contract_id, self.normal_scale_length)
        if plans and not has_laid_contract:
            plan = plans[0]
            return Move("lay_contract", {
                "contract_id": contract.id,
                "contract_name": contract.name,
                "melds": [m.to_dict() for m in plan],
            }, f"Contrato completo: {contract.name}. Se bajan todos sus grupos juntos.")

        # Solo quien ya bajó su contrato puede pegar cartas a la mesa.
        additions = find_additions(hand, list(table_melds)) if has_laid_contract else []
        if additions:
            return Move("add_cards", {"additions": [
                {"card": a["card"].to_dict(), "meld_index": a["meld_index"], "owner": a["owner"]}
                for a in additions
            ]}, "Agrega cartas compatibles a combinaciones de la mesa.")

        card = choose_best_discard(hand, contract_id, self.normal_scale_length)
        return Move("discard", {"card": card.to_dict() if card else None},
                    "No hay contrato completo ni agregado disponible; descarta la carta menos útil.")

    def choose_turn(self, hand, contract_id, discard_top=None):
        return self.choose_draw(hand, discard_top, contract_id)
