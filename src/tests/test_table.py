"""Pruebas de extensiones legales a tríos y escalas que ya están en la mesa."""
import unittest
from bot_engine.cards import Card, Suit
from bot_engine.table import TableMeld, can_add_to_meld, add_card_to_meld

class TableAdditionTests(unittest.TestCase):
    def test_joker_can_extend_normal_scale_and_records_assignment(self):
        meld=TableMeld("p1","normal",[
            Card(5,Suit.CLUBS),Card(6,Suit.CLUBS),Card(7,Suit.CLUBS),Card(8,Suit.CLUBS)
        ])
        joker=Card(None,None,joker_id=0)
        self.assertTrue(can_add_to_meld(joker,meld))
        add_card_to_meld(joker,meld)
        self.assertEqual(meld.assignments["0"]["rank"],4)
        self.assertTrue(can_add_to_meld(Card(9,Suit.CLUBS),meld))
    def test_can_extend_four_to_seven_by_adding_three_on_left(self):
        meld=TableMeld("p1","normal",[
            Card(4,Suit.SPADES),Card(5,Suit.SPADES),Card(6,Suit.SPADES),Card(7,Suit.SPADES)
        ])
        three=Card(3,Suit.SPADES)
        self.assertTrue(can_add_to_meld(three,meld))
        add_card_to_meld(three,meld)
        self.assertEqual({c.rank for c in meld.cards}, {3,4,5,6,7})

    def test_trio_rejects_second_joker(self):
        meld=TableMeld("p1","trio",[
            Card(5,Suit.CLUBS),Card(5,Suit.HEARTS),Card(None,None,joker_id=0)
        ])
        self.assertFalse(can_add_to_meld(Card(None,None,joker_id=1),meld))

    def test_normal_scale_accepts_additions_on_both_ends(self):
        meld=TableMeld("p1","normal",[
            Card(7,Suit.SPADES),Card(8,Suit.SPADES),Card(9,Suit.SPADES),Card(10,Suit.SPADES)
        ])
        self.assertTrue(can_add_to_meld(Card(6,Suit.SPADES),meld))
        self.assertTrue(can_add_to_meld(Card(11,Suit.SPADES),meld))
        self.assertFalse(can_add_to_meld(Card(5,Suit.SPADES),meld))
        add_card_to_meld(Card(6,Suit.SPADES),meld)
        self.assertEqual({c.rank for c in meld.cards}, {6,7,8,9,10})

if __name__=="__main__":
    unittest.main()
