"""Política de decisión del bot de Cariocas.

El motor recibe la mano y el estado visible de la mesa, decide una acción y
entrega una instrucción. El controlador externo ejecuta esa instrucción y aplica
las reglas definitivas antes de guardar el estado de la partida.
"""

from dataclasses import dataclass
from .contracts import get_contract
from .planner import choose_best_discard, choose_draw_source, ready_plan, progress_score
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
        # PASO 1: mide el progreso actual de la mano hacia el contrato.
        # PASO 2: vuelve a medirlo simulando que toma la carta superior del descarte.
        # PASO 3: elige el descarte solo si mejora el progreso; en caso contrario roba a ciegas.
        source = choose_draw_source(hand, discard_top, contract_id, self.normal_scale_length)
        reason = "El descarte superior mejora el progreso." if source == "discard" else "Robar del mazo para buscar cartas útiles."
        return Move("draw", {"source": source}, reason)

    def choose_post_draw(self, hand, contract_id, table_melds=(), player_id="bot", has_laid_contract=False):
        # PASO 1: carga la definición del contrato (cantidad y tipo de grupos exigidos).
        contract = get_contract(contract_id)
        # PASO 2: enumera planes completos; cada plan debe cubrir todos los grupos y no reutilizar cartas.
        plans = ready_plan(hand, contract_id, self.normal_scale_length)
        if plans and not has_laid_contract:
            # PASO 3: si existen varios planes completos, evalúa la mano que quedaría después de bajar.
            # Se favorece el plan que deja más posibilidades de completar otros grupos en turnos futuros.
            def plan_quality(plan):
                used = {card.uid for meld in plan for card in meld.cards}
                remaining = [card for card in hand if card.uid not in used]
                # Calcula sinergias restantes y, por separado, el coste de cartas difíciles de conservar.
                future = progress_score(remaining, contract_id, self.normal_scale_length)
                deadwood = sum(
                    30 if card.is_joker else (20 if card.rank == 1 else 10 if card.rank >= 11 else card.rank)
                    for card in remaining
                )
                return future * 10 - deadwood
            # PASO 4: selecciona el plan con mejor balance entre potencial futuro y puntos muertos.
            plan = max(plans, key=plan_quality)
            return Move("lay_contract", {
                "contract_id": contract.id,
                "contract_name": contract.name,
                "melds": [m.to_dict() for m in plan],
            }, f"Contrato completo: {contract.name}. Se bajan todos sus grupos juntos.")

        # PASO 5: si el contrato ya fue bajado, revisa todas las combinaciones visibles.
        # find_additions evita proponer una misma carta dos veces y permite ayudar a cualquier jugador.
        additions = find_additions(hand, list(table_melds)) if has_laid_contract else []
        if additions:
            # PASO 6: pegar cartas suele reducir la penalización de la mano y acelera el cierre de ronda.
            return Move("add_cards", {"additions": [
                {"card": a["card"].to_dict(), "meld_index": a["meld_index"], "owner": a["owner"]}
                for a in additions
            ]}, "Agrega cartas compatibles a combinaciones de la mesa.")

        # PASO 7: si no puede bajar ni pegar, descarta la carta que menos perjudique el progreso.
        card = choose_best_discard(hand, contract_id, self.normal_scale_length)
        return Move("discard", {"card": card.to_dict() if card else None},
                    "No hay contrato completo ni agregado disponible; descarta la carta menos útil.")

    def choose_turn(self, hand, contract_id, discard_top=None):
        return self.choose_draw(hand, discard_top, contract_id)
