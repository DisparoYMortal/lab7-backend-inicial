# Proyecto Final: Juego de Cariocas (React + Django)

**Universidad Autónoma de Chile**  
**Carrera:** Ingeniería Civil Informática  
**Asignatura:** Desarrollo de Aplicaciones Web (Nivel 5)  

---

## 1. Descripción del Proyecto

Este proyecto consiste en una aplicación web full-stack orientada al juego de cartas **Cariocas**. El sistema cuenta con una arquitectura desacoplada donde el cliente interactúa mediante una interfaz web construida en **React** (utilizando Vite), consumiendo servicios de una API RESTful desarrollada en **Django** con **Django REST Framework (DRF)**. Toda la persistencia de datos del juego se gestiona mediante **SQLite**.

La aplicación abarca el ciclo completo de interacción: autenticación de usuarios, gestión de partidas, control de la baraja y conteo de puntajes por ronda.

### Tecnologías Utilizadas

* **Frontend:** React, JavaScript (ES6+), Vite, Fetch API / Axios, HTML5, CSS3.
* **Backend:** Python 3.x, Django, Django REST Framework (DRF), `django-cors-headers`.
* **Base de Datos:** SQLite.
* **Control de Versiones:** Git y GitHub.

---

## 2. Asignación de Roles y Arquitectura de Desarrollo

El sistema está dividido operacionalmente según las responsabilidad de cada capa:

| Capa / Módulo | Responsabilidades Clave | Tecnologías |
| :--- | :--- | :--- |
| **Frontend (Cliente)** | • Interfaz dinámica de usuario e interacción de cartas.<br>• Generación de la mano, renderizado del mazo y vista de juegos.<br>• Consumo de endpoints RESTful usando `async/await`.<br>• Manejo de sesión de usuario y rutas protegidas en React. | React, JavaScript, Vite, CSS |
| **Backend (Servidor)** | • Definición y migración de los modelos de datos (Usuarios, Partidas, Puntuaciones).<br>• Serialización de datos y validaciones de negocio en DRF.<br>• Exposición de endpoints RESTful con verbos HTTP apropiados.<br>• Seguridad mediante hashing de contraseñas y autenticación por tokens/sesión.<br>• Configuración de encabezados CORS para el cliente. | Python, Django, DRF, SQLite |

---

## 3. Demostración Visual (Cartas del Juego)

A continuación se muestra el diseño visual de las cartas del juego de Cariocas integradas en la interfaz:

### Mazo Completo de Cartas (52 Cartas)

**Espadas:**
<p>
  <img src="./public/images/A_sword.png" width="50" />
  <img src="./public/images/2_sword.png" width="50" />
  <img src="./public/images/3_sword.png" width="50" />
  <img src="./public/images/4_sword.png" width="50" />
  <img src="./public/images/5_sword.png" width="50" />
  <img src="./public/images/6_sword.png" width="50" />
  <img src="./public/images/7_sword.png" width="50" />
  <img src="./public/images/8_sword.png" width="50" />
  <img src="./public/images/9_sword.png" width="50" />
  <img src="./public/images/10_sword.png" width="50" />
  <img src="./public/images/J_sword.png" width="50" />
  <img src="./public/images/Q_sword.png" width="50" />
  <img src="./public/images/K_sword.png" width="50" />
</p>

**Copas:**
<p>
  <img src="./public/images/A_cup.png" width="50" />
  <img src="./public/images/2_cup.png" width="50" />
  <img src="./public/images/3_cup.png" width="50" />
  <img src="./public/images/4_cup.png" width="50" />
  <img src="./public/images/5_cup.png" width="50" />
  <img src="./public/images/6_cup.png" width="50" />
  <img src="./public/images/7_cup.png" width="50" />
  <img src="./public/images/8_cup.png" width="50" />
  <img src="./public/images/9_cup.png" width="50" />
  <img src="./public/images/10_cup.png" width="50" />
  <img src="./public/images/J_cup.png" width="50" />
  <img src="./public/images/Q_cup.png" width="50" />
  <img src="./public/images/K_cup.png" width="50" />
</p>

**Oros:**
<p>
  <img src="./public/images/A_coin.png" width="50" />
  <img src="./public/images/2_coin.png" width="50" />
  <img src="./public/images/3_coin.png" width="50" />
  <img src="./public/images/4_coin.png" width="50" />
  <img src="./public/images/5_coin.png" width="50" />
  <img src="./public/images/6_coin.png" width="50" />
  <img src="./public/images/7_coin.png" width="50" />
  <img src="./public/images/8_coin.png" width="50" />
  <img src="./public/images/9_coin.png" width="50" />
  <img src="./public/images/10_coin.png" width="50" />
  <img src="./public/images/J_coin.png" width="50" />
  <img src="./public/images/Q_coin.png" width="50" />
  <img src="./public/images/K_coin.png" width="50" />
</p>

**Tréboles:**
<p>
  <img src="./public/images/A_club.png" width="50" />
  <img src="./public/images/2_club.png" width="50" />
  <img src="./public/images/3_club.png" width="50" />
  <img src="./public/images/4_club.png" width="50" />
  <img src="./public/images/5_club.png" width="50" />
  <img src="./public/images/6_club.png" width="50" />
  <img src="./public/images/7_club.png" width="50" />
  <img src="./public/images/8_club.png" width="50" />
  <img src="./public/images/9_club.png" width="50" />
  <img src="./public/images/10_club.png" width="50" />
  <img src="./public/images/J_club.png" width="50" />
  <img src="./public/images/Q_club.png" width="50" />
  <img src="./public/images/K_club.png" width="50" />
</p>

### Muestra de la Mano del Jugador

<p>
  <img src="./public/images/7_sword.png" width="60" />
  <img src="./public/images/K_cups.png" width="60" />
  <img src="./public/images/4_coins.png" width="60" />
  <img src="./public/images/J_clubs.png" width="60" />
  <img src="./public/images/A_sword.png" width="60" />
  <img src="./public/images/9_cups.png" width="60" />
  <img src="./public/images/2_coins.png" width="60" />
  <img src="./public/images/Q_clubs.png" width="60" />
  <img src="./public/images/5_sword.png" width="60" />
  <img src="./public/images/10_cups.png" width="60" />
  <img src="./public/images/3_coins.png" width="60" />
  <img src="./public/images/8_clubs.png" width="60" />
</p>

---

## 4. Endpoints de la API REST

El backend en Django REST Framework expone la interfaz de comunicación para el cliente siguiendo los estándares RESTful:

| Recurso | Método HTTP | URL | Descripción | Código HTTP Esperado |
| :--- | :---: | :--- | :--- | :---: |
| **Autenticación** | `POST` | `/api/login/` | Autentica al usuario y entrega token/sesión | `200 OK` / `401 Unauthorized` |
| **Partidas** | `GET` | `/api/partidas/` | Obtiene el listado de partidas activas | `200 OK` |
| **Partida Detalle** | `GET` | `/api/partidas/<id>/` | Obtiene el estado detallado de una partida | `200 OK` / `404 Not Found` |
| **Crear Partida** | `POST` | `/api/partidas/` | Crea una nueva partida con validaciones de datos | `201 Created` / `400 Bad Request` |
| **Actualizar Partida**| `PUT` / `PATCH` | `/api/partidas/<id>/` | Modifica el estado o puntuación de una partida | `200 OK` / `400 Bad Request` |
| **Eliminar Partida** | `DELETE` | `/api/partidas/<id>/` | Elimina un registro de partida en la BD | `204 No Content` |

---

## 5. Autenticación y Manejo de Errores REST

### Autenticación
* El sistema implementa login mediante credenciales encriptadas (Django maneja las contraseñas con algoritmos de hash seguros).
* Los endpoints del CRUD de partidas requieren autenticación (`IsAuthenticated`). La realización de peticiones sin credenciales válidas retorna respuestas HTTP `401 Unauthorized` o `403 Forbidden`.
* En el frontend React se incluye control de vistas y funcionalidad para el cierre de sesión.

### Respuestas de Error REST
* **400 Bad Request:** Formatos JSON devueltos con detalles sobre campos inválidos o ausentes en el serializador.
* **401 / 403 Unauthorized:** Rechazo en la ejecución de métodos del CRUD sin credenciales válidas.
* **404 Not Found:** Recurso inexistente solicitado mediante su identificador.

---

## 6. Configuración e Instalación Local

Para ejecutar ambos servidores (React y Django) de manera local en tu equipo, sigue las siguientes instrucciones:

### Requisitos Previos
* Node.js (v18+) y `npm`.
* Python (v3.10+) y `pip`.

---

### Paso 1: Configurar el Backend (Django)

1. Ingresa a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Crea y activa un entorno virtual de Python:
   ```bash
   python -m venv venv
   source venv/bin/activate   # En Linux/macOS
   # venv\Scripts\activate    # En Windows
   ```
3. Instala las dependencias necesarias:
   ```bash
   pip install -r requirements.txt
   ```
4. Aplica las migraciones a la base de datos SQLite:
   ```bash
   python manage.py migrate
   ```
5. Inicia el servidor de desarrollo en Django (puerto `http://127.0.0.1:8000`):
   ```bash
   python manage.py runserver
   ```

---

### Paso 2: Configurar el Frontend (React + Vite)

1. En una nueva terminal, navega a la raíz o carpeta del cliente:
   ```bash
   cd cariocas-web
   ```
2. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo del cliente:
   ```bash
   npm run dev
   ```
4. Abre tu navegador e ingresa a la ruta indicada por Vite (habitualmente `http://localhost:5173`).

---

### Paso 3: Configuración de CORS

El backend utiliza `django-cors-headers` configurado en `settings.py` para permitir la comunicación únicamente con la URL de desarrollo de React:

```python
# settings.py (Django)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```
