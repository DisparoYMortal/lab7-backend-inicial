"""Motor autoritativo de partidas online y contra bot.

Este módulo mantiene las cartas y puntuaciones en el servidor. El navegador solo
recibe el estado público y solicita acciones; cada acción se valida aquí antes
de persistirse y difundirse a los demás participantes.
"""
import random, sys
from pathlib import Path
from copy import deepcopy
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src'))
from datetime import datetime, timezone
from bot_engine.cards import standard_deck, parse_card, Card, Suit
from bot_engine.contracts import get_contract, enumerate_contract_plans, meld_size
from bot_engine.combinations import trio_assignments, sequence_assignments
from bot_engine.strategy import CariocasBot
from bot_engine.table import TableMeld, can_add_to_meld, add_card_to_meld

SUIT_TO_UI = {"spades":"sword", "hearts":"cup", "diamonds":"coin", "clubs":"club"}
RANK_TO_UI = {1:"A", 11:"J", 12:"Q", 13:"K"}
# Genera un identificador estable para comparar cartas físicas.
def card_uid(raw):
    return parse_card(raw).uid
# Convierte una carta interna al código que entiende el frontend.
def card_code(raw):
    c = parse_card(raw)
    if c.is_joker:
        return "JOKER" if c.joker_id == 0 else f"JOKER_{c.joker_id+1}"
    rank = RANK_TO_UI.get(c.rank, str(c.rank))
    return f"{rank}_{SUIT_TO_UI[c.suit.value]}" + ("" if c.deck_id == 0 else "1")
# Serializa una carta e incluye su UID y código visual.
def pack_card(card):
    c = parse_card(card)
    d = c.to_dict()
    d["uid"] = c.uid
    d["code"] = card_code(c)
    return d
# Normaliza una lista de cartas recibidas desde el estado persistido.
def unpack_cards(cards):
    return [parse_card(c) for c in cards]
# Construye y mezcla dos mazos con cuatro comodines.
def shuffled_deck():
    deck = standard_deck()
    random.shuffle(deck)
    return [c.to_dict() for c in deck]
# Calcula la penalización que se suma al marcador al cerrar una ronda.
def card_points(raw):
    c = parse_card(raw)
    if c.is_joker: return 30
    if c.rank == 1: return 20
    if c.rank >= 11: return 10
    return c.rank
# Traduce el número de ronda y la modalidad especial al ID del contrato.
def contract_for_round(round_id, special_choice=None):
    if round_id <= 8: return round_id
    if round_id != 9:
        raise ValueError("El Cariocas tiene 9 contratos/rondas.")
    if special_choice not in ("loca", "primavera", "real"):
        raise ValueError("Debes elegir una modalidad especial: loca, primavera o real.")
    return {"loca":9, "primavera":10, "real":11}[special_choice]
# Reparte las manos, crea el descarte inicial y conserva el marcador acumulado.
def new_round(players, round_id, scores=None, special_choice=None):
    contract_id = contract_for_round(round_id, special_choice)
    contract = get_contract(contract_id)
    deck = shuffled_deck()
    count = 13 if contract.special else 12
    hands = {}
    for p in players:
        hands[p["player_id"]] = deck[:count]
        deck = deck[count:]
    first_discard = deck.pop(0)
    return {
        "round_id": round_id, "contract_id": contract_id,
        "contract_name": contract.name, "special_choice": special_choice,
        "players": players, "hands": hands, "stock": deck,
        "discard": [first_discard], "table_melds": [],
        "has_laid": {p["player_id"]: False for p in players},
        "scores": scores or {p["player_id"]: 0 for p in players},
        "current_index": 0, "phase": "draw", "winner": None,
        "round_points": {}, "status": "playing", "last_action": None,
    }
# Filtra el estado para un jugador: solo revela su propia mano.
def public_state(state, viewer_id):
    players = []
    for i,p in enumerate(state["players"]):
        pid=p["player_id"]
        players.append({
            "player_id":pid, "name":p["name"], "is_bot":p["is_bot"],
            "seat":i, "card_count":len(state["hands"].get(pid,[])),
            "has_laid":state["has_laid"].get(pid,False),
            "score":state["scores"].get(pid,0),
            "is_turn":i==state["current_index"],
        })
    own = state["hands"].get(str(viewer_id), [])
    return {
        "round_id":state["round_id"], "contract_id":state["contract_id"],
        "contract_name":state["contract_name"], "special_choice":state["special_choice"],
        "players":players, "hand":[pack_card(c) for c in own],
        "stock_count":len(state["stock"]),
        "discard":[pack_card(c) for c in state["discard"]],
        "table_melds":state["table_melds"], "phase":state["phase"],
        "winner":state["winner"], "round_points":state["round_points"],
        "status":state["status"], "current_player":state["players"][state["current_index"]]["player_id"],
        "last_action":state["last_action"],
    }
# Devuelve el jugador cuyo turno está activo.
def _player(state):
    return state["players"][state["current_index"]]
# Busca una carta por UID dentro de una mano y rechaza IDs ajenos.
def _find_card(hand, uid):
    for c in hand:
        if card_uid(c)==uid: return c
    raise ValueError("La carta indicada no está en tu mano.")
# Recupera el orden y los tipos de grupos exigidos por el contrato.
def _contract_group_kinds(contract_id):
    return list(get_contract(contract_id).melds)
# Valida todos los grupos y evita reutilizar una carta en el mismo contrato.
def _validate_contract_groups(state, player_id, groups):
    contract=get_contract(state["contract_id"])
    kinds=list(contract.melds)
    if len(groups)!=len(kinds):
        raise ValueError("Debes bajar todos los grupos del contrato al mismo tiempo.")
    hand=state["hands"][player_id]
    used=set()
    prepared=[]
    for kind, group_uids in zip(kinds, groups):
        if not isinstance(group_uids,list): raise ValueError("Formato de grupo inválido.")
        cards=[_find_card(hand,uid) for uid in group_uids]
        ids={card_uid(c) for c in cards}
        if len(ids)!=len(cards) or ids & used: raise ValueError("No puedes usar una carta más de una vez.")
        used |= ids
        target=meld_size(kind)
        if len(cards)!=target: raise ValueError(f"El grupo {kind} debe tener {target} cartas.")
        if kind=="trio":
            if len([c for c in cards if parse_card(c).is_joker])>1 or trio_assignments(unpack_cards(cards)) is None:
                raise ValueError("El trío no es válido.")
        elif sequence_assignments(unpack_cards(cards),kind,4) is None:
            raise ValueError(f"La escala {kind} no es válida.")
        assignments={}
        if kind=="normal":
            for joker_id, represented_rank, represented_suit in sequence_assignments(unpack_cards(cards),kind,4):
                assignments[str(joker_id)]={"rank":represented_rank,"suit":represented_suit}
        prepared.append({"owner":player_id,"kind":kind,"cards":[pack_card(c) for c in cards],
                         "special":kind in ("loca","primavera","real"),"assignments":assignments})
    return prepared, used
# Marca ganador, calcula puntos muertos y actualiza los totales de todos los jugadores.
def _end_round(state, winner_id):
    state["winner"]=winner_id
    state["phase"]="round_finished"
    state["status"]="round_finished"
    points={}
    for p in state["players"]:
        pid=p["player_id"]
        points[pid]=0 if pid==winner_id else sum(card_points(c) for c in state["hands"][pid])
        state["scores"][pid]=state["scores"].get(pid,0)+points[pid]
    state["round_points"]=points
# Ejecuta un robo desde el mazo o descarte y cambia la fase a descartar.
def _draw(state, player_id, source):
    if state["phase"]!="draw": raise ValueError("Ya robaste una carta en este turno.")
    if source=="discard":
        if not state["discard"]: raise ValueError("No hay cartas en el descarte.")
        card=state["discard"].pop()
    elif source=="stock":
        if not state["stock"]:
            if len(state["discard"])<=1: raise ValueError("No quedan cartas para robar.")
            top=state["discard"].pop()
            state["stock"]=state["discard"]
            random.shuffle(state["stock"])
            state["discard"]=[top]
        card=state["stock"].pop()
    else: raise ValueError("Origen de robo inválido.")
    state["hands"][player_id].append(card)
    state["phase"]="discard"
    state["last_action"]={"type":"draw","player_id":player_id,"source":source}
# Retira la carta elegida, la añade al descarte y cierra la ronda si la mano queda vacía.
def _discard(state, player_id, uid):
    if state["phase"]!="discard": raise ValueError("Primero debes robar una carta.")
    hand=state["hands"][player_id]
    card=_find_card(hand,uid)
    hand.remove(card)
    state["discard"].append(card)
    state["last_action"]={"type":"discard","player_id":player_id,"card":pack_card(card)}
    if not hand:
        _end_round(state,player_id)
    else:
        state["current_index"]=(state["current_index"]+1)%len(state["players"])
        state["phase"]="draw"
# Ejecuta el turno completo del bot: robo, análisis, bajada/extensiones y descarte.
def _bot_turn(state, bot_id):
    # PASO 1: crea el decisor; el bot recibe objetos de carta, no elementos visuales.
    bot=CariocasBot()
    # Safety cap prevents a malformed state from looping forever.
    # PASO 2: decide entre el descarte visible y el mazo usando el progreso del contrato.
    _draw(state,bot_id,bot.choose_draw(unpack_cards(state["hands"][bot_id]),
        parse_card(state["discard"][-1]) if state["discard"] else None,
        state["contract_id"]).data["source"])
    # PASO 3: prepara la mano y una representación temporal de la mesa para evaluar extensiones.
    hand=unpack_cards(state["hands"][bot_id])
    table_objects=[
        TableMeld(m["owner"],m["kind"],unpack_cards(m["cards"]),
                  assignments=deepcopy(m.get("assignments",{})),special=m.get("special",False))
        for m in state["table_melds"]
    ]
    # PASO 4: decide si baja el contrato completo, pega cartas o descarta.
    move=bot.choose_post_draw(hand,state["contract_id"],table_objects,bot_id,state["has_laid"][bot_id])
    if move.action=="lay_contract":
        plan=move.data["melds"]
        groups=[[card_uid(c) for c in meld["cards"]] for meld in plan]
        melds,used=_validate_contract_groups(state,bot_id,groups)
        state["hands"][bot_id]=[c for c in state["hands"][bot_id] if card_uid(c) not in used]
        state["table_melds"].extend(melds)
        state["has_laid"][bot_id]=True
    elif move.action=="add_cards":
        # The bot engine can suggest extensions; validate each against the live table.
        for add in move.data["additions"]:
            try:
                c=_find_card(state["hands"][bot_id],card_uid(add["card"]))
                meld=state["table_melds"][add["meld_index"]]
                tm=TableMeld(meld["owner"],meld["kind"],unpack_cards(meld["cards"]),
                              assignments=deepcopy(meld.get("assignments",{})),special=meld.get("special",False))
                if can_add_to_meld(parse_card(c),tm):
                    add_card_to_meld(parse_card(c),tm)
                    meld["cards"].append(pack_card(c))
                    meld["assignments"]=tm.assignments
                    state["hands"][bot_id].remove(c)
            except (ValueError,IndexError):
                continue
    if state["hands"][bot_id]:
        # PASO 5: si aún quedan cartas, vuelve a evaluar la mano tras bajar o pegar.
        # El descarte final se valida con la misma función que las acciones humanas.
        c=bot.choose_post_draw(unpack_cards(state["hands"][bot_id]),state["contract_id"],
                              [],bot_id,state["has_laid"][bot_id])
        candidate=c.data.get("card") if c.action=="discard" else None
        uid=card_uid(candidate) if candidate else card_uid(state["hands"][bot_id][-1])
        _discard(state,bot_id,uid)
    else:
        _end_round(state,bot_id)
# Encadena los turnos automáticos mientras el siguiente jugador sea un bot.
def advance_bots(state):
    while state["status"]=="playing" and _player(state)["is_bot"]:
        _bot_turn(state,_player(state)["player_id"])
    return state
# Copia el estado, valida la acción humana, aplica reglas y avanza los bots.
def apply_action(state, user_id, action, data):
    state=deepcopy(state)
    if state["status"]!="playing": raise ValueError("La ronda ya terminó.")
    player=_player(state)
    pid=str(user_id)
    if player["player_id"]!=pid: raise ValueError("No es tu turno.")
    if action=="draw":
        _draw(state,pid,data.get("source","stock"))
    elif action=="lay_contract":
        if state["phase"]!="discard": raise ValueError("Debes robar antes de bajar el contrato.")
        if state["has_laid"][pid]: raise ValueError("Ya bajaste tu contrato.")
        melds,used=_validate_contract_groups(state,pid,data.get("groups",[]))
        state["hands"][pid]=[c for c in state["hands"][pid] if card_uid(c) not in used]
        state["table_melds"].extend(melds)
        state["has_laid"][pid]=True
        state["last_action"]={"type":"lay_contract","player_id":pid}
        if not state["hands"][pid]:
            _end_round(state,pid)
    elif action=="add_cards":
        if state["phase"]!="discard" or not state["has_laid"][pid]:
            raise ValueError("Solo puedes pegar cartas después de bajar tu contrato y robar.")
        idx=int(data.get("meld_index",-1))
        if idx<0 or idx>=len(state["table_melds"]): raise ValueError("Combinación de mesa inválida.")
        meld=state["table_melds"][idx]
        cards=[_find_card(state["hands"][pid],u) for u in data.get("card_uids",[])]
        if not cards: raise ValueError("Selecciona al menos una carta.")
        tm=TableMeld(meld["owner"],meld["kind"],unpack_cards(meld["cards"]),
                              assignments=deepcopy(meld.get("assignments",{})),special=meld.get("special",False))
        for c in cards:
            if not can_add_to_meld(parse_card(c),tm): raise ValueError("Una de las cartas no se puede agregar.")
            add_card_to_meld(parse_card(c),tm)
        for c in cards:
            meld["cards"].append(pack_card(c)); meld["assignments"]=tm.assignments
            state["hands"][pid].remove(c)
        state["last_action"]={"type":"add_cards","player_id":pid,"meld_index":idx}
        if not state["hands"][pid]:
            _end_round(state,pid)
    elif action=="discard":
        _discard(state,pid,data.get("card_uid",""))
    else:
        raise ValueError("Acción desconocida.")
    return advance_bots(state)
