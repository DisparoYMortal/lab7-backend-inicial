# Cariocas Bot — primera versión

Motor independiente en Python para analizar manos y validar contratos. No depende de Django ni de React.

## Requisitos
- Python 3.10 o superior
- No requiere dependencias externas

## Ejecutar
```bash
python main.py
```

## Ejecutar pruebas
```bash
python -m unittest discover -s tests -v
```

## Estructura de una carta
```python
{"rank": 7, "suit": "hearts", "deck_id": 0}
{"joker": True, "joker_id": 0}
```

Palos aceptados: `clubs`, `spades`, `diamonds`, `hearts`.
Valores: `1` = As, `2` a `10`, `11` = J, `12` = Q, `13` = K.

## Suposiciones provisionales que debes confirmar
1. Las escalas normales se consideran de 4 cartas. Se puede cambiar con `normal_scale_length`.
2. Los contratos especiales requieren las 13 cartas A-K.
3. Primavera se interpreta como alternancia rojo/negro en cada rango consecutivo, comenzando rojo o negro.
4. Los tríos y escalas normales admiten comodines; los contratos especiales no.
5. Este primer motor reconoce combinaciones y propone una acción básica. Aún no simula el ciclo completo de robar, bajar, pegar cartas y descartar.

## Próximo paso
Conectar el motor al estado real de tu partida y completar las reglas de turnos, robo, descarte y agregados. La estrategia de descarte actual es una heurística inicial, no una IA competitiva.
