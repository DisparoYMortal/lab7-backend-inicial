# Cariocas Web — React + Django

Proyecto de Cariocas con frontend React/Vite y backend Django REST + WebSockets.

## Requisitos
- Python 3.10+
- Node.js 20.19+ (Vite 8)
- npm

## 1. Backend (Arch Linux / Linux)

Desde la raíz del proyecto:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # opcional: panel admin
python manage.py runserver 0.0.0.0:8000
```

El backend usa SQLite para desarrollo. Las variables de entorno están documentadas en `backend/.env.example`. Para despliegue configura `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, una base de datos persistente y `REDIS_URL` (Redis es necesario para distribuir eventos WebSocket entre varios procesos).

## 2. Frontend

En otra terminal, desde la raíz:

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173  
API: http://127.0.0.1:8000/api/

El menú principal permite elegir **Multijugador local**, **Contra el bot** o **Multijugador online**. El modo local original se conserva. Si alojas la API en otro dominio, inicia Vite con `VITE_API_URL=https://tu-api.example`.

## Autenticación

Todas las rutas de juego requieren token. Incluye el token así:

```http
Authorization: Token TU_TOKEN
Content-Type: application/json
```

Crear cuenta:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"jugador1","password":"una-clave-segura"}'
```

Iniciar sesión:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"jugador1","password":"una-clave-segura"}'
```

Jugar como invitado:
```bash
curl -X POST http://127.0.0.1:8000/api/auth/guest/
```
La respuesta contiene `token` y `username`. El invitado queda almacenado como cuenta anónima local; no debe considerarse una cuenta recuperable. Si aparece un error que menciona `is_connected`, ejecuta `python manage.py migrate` desde `backend/` y reinicia Django. Esta versión incluye la migración `0003_persistent_rooms_presence`, que agrega ese campo requerido por la presencia y sincronización online.

## API de partidas

- `POST /api/rooms/` `{ "mode": "bot" }` crea una partida contra bot.
- `POST /api/rooms/` `{ "mode": "online", "is_public": false }` crea una sala privada; usa `true` para una sala pública.
- `GET /api/rooms/public/` lista salas públicas esperando jugadores.
- `POST /api/rooms/CODIGO/join/` entra a una sala (2–4 jugadores).
- `POST /api/rooms/CODIGO/start/` el anfitrión inicia.
- `GET /api/rooms/CODIGO/` obtiene estado privado de la partida.
- `POST /api/rooms/CODIGO/action/` ejecuta acciones:
  - `{ "action":"draw", "data":{"source":"stock"} }`
  - `{ "action":"draw", "data":{"source":"discard"} }`
  - `{ "action":"lay_contract", "data":{"groups":[["uid1","uid2","uid3"],["uid4","uid5","uid6"]] } }`
  - `{ "action":"add_cards", "data":{"meld_index":0,"card_uids":["uid"]} }`
  - `{ "action":"discard", "data":{"card_uid":"uid"} }`
- `POST /api/rooms/CODIGO/next-round/` avanza el anfitrión tras finalizar la ronda. En la ronda 9 envía `{"special_choice":"loca"}` (o `primavera` / `real`).
- `POST /api/rooms/CODIGO/finish/` finaliza la partida.
- `GET /api/history/` historial del usuario.
- `GET /api/stats/` estadísticas.

El estado devuelto oculta las manos de los demás jugadores y solo expone la mano del usuario autenticado.

## Tiempo real

Conecta por WebSocket usando el token:

```js
const socket = new WebSocket(
  `ws://127.0.0.1:8000/ws/rooms/${code}/?token=${token}`
);
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === "state") setGameState(message.state);
};
```

Cuando una acción REST cambia la partida, el servidor emite un evento y todos los miembros reciben su propia vista privada actualizada.

## Reglas y motor del bot

El motor de `src/bot_engine/` se conserva y se usa desde Django:
- 2 mazos estándar y 4 comodines.
- Tríos por valor y escalas normales de 4 cartas.
- Contratos 1–8 y una ronda 9 que permite elegir Escala loca, Primavera o Escala real.
- Para bajar un contrato se deben completar todos los grupos simultáneamente.
- No se permiten comodines en contratos especiales.
- La IA es heurística inicial, no una IA competitiva.

## Pruebas

Desde la raíz del proyecto:

```bash
PYTHONPATH=src python -m unittest discover -s src/tests -v
PYTHONPATH=src python -m unittest discover -s backend/tests -v
```

## Alcance y limitaciones

La mesa online reutiliza la misma imagen de mesa y recursos visuales del tablero local; el modo local original se conserva. El cliente incluye un menú para elegir modo, acceso con inicio de sesión/registro/invitado, creación de salas públicas o privadas, listado de salas públicas, unirse por código, iniciar, robar, preparar y bajar contratos completos, pegar cartas, descartar, avanzar rondas y consultar historial/estadísticas. El motor del bot juega turnos automáticamente con una estrategia heurística sencilla.

Para jugar desde otros computadores, el backend debe estar accesible por la red/Internet: configura `VITE_API_URL` con la dirección pública o LAN del backend (sin `/api`) y ajusta `CORS_ALLOWED_ORIGINS` y `DJANGO_ALLOWED_HOSTS`. La sincronización WebSocket de desarrollo usa la capa en memoria; para varios procesos o despliegue público configura Redis. Antes de publicar el juego, añade HTTPS/WSS, una clave secreta segura, hosts/orígenes permitidos, una base de datos de producción y límites de solicitudes. Los invitados son cuentas anónimas temporales y no se pueden recuperar si se pierde su token.

La ejecución del frontend se verificó con `npm run build`; los tests Python del motor y del ciclo de turnos pasaron. En este entorno no fue posible instalar Django desde internet, así que debes ejecutar `pip install -r requirements.txt`, migraciones y una prueba manual de API en tu equipo para validar el entorno Django instalado.


## Actualización: bots, acceso inicial y tema visual

- La pantalla de acceso aparece antes del menú principal: iniciar sesión, crear cuenta o continuar como invitado.
- En el modo contra bots se puede elegir entre 1 y 4 bots (2 a 5 participantes en total).
- Los bots juegan en orden y el turno vuelve al usuario después del último bot.
- Un bot que ya bajó su contrato intenta añadir cartas legalmente a las combinaciones de la mesa, incluidas las de otros participantes.
- La interfaz comparte una paleta de madera oscura, rojo sangre, oro envejecido y plata.

### Actualizar una instalación existente

Descomprime esta versión sobre la carpeta del proyecto. El ZIP no incluye `backend/db.sqlite3`, `.venv` ni `node_modules`, para evitar sobrescribir tu base de datos o tus entornos locales.

Si cambió alguna dependencia de frontend, desde la raíz ejecuta:

```bash
npm install
npm run dev
```

Mantén Django activo en otra terminal como ya lo tienes configurado.

## Icono de la pestaña

El HTML ya apunta a `/images/reina-muerta.png` como favicon. El ZIP de origen no incluía la imagen Reina Muerta (ni dentro de `src/acets` ni dentro de `src/assets`), por lo que debes colocar el archivo PNG exacto en `public/images/reina-muerta.png`. Cuando se entregue esa imagen, puede integrarse directamente en esa ruta sin modificar el resto del proyecto.

## Documentación del código

Los componentes React, las reglas principales, los endpoints del servidor y los módulos del motor de bots incluyen comentarios explicativos. En `src/bot_engine/` se documentan las fases de análisis de mano, planificación de contratos, elección de robo, bajada de grupos, extensiones y descarte. Los comentarios usan la sintaxis propia de cada lenguaje (`//` en JavaScript, `#` en Python y `/* ... */` en CSS).


## Continuidad de salas y mesa online
- La mesa online usa el mismo archivo `public/images/Mesa.png` y las mismas imágenes de cartas que el modo local.
- Si el navegador pierde conexión, el cliente intenta reconectar automáticamente.
- Cerrar el navegador o perder Internet no elimina la sala ni el estado de la partida: quedan guardados en SQLite.
- Si el anfitrión se desconecta, la administración se transfiere al siguiente participante conectado. Si todos se desconectan, la sala permanece guardada y el primer participante que regrese puede recuperar la administración.
- Si se elimina la cuenta del creador, la sala no se elimina en cascada.
- Ejecuta `python manage.py migrate` en `backend/` para aplicar la migración `0003_persistent_rooms_presence`.

## Correcciones del multijugador (noviembre 2026)
- Se eliminó una declaración duplicada de `is_public` en el modelo.
- Si el backend detecta que falta `games_gameplayer.is_connected`, ahora responde con instrucciones concretas para aplicar migraciones en lugar de dejar un error críptico.
- La creación de salas valida la respuesta antes de entrar en la sala y muestra el código para compartir.
- La sala de espera explica cómo invitar jugadores y solo ofrece iniciar al anfitrión cuando hay al menos dos participantes.
- El tablero online conserva la distribución visual de la mesa local (fondo `Mesa.png`, HUD, zona de oponentes, centro y mano) y sus recursos compartidos.

**Importante tras actualizar:** desde `backend/`, ejecuta `python manage.py migrate` y reinicia Django. Para que otros computadores se conecten, configura `VITE_API_URL` apuntando a la IP/dominio donde escucha Django; `127.0.0.1` solo funciona en el mismo computador.
