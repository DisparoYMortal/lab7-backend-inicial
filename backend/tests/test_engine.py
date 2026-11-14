import os, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"src"))
sys.path.insert(0,str(ROOT/"backend"))
from games.engine import new_round, apply_action, card_uid

class OnlineEngineTests(unittest.TestCase):
    def setUp(self):
        self.players=[
            {"player_id":"7","name":"Jugador","is_bot":False},
            {"player_id":"bot","name":"Cariocas Bot","is_bot":True},
        ]
    def test_regular_round_deals_twelve_each_and_four_jokers_exist(self):
        state=new_round(self.players,1)
        self.assertEqual(len(state["hands"]["7"]),12)
        self.assertEqual(len(state["hands"]["bot"]),12)
        deck=state["stock"]+state["discard"]+state["hands"]["7"]+state["hands"]["bot"]
        self.assertEqual(sum(1 for c in deck if c.get("joker")),4)
    def test_special_round_requires_choice_and_deals_thirteen(self):
        with self.assertRaises(ValueError):
            new_round(self.players,9)
        state=new_round(self.players,9,special_choice="real")
        self.assertEqual(state["contract_id"],11)
        self.assertEqual(len(state["hands"]["7"]),13)
    def test_turn_cycle_executes_bot_and_returns_to_human(self):
        state=new_round(self.players,1)
        state=apply_action(state,7,"draw",{"source":"stock"})
        self.assertEqual(state["phase"],"discard")
        state=apply_action(state,7,"discard",{"card_uid":card_uid(state["hands"]["7"][-1])})
        self.assertEqual(state["players"][state["current_index"]]["player_id"],"7")
        self.assertEqual(state["phase"],"draw")
    def test_server_does_not_allow_action_out_of_turn(self):
        state=new_round(self.players,1)
        with self.assertRaises(ValueError):
            apply_action(state,"bot","draw",{"source":"stock"})

if __name__=="__main__":
    unittest.main()
