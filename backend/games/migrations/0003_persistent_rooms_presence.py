from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("games", "0002_gameroom_is_public")]
    operations = [
        migrations.AlterField(
            model_name="gameroom", name="owner",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    related_name="owned_rooms", to="auth.user"),
        ),
        migrations.AddField(model_name="gameplayer", name="is_connected",
                            field=models.BooleanField(default=False)),
    ]
