import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import games.models

class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="GameRoom",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(default=games.models.room_code, max_length=6, unique=True)),
                ("mode", models.CharField(choices=[("online","Multijugador"),("bot","Contra bot")], max_length=10)),
                ("status", models.CharField(choices=[("waiting","Esperando"),("playing","Jugando"),("finished","Finalizada")], default="waiting", max_length=10)),
                ("state", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="owned_rooms", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="GamePlayer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("seat", models.PositiveSmallIntegerField()),
                ("is_bot", models.BooleanField(default=False)),
                ("display_name", models.CharField(max_length=80)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="players", to="games.gameroom")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["seat"],"unique_together":{("room","user"),("room","seat")}},
        ),
    ]
