from bot_engine.cards import Card, Suit
from bot_engine.hand_analyzer import analyze_hand
from bot_engine.strategy import CariocasBot

# Ejemplo de contrato 1: los DOS tríos están completos.
hand = [
    Card(4, Suit.HEARTS), Card(4, Suit.CLUBS), Card(4, Suit.SPADES),
    Card(9, Suit.HEARTS), Card(9, Suit.CLUBS), Card(9, Suit.SPADES),
    Card(2, Suit.DIAMONDS), Card(5, Suit.CLUBS), Card(8, Suit.HEARTS),
    Card(10, Suit.SPADES), Card(12, Suit.DIAMONDS), Card(13, Suit.CLUBS),
]

analysis = analyze_hand(hand)
for item in analysis["contracts"]:
    print(f'{item["contract_id"]}. {item["contract"]}: '
          f'{"LISTO" if item["can_complete_now"] else "incompleto"}')

bot = CariocasBot(normal_scale_length=4)
move = bot.choose_post_draw(hand, contract_id=1)
print("\\nDecisión:", move.to_dict())
