"""Vistas de autenticación, registro y acceso de invitados."""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import RegisterSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
# Crea una cuenta nueva y devuelve su token de autenticación.
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username}, status=201)

@api_view(["POST"])
@permission_classes([AllowAny])
# Verifica las credenciales y entrega el token de sesión.
def login(request):
    user = authenticate(username=request.data.get("username"), password=request.data.get("password"))
    if not user:
        return Response({"detail": "Usuario o contraseña incorrectos."}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})

@api_view(["POST"])
@permission_classes([AllowAny])
# Crea o reutiliza una cuenta temporal para jugar sin registro tradicional.
def guest(request):
    # Invitados temporales con nombre aleatorio; no se solicita correo ni contraseña.
    import secrets
    username = "Invitado_" + secrets.token_hex(3)
    user = User.objects.create_user(username=username, password=secrets.token_urlsafe(24))
    token = Token.objects.create(user=user)
    return Response({"token": token.key, "username": username, "guest": True}, status=201)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
# Devuelve los datos básicos de la cuenta asociada al token actual.
def me(request):
    return Response({"id": request.user.id, "username": request.user.username})
