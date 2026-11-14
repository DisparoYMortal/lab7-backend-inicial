import unittest
from bot_engine.cards import Card, Suit, standard_deck
from bot_engine.combinations import is_trio, is_sequence
from bot_engine.contracts import CONTRACTS, enumerate_contract_plans
from bot_engine.strategy import CariocasBot
from bot_engine.game import initial_hand_size
from bot_engine.planner import progress_score, choose_draw_source

class RulesTests(unittest.TestCase):
    def test_two_decks_and_four_jokers(self):
        deck = standard_deck()
        self.assertEqual(len(deck), 108)
        self.assertEqual(sum(c.is_joker for c in deck), 4)

    def test_trio_different_suits(self):
        cards = [Card(7, Suit.HEARTS), Card(7, Suit.CLUBS), Card(7, Suit.SPADES)]
        self.assertTrue(is_trio(cards))

    def test_normal_sequence_same_suit(self):
        cards = [Card(5, Suit.HEARTS), Card(6, Suit.HEARTS), Card(7, Suit.HEARTS), Card(8, Suit.HEARTS)]
        self.assertTrue(is_sequence(cards))

    def test_normal_sequence_different_suits_rejected(self):
        cards = [Card(5, Suit.HEARTS), Card(6, Suit.CLUBS), Card(7, Suit.HEARTS), Card(8, Suit.HEARTS)]
        self.assertFalse(is_sequence(cards))

    def test_joker_completes_normal_scale(self):
        cards = [Card(5, Suit.HEARTS), Card(6, Suit.HEARTS), Card(None, None, joker_id=0), Card(8, Suit.HEARTS)]
        self.assertTrue(is_sequence(cards))

    def test_special_contracts_require_13_and_no_jokers(self):
        hand = [Card(rank, Suit.HEARTS, 0) for rank in range(1, 14)]
        self.assertTrue(is_sequence(hand, "real"))
        self.assertFalse(is_sequence(hand[:12], "real"))
        hand_with_joker = hand[:12] + [Card(None, None, joker_id=0)]
        self.assertFalse(is_sequence(hand_with_joker, "real"))

    def test_contract_requires_all_melds(self):
        hand = [Card(4, Suit.HEARTS), Card(4, Suit.CLUBS), Card(4, Suit.SPADES)]
        self.assertEqual(enumerate_contract_plans(hand, CONTRACTS[0]), [])

    def test_contract_1_ready(self):
        hand = [Card(3, Suit.HEARTS), Card(3, Suit.CLUBS), Card(3, Suit.SPADES),
                Card(9, Suit.HEARTS), Card(9, Suit.CLUBS), Card(9, Suit.SPADES)]
        self.assertTrue(enumerate_contract_plans(hand, CONTRACTS[0]))

    def test_special_contract_deals_13_regular_deals_12(self):
        self.assertEqual(initial_hand_size(1), 12)
        self.assertEqual(initial_hand_size(9), 13)
        self.assertEqual(initial_hand_size(10), 13)
        self.assertEqual(initial_hand_size(11), 13)

    def test_bot_only_lays_complete_contract(self):
        bot = CariocasBot()
        hand = [Card(4, Suit.HEARTS), Card(4, Suit.CLUBS), Card(4, Suit.SPADES)]
        move = bot.choose_post_draw(hand, 1)
        self.assertEqual(move.action, "discard")

    def test_bot_can_plan_each_special_scale(self):
        bot = CariocasBot()
        real = [Card(rank, Suit.HEARTS) for rank in range(1, 14)]
        primavera = [Card(rank, Suit.HEARTS if rank % 2 else Suit.SPADES) for rank in range(1, 14)]
        loca = [Card(rank, list(Suit)[rank % 4]) for rank in range(1, 14)]
        self.assertEqual(bot.choose_post_draw(real, 11).action, "lay_contract")
        self.assertEqual(bot.choose_post_draw(primavera, 10).action, "lay_contract")
        self.assertEqual(bot.choose_post_draw(loca, 9).action, "lay_contract")

    def test_special_progress_rewards_unique_ranks_and_pattern(self):
        good = [Card(3, Suit.HEARTS), Card(4, Suit.SPADES), Card(5, Suit.DIAMONDS)]
        broken = [Card(3, Suit.HEARTS), Card(4, Suit.DIAMONDS), Card(5, Suit.HEARTS)]
        self.assertEqual(progress_score(good, 10), 3)
        self.assertLess(progress_score(broken, 10), progress_score(good, 10))

    def test_bot_takes_discard_that_completes_special_progress(self):
        hand = [Card(3, Suit.HEARTS), Card(4, Suit.SPADES)]
        useful = Card(5, Suit.DIAMONDS)
        self.assertEqual(choose_draw_source(hand, useful, 10), "discard")

if __name__ == "__main__":
    unittest.main()
