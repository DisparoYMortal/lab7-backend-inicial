from .contracts import CONTRACTS, enumerate_contract_plans, contract_size

def analyze_hand(hand, normal_scale_length=4):
    results = []
    for contract in CONTRACTS:
        plans = enumerate_contract_plans(hand, contract, normal_scale_length)
        results.append({
            "contract_id": contract.id,
            "contract": contract.name,
            "required_cards": contract_size(contract, normal_scale_length),
            "can_complete_now": bool(plans),
            "plans_found": len(plans),
            "example_plan": [m.to_dict() for m in plans[0]] if plans else None,
        })
    return {"hand_size": len(hand), "contracts": results}
