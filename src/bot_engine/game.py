from dataclasses import dataclass, field
from .cards import Card, standard_deck
from .strategy import CariocasBot
from .contracts import get_contract

@dataclass
class PlayerState:
    player_id: str
    hand: list[Card]
    contract_id: int
    has_laid_contract: bool = False

@dataclass
class GameState:
    players: list[PlayerState]
    stock: list[Card]
    discard_pile: list[Card] = field(default_factory=list)
    table_melds: list = field(default_factory=list)
    current_player: int = 0

    @property
    def discard_top(self):
        return self.discard_pile[-1] if self.discard_pile else None

    def draw(self, source):
        if source == "discard":
            if not self.discard_pile:
                raise ValueError("No hay cartas en el montón de descarte.")
            return self.discard_pile.pop()
        if not self.stock:
            raise ValueError("El mazo está vacío.")
        return self.stock.pop()

    def discard(self, card):
        player = self.players[self.current_player]
        for i, held in enumerate(player.hand):
            if held.uid == card.uid:
                self.discard_pile.append(player.hand.pop(i))
                return
        raise ValueError("El jugador no tiene esa carta.")

class BotGameController:
    def __init__(self, bot=None):
        self.bot = bot or CariocasBot()

    def begin_turn(self, state):
        player = state.players[state.current_player]
        move = self.bot.choose_draw(player.hand, state.discard_top, player.contract_id)
        card = state.draw(move.data["source"])
        player.hand.append(card)
        return {"draw": move.to_dict(), "drawn_card": card.to_dict()}

    def finish_turn(self, state):
        player = state.players[state.current_player]
        move = self.bot.choose_post_draw(player.hand, player.contract_id,
                                         state.table_melds, player.player_id,
                                         has_laid_contract=player.has_laid_contract)
        return move.to_dict()

def initial_hand_size(contract_id):
    """Contratos especiales (9-11): 13 cartas; contratos 1-8: 12 cartas."""
    return 13 if get_contract(contract_id).special else 12

def deal_player_hand(deck, contract_id):
    count = initial_hand_size(contract_id)
    if len(deck) < count:
        raise ValueError("No hay suficientes cartas para repartir.")
    return [deck.pop() for _ in range(count)]

def new_shuffled_deck(rng=None):
    import random
    deck = standard_deck()
    (rng or random).shuffle(deck)
    return deck
