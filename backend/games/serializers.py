from rest_framework import serializers
from .models import GameRoom


class GameRoomSerializer(serializers.ModelSerializer):
    player_count = serializers.IntegerField(read_only=True)
    players = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = GameRoom
        extra_kwargs = {"mode": {"required": False}}
        fields = ("id", "code", "mode", "is_public", "status", "created_at", "finished_at", "player_count", "players", "can_delete")
        read_only_fields = ("id", "code", "status", "created_at", "finished_at", "player_count", "players", "can_delete")

    def get_players(self, obj):
        return [player.display_name for player in obj.players.all()]

    def get_can_delete(self, obj):
        request = self.context.get("request")
        return bool(request and obj.owner_id == request.user.id)

    def validate_mode(self, value):
        if self.instance and value != self.instance.mode:
            raise serializers.ValidationError("No se puede cambiar la modalidad de una partida existente.")
        return value

    def validate_is_public(self, value):
        room = self.instance
        if room and room.status != "waiting":
            raise serializers.ValidationError("Solo puedes modificar la visibilidad mientras la sala está esperando.")
        if room and room.mode != "online" and value:
            raise serializers.ValidationError("Las partidas contra bot no pueden ser públicas.")
        return value
