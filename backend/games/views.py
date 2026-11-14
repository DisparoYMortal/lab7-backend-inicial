from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import GameRoom, GamePlayer
from .engine import new_round, public_state, apply_action

def _broadcast(room):
    channel_layer=get_channel_layer()
    async_to_sync(channel_layer.group_send)(f"room_{room.code}", {"type":"game.update","code":room.code})
def _room_for_user(code,user):
    try: room=GameRoom.objects.get(code=code.upper())
    except GameRoom.DoesNotExist: raise ValueError("No existe una sala con ese código.")
    if not room.players.filter(user=user).exists():
        raise PermissionError("No perteneces a esta sala.")
    return room
def _response_state(room,user):
    if room.state and room.status in ("playing","finished"):
        return public_state(room.state,str(user.id))
    return {"code":room.code,"mode":room.mode,"status":room.status,
            "players":[{"name":p.display_name,"seat":p.seat,"is_bot":p.is_bot}
                       for p in room.players.all()]}
def _error(exc):
    if isinstance(exc,PermissionError): return Response({"detail":str(exc)},status=403)
    return Response({"detail":str(exc)},status=400)

@api_view(["POST"])
def create_room(request):
    mode=request.data.get("mode","online")
    is_public=bool(request.data.get("is_public",False)) if mode=="online" else False
    if mode not in ("online","bot"): return Response({"detail":"Modo inválido."},status=400)
    try:
        with transaction.atomic():
            room=GameRoom.objects.create(owner=request.user,mode=mode,is_public=is_public)
            GamePlayer.objects.create(room=room,user=request.user,seat=0,display_name=request.user.username)
            if mode=="bot":
                players=[{"player_id":str(request.user.id),"name":request.user.username,"is_bot":False},
                         {"player_id":"bot","name":"Cariocas Bot","is_bot":True}]
                GamePlayer.objects.create(room=room,user=None,seat=1,is_bot=True,display_name="Cariocas Bot")
                room.state=new_round(players,1)
                room.status="playing"; room.save()
            return Response({"code":room.code,"mode":room.mode,"is_public":room.is_public,"status":room.status,
                             "state":_response_state(room,request.user)},status=201)
    except Exception as exc: return _error(exc)

@api_view(["POST"])
def join_room(request,code):
    try:
        room=GameRoom.objects.get(code=code.upper())
        if room.mode!="online": raise ValueError("Esta sala no admite jugadores.")
        if room.status!="waiting": raise ValueError("La partida ya comenzó.")
        if room.players.filter(user=request.user).exists():
            return Response({"code":room.code,"state":_response_state(room,request.user)})
        if room.players.count()>=4: raise ValueError("La sala está completa (máximo 4 jugadores).")
        seat=room.players.count()
        GamePlayer.objects.create(room=room,user=request.user,seat=seat,display_name=request.user.username)
        _broadcast(room)
        return Response({"code":room.code,"state":_response_state(room,request.user)},status=200)
    except GameRoom.DoesNotExist: return Response({"detail":"Sala no encontrada."},status=404)
    except Exception as exc: return _error(exc)

@api_view(["GET"])
def room_detail(request,code):
    try:
        room=_room_for_user(code,request.user)
        return Response({"code":room.code,"mode":room.mode,"is_public":room.is_public,"status":room.status,
                         "state":_response_state(room,request.user)})
    except Exception as exc: return _error(exc)

@api_view(["GET"])
def public_rooms(request):
    rooms=(GameRoom.objects.filter(mode="online",is_public=True,status="waiting")
           .annotate(player_count=Count("players")).filter(player_count__lt=4)
           .select_related("owner").order_by("-created_at")[:30])
    return Response([{
        "code":room.code,
        "owner":room.owner.username,
        "players":room.player_count,
        "max_players":4,
    } for room in rooms])


@api_view(["POST"])
def start_room(request,code):
    try:
        room=_room_for_user(code,request.user)
        if room.owner_id!=request.user.id: raise PermissionError("Solo quien creó la sala puede iniciar.")
        if room.status!="waiting": raise ValueError("La sala ya fue iniciada.")
        if room.mode=="online" and room.players.count()<2: raise ValueError("Necesitas al menos 2 jugadores.")
        players=[{"player_id":str(p.user_id),"name":p.display_name,"is_bot":p.is_bot}
                 for p in room.players.all()]
        room.state=new_round(players,1)
        room.status="playing"; room.save()
        _broadcast(room)
        return Response({"state":_response_state(room,request.user)})
    except Exception as exc: return _error(exc)

@api_view(["POST"])
def game_action(request,code):
    try:
        room=_room_for_user(code,request.user)
        if room.status!="playing": raise ValueError("La partida no está activa.")
        state=apply_action(room.state,request.user.id,request.data.get("action",""),
                          request.data.get("data",{}))
        room.state=state
        if state["status"]=="round_finished":
            # Keep the room active so the host can advance through all contracts.
            pass
        room.save()
        _broadcast(room)
        return Response({"state":_response_state(room,request.user)})
    except Exception as exc: return _error(exc)

@api_view(["POST"])
def next_round(request,code):
    try:
        room=_room_for_user(code,request.user)
        if room.owner_id!=request.user.id: raise PermissionError("Solo quien creó la sala puede avanzar.")
        state=room.state
        if state.get("status")!="round_finished": raise ValueError("La ronda actual aún no termina.")
        next_id=state["round_id"]+1
        if next_id>9:
            room.status="finished"; room.finished_at=timezone.now()
            state["status"]="finished"; room.state=state; room.save()
            _broadcast(room)
            return Response({"state":_response_state(room,request.user)})
        players=state["players"]
        scores=state["scores"]
        special=request.data.get("special_choice") if next_id==9 else None
        room.state=new_round(players,next_id,scores,special)
        room.save(); _broadcast(room)
        return Response({"state":_response_state(room,request.user)})
    except Exception as exc: return _error(exc)

@api_view(["POST"])
def finish_game(request,code):
    try:
        room=_room_for_user(code,request.user)
        if room.owner_id!=request.user.id: raise PermissionError("Solo quien creó la sala puede terminar.")
        room.status="finished"; room.finished_at=timezone.now()
        if room.state: room.state["status"]="finished"
        room.save(); _broadcast(room)
        return Response({"state":_response_state(room,request.user)})
    except Exception as exc: return _error(exc)

@api_view(["GET"])
def history(request):
    rooms=GameRoom.objects.filter(players__user=request.user,status="finished").distinct().order_by("-finished_at")[:50]
    data=[]
    for room in rooms:
        data.append({"code":room.code,"mode":room.mode,"finished_at":room.finished_at,
                     "round_id":room.state.get("round_id"),"scores":room.state.get("scores",{}),
                     "players":room.state.get("players",[])})
    return Response(data)

@api_view(["GET"])
def stats(request):
    rooms=GameRoom.objects.filter(players__user=request.user,status="finished").distinct()
    played=rooms.count()
    wins=0; score_total=0
    for room in rooms:
        state=room.state
        final_scores=state.get("scores",{})
        if final_scores:
            best=min(final_scores.values())
            if final_scores.get(str(request.user.id))==best: wins+=1
        score_total+=final_scores.get(str(request.user.id),0)
    return Response({"games_played":played,"games_won":wins,
                     "average_score":round(score_total/played,1) if played else 0})
