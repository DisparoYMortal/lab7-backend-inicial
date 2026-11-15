import React, { useEffect, useState, useCallback } from 'react';
import './App.css';

// Primera baraja física: cada identificador combina rango y palo.
const baraja1 = [
    "A_sword", "2_sword", "3_sword", "4_sword", "5_sword", "6_sword", "7_sword", "8_sword", "9_sword", "10_sword", "J_sword", "Q_sword", "K_sword",
    "A_cup", "2_cup", "3_cup", "4_cup", "5_cup", "6_cup", "7_cup", "8_cup", "9_cup", "10_cup", "J_cup", "Q_cup", "K_cup",
    "A_coin", "2_coin", "3_coin", "4_coin", "5_coin", "6_coin", "7_coin", "8_coin", "9_coin", "10_coin", "J_coin", "Q_coin", "K_coin",
    "A_club", "2_club", "3_club", "4_club", "5_club", "6_club", "7_club", "8_club", "9_club", "10_club", "J_club", "Q_club", "K_club"
];

// Segunda baraja: el sufijo 1 diferencia las cartas duplicadas.
const baraja2 = [
    "A_sword1", "2_sword1", "3_sword1", "4_sword1", "5_sword1", "6_sword1", "7_sword1", "8_sword1", "9_sword1", "10_sword1", "J_sword1", "Q_sword1", "K_sword1",
    "A_cup1", "2_cup1", "3_cup1", "4_cup1", "5_cup1", "6_cup1", "7_cup1", "8_cup1", "9_cup1", "10_cup1", "J_cup1", "Q_cup1", "K_cup1",
    "A_coin1", "2_coin1", "3_coin1", "4_coin1", "5_coin1", "6_coin1", "7_coin1", "8_coin1", "9_coin1", "10_coin1", "J_coin1", "Q_coin1", "K_coin1",
    "A_club1", "2_club1", "3_club1", "4_club1", "5_club1", "6_club1", "7_club1", "8_club1", "9_club1", "10_club1", "J_club1", "Q_club1", "K_club1"
];

// Contratos estándar y sus cantidades obligatorias de tríos y escalas.
const CONTRATOS = [
    { id: 1, nombre: "2 Tríos", triosReq: 2, escalasReq: 0 },
    { id: 2, nombre: "1 Trío y 1 Escala", triosReq: 1, escalasReq: 1 },
    { id: 3, nombre: "2 Escalas", triosReq: 0, escalasReq: 2 },
    { id: 4, nombre: "3 Tríos", triosReq: 3, escalasReq: 0 },
    { id: 5, nombre: "2 Tríos y 1 Escala", triosReq: 2, escalasReq: 1 },
    { id: 6, nombre: "1 Trío y 2 Escalas", triosReq: 1, escalasReq: 2 },
    { id: 7, nombre: "3 Escalas", triosReq: 0, escalasReq: 3 },
    { id: 8, nombre: "4 Tríos", triosReq: 4, escalasReq: 0 },
    { id: 9, nombre: "Rondas Especiales", esEspecial: true, triosReq: 0, escalasReq: 0 }
];

// Modalidades especiales de 13 cartas; sus reglas se validan por separado.
const ESPECIALES = [
    { id: "loca", nombre: "Escala Loca (Sucia)" },
    { id: "primavera", nombre: "Primavera" },
    { id: "real", nombre: "Escala Real (Limpia)" }
];

const ORDEN_ESCALA = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3"];

// Valor de penalización de cada carta al cerrar una ronda.
const calcularValorCarta = (carta) => {
    if (carta.includes("JOKER")) return 30;
    if (carta.startsWith("A_")) return 20;
    if (carta.startsWith("J_") || carta.startsWith("Q_") || carta.startsWith("K_")) return 10;
    const partes = carta.split("_");
    const valorNum = parseInt(partes[0], 10);
    return isNaN(valorNum) ? 10 : valorNum;
};

// Normaliza una carta para que las reglas no dependan del nombre del archivo de imagen.
const obtenerDetallesCarta = (carta) => {
    if (carta.startsWith("JOKER")) {
        return { esJoker: true, valor: null, palo: null };
    }
    const match = carta.match(/^(A|[2-9]|10|J|Q|K)_(sword|cup|coin|club)(1?)$/);
    if (!match) return { esJoker: false, valor: null, palo: null };
    return { esJoker: false, valor: match[1], palo: match[2] };
};

// Resuelve el recurso visual correspondiente a una carta.
const obtenerRutaImagen = (carta) => {
    if (carta.startsWith("JOKER")) return carta === "JOKER" || carta === "JOKER_3" ? "/images/JOKER.png" : "/images/JOKER1.png";

    const coincidencia = carta.match(/^(A|[2-9]|10|J|Q|K)_(sword|cup|coin|club)(1?)$/);
    if (!coincidencia) return "/images/card-error.png";

    const [, valor, palo, duplicado] = coincidencia;
    const palos = { sword: "sword", cup: "cups", coin: "coins", club: "clubs" };
    return `/images/${valor}_${palos[palo]}${duplicado}.png`;
};

// Comprueba que todas las cartas de un trío compartan rango y que haya como máximo un Joker.
const esTríoVálido = (cartas) => {
    if (cartas.length < 3) return false;
    let jokersCount = 0;
    let valorBase = null;

    for (const c of cartas) {
        const det = obtenerDetallesCarta(c);
        if (det.esJoker) {
            jokersCount++;
        } else {
            if (valorBase === null) {
                valorBase = det.valor;
            } else if (det.valor !== valorBase) {
                return false;
            }
        }
    }
    if (jokersCount > 1) return false;
    return true;
};

// Comprueba una escala inicial de cuatro cartas contra las ventanas permitidas.
const esEscalaVálidaInicial = (cartas) => {
    if (cartas.length !== 4) return false;

    for (let i = 0; i <= ORDEN_ESCALA.length - 4; i++) {
        const sub = ORDEN_ESCALA.slice(i, i + 4);
        if (comprobarSecuenciaConCartas(cartas, sub)) return true;
    }
    return false;
};

// Asigna las cuatro posiciones de una escala inicial y permite un Joker como hueco.
const comprobarSecuenciaConCartas = (cartas, valoresEsperados) => {
    let paloComun = null;
    let jokers = 0;

    for (let i = 0; i < 4; i++) {
        const c = cartas[i];
        const det = obtenerDetallesCarta(c);

        if (det.esJoker) {
            jokers++;
            if (jokers > 1) return false;
        } else {
            if (det.valor !== valoresEsperados[i]) return false;
            if (paloComun === null) {
                paloComun = det.palo;
            } else if (paloComun !== det.palo) {
                return false;
            }
        }
    }
    return jokers <= 1 && paloComun !== null;
};

// Valida si las cartas seleccionadas pueden extender un trío ya bajado.
const cartasSePuedenAcoplarATrío = (tríoCartas, cartasNuevas) => {
    if (cartasNuevas.length === 0) return false;
    
    const jokersActuales = tríoCartas.filter(c => obtenerDetallesCarta(c).esJoker).length;
    const jokersNuevos = cartasNuevas.filter(c => obtenerDetallesCarta(c).esJoker).length;
    
    if (jokersActuales + jokersNuevos > 1) return false;

    let valorBase = null;
    for (const c of tríoCartas) {
        const d = obtenerDetallesCarta(c);
        if (!d.esJoker) {
            valorBase = d.valor;
            break;
        }
    }

    for (const c of cartasNuevas) {
        const d = obtenerDetallesCarta(c);
        if (!d.esJoker) {
            if (valorBase === null) {
                valorBase = d.valor;
            } else if (d.valor !== valorBase) {
                return false;
            }
        }
    }
    return true;
};

// Convierte los rangos impresos en valores numéricos para comparar secuencias.
const rangoNumericoCarta = (valor) => ({ A: 1, J: 11, Q: 12, K: 13 }[valor] ?? Number(valor));

// Encuentra la posición lineal que ocupa cada carta en la escala.
// Esto distingue A-2-3 de Q-K-A y evita ordenar siempre el As al principio.
// Busca una asignación ordenada de rangos para cada carta, incluyendo las dos posiciones posibles del As.
const obtenerPosicionesEscala = (cartas) => {
    const detalles = cartas.map(obtenerDetallesCarta);
    const naturales = detalles.map((d, i) => ({ ...d, index: i })).filter(d => !d.esJoker);
    const jokers = detalles.filter(d => d.esJoker).length;
    if (!naturales.length || jokers > 1 || new Set(naturales.map(d => d.palo)).size !== 1) return null;
    const opciones = (valor) => {
        const rango = rangoNumericoCarta(valor);
        return rango === 1 ? [1, 14] : rango === 2 ? [2, 15] : rango === 3 ? [3, 16] : [rango];
    };
    for (let inicio = 1; inicio <= 13; inicio++) {
        const objetivo = new Set(Array.from({ length: cartas.length }, (_, i) => inicio + i));
        const posiciones = new Map();
        const buscar = (i, usadas) => {
            if (i === naturales.length) return objetivo.size - usadas.size === jokers;
            for (const pos of opciones(naturales[i].valor)) {
                if (!objetivo.has(pos) || usadas.has(pos)) continue;
                posiciones.set(naturales[i].index, pos);
                const next = new Set(usadas); next.add(pos);
                if (buscar(i + 1, next)) return true;
                posiciones.delete(naturales[i].index);
            }
            return false;
        };
        if (buscar(0, new Set())) {
            const libres = [...objetivo].filter(pos => ![...posiciones.values()].includes(pos));
            detalles.forEach((d, i) => { if (d.esJoker) posiciones.set(i, libres.shift() ?? 99); });
            return posiciones;
        }
    }
    return null;
};

// Ordena las cartas según las posiciones que ocupan en la secuencia encontrada.
const ordenarCartasDeEscala = (cartas) => {
    const posiciones = obtenerPosicionesEscala(cartas);
    return [...cartas].sort((a, b) => {
        const ia = cartas.indexOf(a), ib = cartas.indexOf(b);
        if (posiciones) return posiciones.get(ia) - posiciones.get(ib);
        const da = obtenerDetallesCarta(a), db = obtenerDetallesCarta(b);
        return (da.esJoker ? 99 : rangoNumericoCarta(da.valor)) -
            (db.esJoker ? 99 : rangoNumericoCarta(db.valor));
    });
};

// Valida escalas completas, permitiendo el As bajo o alto y un único Joker.
const esSecuenciaValidaCompleta = (cartas) => {
    const n = cartas.length;
    if (n < 4 || n > 13) return false;
    const naturales = cartas.map(obtenerDetallesCarta).filter(d => !d.esJoker);
    const jokers = cartas.length - naturales.length;
    if (jokers > 1 || !naturales.length || new Set(naturales.map(d => d.palo)).size !== 1) return false;

    // El As puede ocupar su posición baja (A-2) o alta (Q-K-A-2).
    const posiciones = {
        1: [1, 14], 2: [2, 15], 3: [3, 16],
    };
    const opciones = (valor) => posiciones[rangoNumericoCarta(valor)] ||
        [rangoNumericoCarta(valor)];

    for (let start = 1; start <= 13; start++) {
        const objetivo = Array.from({ length: n }, (_, i) => start + i);
        const objetivoSet = new Set(objetivo);
        const buscar = (index, usadas) => {
            if (index === naturales.length) {
                return objetivo.length - usadas.size === jokers;
            }
            for (const pos of opciones(naturales[index].valor)) {
                if (objetivoSet.has(pos) && !usadas.has(pos)) {
                    const next = new Set(usadas);
                    next.add(pos);
                    if (buscar(index + 1, next)) return true;
                }
            }
            return false;
        };
        if (buscar(0, new Set())) return true;
    }
    return false;
};

// Valida extensiones por cualquiera de los extremos de una escala ya bajada.
const cartasSePuedenAcoplarAEscala = (escalaCartas, cartasNuevas) => {
    if (!Array.isArray(cartasNuevas) || cartasNuevas.length === 0) return false;
    const todas = [...escalaCartas, ...cartasNuevas];
    if (todas.length > 13 || todas.filter(c => obtenerDetallesCarta(c).esJoker).length > 1) return false;
    const detallesExistentes = escalaCartas.map(obtenerDetallesCarta);
    const detallesNuevos = cartasNuevas.map(obtenerDetallesCarta);
    const naturales = todas.map(obtenerDetallesCarta).filter(d => !d.esJoker);
    if (!naturales.length || new Set(naturales.map(d => d.palo)).size !== 1) return false;

    // Buscar una representación lineal válida de la escala. Así se admiten
    // extensiones por la izquierda (3-4-5-6-7) y por la derecha, incluso
    // cuando el As ocupa su posición alta en Q-K-A-2-3.
    const opcionesPosicion = (valor) => {
        const rango = rangoNumericoCarta(valor);
        return rango === 1 ? [1, 14] : rango === 2 ? [2, 15] : rango === 3 ? [3, 16] : [rango];
    };
    const existentesNaturales = detallesExistentes.filter(d => !d.esJoker);
    const nuevosNaturales = detallesNuevos.filter(d => !d.esJoker);
    for (let inicio = 1; inicio <= 13; inicio++) {
        const objetivo = Array.from({ length: todas.length }, (_, i) => inicio + i);
        const objetivoSet = new Set(objetivo);
        const buscar = (items, index, usadas, asignaciones) => {
            if (index === items.length) return { usadas, asignaciones };
            for (const pos of opcionesPosicion(items[index].valor)) {
                if (objetivoSet.has(pos) && !usadas.has(pos)) {
                    const next = new Set(usadas); next.add(pos);
                    const result = buscar(items, index + 1, next, [...asignaciones, pos]);
                    if (result) return result;
                }
            }
            return null;
        };
        const existentes = buscar(existentesNaturales, 0, new Set(), []);
        if (!existentes) continue;
        const nuevos = buscar(nuevosNaturales, 0, new Set(existentes.usadas), []);
        if (!nuevos) continue;
        const posicionesExistentes = existentes.asignaciones;
        const posicionesNuevas = nuevos.asignaciones;
        if (posicionesExistentes.length && posicionesNuevas.length) {
            const min = Math.min(...posicionesExistentes), max = Math.max(...posicionesExistentes);
            // Ninguna carta agregada puede insertarse dentro de la escala ya bajada.
            if (posicionesNuevas.some(pos => pos >= min && pos <= max)) continue;
        }
        // Los comodines existentes/nuevos ocupan exactamente los huecos restantes.
        if (objetivo.length - nuevos.usadas.size !== todas.length - naturales.length) continue;
        return true;
    }
    return false;
};

// Agrupa los palos en rojo y negro para validar la modalidad Primavera.
const colorDePalo = (palo) => (palo === 'cup' || palo === 'coin' ? 'rojo' : 'negro');

// Genera candidatas reales para los bots: escalas normales y las tres escalas especiales.
// Genera combinaciones posibles de escala para que el bot pueda evaluar contratos completos.
// Construye ventanas de rangos y busca subconjuntos de la mano que encajen en ellas.
const generarCandidatosEscalaBot = (mano, tipoEspecial = null) => {
    const candidatos = [];
    const valores = ['A','2','3','4','5','6','7','8','9','10','J','Q','K','A','2','3'];
    const agregar = (tipo, indices) => {
        const clave = [...indices].sort((a,b)=>a-b).join(',');
        if (!candidatos.some(c => c.tipo === tipo && c.indices.join(',') === clave))
            candidatos.push({ tipo: 'Escala', subtipo: tipo, indices: [...indices] });
    };

    if (tipoEspecial) {
        const buscarEspecial = (rango, elegidos) => {
            if (rango > 13) { agregar(tipoEspecial, elegidos); return; }
            const valor = valores[rango - 1];
            mano.forEach((carta, i) => {
                const d = obtenerDetallesCarta(carta);
                if (d.esJoker || d.valor !== valor || elegidos.includes(i)) return;
                if (tipoEspecial === 'real' && elegidos.length && d.palo !== obtenerDetallesCarta(mano[elegidos[0]]).palo) return;
                if (tipoEspecial === 'primavera' && elegidos.length && colorDePalo(d.palo) === colorDePalo(obtenerDetallesCarta(mano[elegidos[elegidos.length - 1]]).palo)) return;
                buscarEspecial(rango + 1, [...elegidos, i]);
            });
        };
        buscarEspecial(1, []);
        return candidatos;
    }

    ['sword','cup','coin','club'].forEach(palo => {
        for (let start = 0; start <= valores.length - 4; start++) {
            const indicesPorRango = valores.slice(start, start + 4).map(valor => mano
                .map((carta, i) => ({ carta, i, d: obtenerDetallesCarta(carta) }))
                .filter(x => !x.d.esJoker && x.d.valor === valor && x.d.palo === palo)
                .map(x => x.i));
            const elegir = (pos, usados, jokers) => {
                if (pos === 4) { agregar('normal', usados); return; }
                indicesPorRango[pos].forEach(i => { if (!usados.includes(i)) elegir(pos+1, [...usados,i], jokers); });
                if (jokers < 1) mano.forEach((carta,i) => {
                    if (obtenerDetallesCarta(carta).esJoker && !usados.includes(i)) elegir(pos+1,[...usados,i],jokers+1);
                });
            };
            elegir(0, [], 0);
        }
    });
    return candidatos;
};



// Evalúa la fuerza de la mano restante sin consultar cartas futuras ni información oculta.
// Estima el valor estratégico de una mano según el contrato activo.
// Heurística local: premia rangos repetidos, vecinos del mismo palo y patrones especiales.
const evaluarPotencialManoBot = (mano, contrato, tipoEspecial) => {
    if (!mano.length) return 0;
    const detalles = mano.map(obtenerDetallesCarta);
    const especiales = Boolean(contrato.esEspecial);
    let score = 0;
    const conteoRango = {};
    const conteoPalo = {};
    detalles.forEach(d => {
        if (d.esJoker) {
            score += especiales ? -30 : (detalles.filter(x => x.esJoker).length === 1 ? 13 : -18);
            return;
        }
        conteoRango[d.valor] = (conteoRango[d.valor] || 0) + 1;
        conteoPalo[d.palo] = (conteoPalo[d.palo] || 0) + 1;
        if (especiales) score += 2;
    });
    detalles.forEach((d, i) => {
        if (d.esJoker) return;
        const mismoRango = (conteoRango[d.valor] || 0) - 1;
        if (especiales) {
            if (mismoRango > 0) score -= 5 * mismoRango;
            if (tipoEspecial === 'real') score += (conteoPalo[d.palo] || 0) * 2.5;
            if (tipoEspecial === 'primavera') {
                const rango = rangoNumericoCarta(d.valor);
                score += detalles.filter((o, j) => j !== i && !o.esJoker &&
                    Math.abs(rangoNumericoCarta(o.valor) - rango) === 1 &&
                    colorDePalo(o.palo) !== colorDePalo(d.palo)).length * 3;
            }
        } else {
            score += mismoRango * 5;
            score += detalles.filter((o, j) => j !== i && !o.esJoker && o.palo === d.palo &&
                Math.abs(rangoNumericoCarta(o.valor) - rangoNumericoCarta(d.valor)) <= 2).length * 3;
        }
        score -= calcularValorCarta(mano[i]) * 0.35;
    });
    return score;
};

// Calcula el orden de asientos a mostrar, poniendo primero al jugador cuyo turno está activo.
const obtenerOrdenVisualJugadores = (turnoActual, totalJugadores) => {
    const orden = [];
    for (let i = 0; i < totalJugadores; i++) {
        orden.push((turnoActual + i) % totalJugadores);
    }
    return orden;
};

// Presenta los resultados finales ordenados por puntuación ascendente.
// En Cariocas, el primer lugar corresponde al jugador con menos puntos acumulados.
function PodioResultados({ resultados, onExit }) {
    const ordenados = [...resultados].sort((a, b) => a.puntos - b.puntos || a.id - b.id);
    const ganador = ordenados[0];

    return (
        <section className="podio-resultados">
            <p className="podio-eyebrow">PARTIDA FINALIZADA</p>
            <h1>Resultados finales</h1>
            {ganador && <p className="podio-ganador">Ganador: <strong>{ganador.nombre}</strong></p>}
            <div className="podio-columnas">
                {ordenados.slice(0, 3).map((jugador, index) => (
                    <article className={`podio-lugar podio-lugar-${index + 1}`} key={jugador.id}>
                        <span className="podio-posicion">{index + 1}° lugar</span>
                        <strong>{jugador.nombre}</strong>
                        <span>{jugador.puntos} puntos</span>
                    </article>
                ))}
            </div>
            <div className="podio-tabla">
                <h2>Tabla completa</h2>
                {ordenados.map((jugador, index) => (
                    <div className="podio-fila" key={jugador.id}>
                        <span>{index + 1}. {jugador.nombre}</span>
                        <strong>{jugador.puntos} pts</strong>
                    </div>
                ))}
            </div>
            <button className="btn-accion btn-dorado" onClick={onExit}>
                Volver al menú principal
            </button>
        </section>
    );
}

// Mesa completa para partidas locales y partidas contra uno o varios bots.
function LocalGame({ vsBot = false, onExit = () => {} }) {
    // Configuración de la partida y contrato que se está jugando.
    const [numJugadores, setNumJugadores] = useState(2);
    const [rondaIndex, setRondaIndex] = useState(0);
    const [especialElegido, setEspecialElegido] = useState(null);

    // Estado principal de cartas: mazo, descarte, manos y turno activo.
    const [mazo, setMazo] = useState([]);
    const [descarte, setDescarte] = useState([]);
    const [manosJugadores, setManosJugadores] = useState([]);
    const [turno, setTurno] = useState(0);
    const [haRobado, setHaRobado] = useState(false);
    const [juegoIniciado, setJuegoIniciado] = useState(false);

    // Estado de contratos: grupos preparados, combinaciones públicas y cartas seleccionadas.
    const [jugadoresBajados, setJugadoresBajados] = useState([]);
    const [juegosEnMesa, setJuegosEnMesa] = useState([]);
    const [cartasSeleccionadas, setCartasSeleccionadas] = useState([]);
    const [gruposParaBajar, setGruposParaBajar] = useState([]);

    // Marcador acumulado, ganador de la ronda y estado de cierre de la partida.
    const [puntuaciones, setPuntuaciones] = useState([]);
    const [ganadorRonda, setGanadorRonda] = useState(null);
    const [puntosUltimaRonda, setPuntosUltimaRonda] = useState([]);
    const [juegoTerminado, setJuegoTerminado] = useState(false);

    const [manoOculta, setManoOculta] = useState(false);
    const [mostrarPuntajes, setMostrarPuntajes] = useState(false);
    const [seBajoEnEsteTurno, setSeBajoEnEsteTurno] = useState(false);

    // Estado visual para ordenar cartas mediante arrastrar y soltar.
    const [cartaArrastradaIndex, setCartaArrastradaIndex] = useState(null);
    const [indiceDestinoArrastre, setIndiceDestinoArrastre] = useState(null);
    const [botPending, setBotPending] = useState(false);

    // Contrato correspondiente a la ronda seleccionada en la secuencia de juego.
    const contratoActual = CONTRATOS[rondaIndex];

    // Baraja, reparte y reinicia todos los estados necesarios para iniciar la ronda actual.
    const iniciarPartida = () => {
        const lista = [...baraja1, ...baraja2, "JOKER", "JOKER_2", "JOKER_3", "JOKER_4"];
        for (let i = lista.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [lista[i], lista[j]] = [lista[j], lista[i]];
        }

        const cantidadCartas = contratoActual.esEspecial ? 13 : 12;
        let mazoRestante = [...lista];
        const nuevasManos = [];

        for (let p = 0; p < numJugadores; p++) {
            nuevasManos.push(mazoRestante.slice(0, cantidadCartas));
            mazoRestante = mazoRestante.slice(cantidadCartas);
        }

        const primeraCartaDescarte = mazoRestante.shift();

        if (puntuaciones.length !== numJugadores) {
            setPuntuaciones(new Array(numJugadores).fill(0));
        }

        setManosJugadores(nuevasManos);
        setMazo(mazoRestante);
        setDescarte([primeraCartaDescarte]);
        setTurno(vsBot ? 0 : 1 % numJugadores);
        setHaRobado(false);
        setJugadoresBajados(new Array(numJugadores).fill(false));
        setJuegosEnMesa([]);
        setCartasSeleccionadas([]);
        setGruposParaBajar([]);
        setGanadorRonda(null);
        setPuntosUltimaRonda([]);
        setManoOculta(false);
        setBotPending(false);
        setSeBajoEnEsteTurno(false);
        setJuegoIniciado(true);
    };

    // Cuando se agota el mazo, conserva la carta superior del descarte y mezcla el resto.
    const verificarYReciclarMazo = (mazoActual, descarteActual) => {
        if (mazoActual.length > 0) return { mazo: mazoActual, descarte: descarteActual };

        if (descarteActual.length <= 1) {
            return { mazo: mazoActual, descarte: descarteActual };
        }

        const ultimaCarta = descarteActual[descarteActual.length - 1];
        const cartasAReciclar = descarteActual.slice(0, descarteActual.length - 1);

        for (let i = cartasAReciclar.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cartasAReciclar[i], cartasAReciclar[j]] = [cartasAReciclar[j], cartasAReciclar[i]];
        }

        return {
            mazo: cartasAReciclar,
            descarte: [ultimaCarta]
        };
    };

    // Roba una carta del mazo y marca que el jugador ya realizó su robo del turno.
    const robarMazo = () => {
        if (haRobado || ganadorRonda !== null || manoOculta || botPending) return;

        const resultadoMazo = verificarYReciclarMazo(mazo, descarte);
        if (resultadoMazo.mazo.length === 0) return;

        const copiaMazo = [...resultadoMazo.mazo];
        const carta = copiaMazo.shift();

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], carta];

        setMazo(copiaMazo);
        setDescarte(resultadoMazo.descarte);
        setManosJugadores(nuevasManos);
        setHaRobado(true);
    };

    // Toma la carta superior del descarte si el turno todavía permite robar.
    const robarDescarte = () => {
        if (haRobado || descarte.length === 0 || ganadorRonda !== null || manoOculta || botPending) return;
        const copiaDescarte = [...descarte];
        const carta = copiaDescarte.pop();

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], carta];

        setDescarte(copiaDescarte);
        setManosJugadores(nuevasManos);
        setHaRobado(true);
    };

    // Añade o quita una carta de la selección actual de la mano.
    const toggleSeleccionCarta = (indexCarta) => {
        if (manoOculta || botPending) return;
        if (cartasSeleccionadas.includes(indexCarta)) {
            setCartasSeleccionadas(cartasSeleccionadas.filter(i => i !== indexCarta));
        } else {
            setCartasSeleccionadas([...cartasSeleccionadas, indexCarta]);
        }
    };

    // Funciones de ordenamiento separadas
    // Ordena la mano por rango, dejando los Jokers al final.
    const ordenarManoPorValor = () => {
        const ordenValores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"];
        const manoActual = [...manosJugadores[turno]];
        manoActual.sort((a, b) => {
            const valA = a.includes("JOKER") ? "JOKER" : a.split("_")[0];
            const valB = b.includes("JOKER") ? "JOKER" : b.split("_")[0];
            return ordenValores.indexOf(valA) - ordenValores.indexOf(valB);
        });
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual;
        setManosJugadores(nuevasManos);
        setCartasSeleccionadas([]);
    };

    // Ordena primero por palo y después por rango para facilitar la lectura de la mano.
    const ordenarManoPorPalo = () => {
        const ordenPalos = { sword: 1, cup: 2, coin: 3, club: 4, joker: 5 };
        const ordenValores = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        
        const manoActual = [...manosJugadores[turno]];
        manoActual.sort((a, b) => {
            const detA = obtenerDetallesCarta(a);
            const detB = obtenerDetallesCarta(b);
            
            const paloA = detA.esJoker ? "joker" : detA.palo;
            const paloB = detB.esJoker ? "joker" : detB.palo;

            if (ordenPalos[paloA] !== ordenPalos[paloB]) {
                return ordenPalos[paloA] - ordenPalos[paloB];
            }

            if (detA.esJoker && detB.esJoker) return 0;
            if (detA.esJoker) return 1;
            if (detB.esJoker) return -1;

            return ordenValores.indexOf(detA.valor) - ordenValores.indexOf(detB.valor);
        });

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual;
        setManosJugadores(nuevasManos);
        setCartasSeleccionadas([]);
    };

    // Lógica de Arrastrar y Soltar (Drag and Drop)
    // Inicia el arrastre y genera una imagen fantasma nítida para la carta movida.
    const handleDragStart = (e, index) => {
        setCartaArrastradaIndex(index);
        setIndiceDestinoArrastre(null);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
        // Evita el fantasma translúcido por defecto: usa una copia nítida de la carta.
        const imagen = e.currentTarget.querySelector("img");
        if (imagen && e.dataTransfer.setDragImage) {
            const copia = imagen.cloneNode(true);
            Object.assign(copia.style, { width: "78px", height: "110px", opacity: "1", position: "fixed", top: "-1000px", left: "-1000px" });
            document.body.appendChild(copia);
            e.dataTransfer.setDragImage(copia, 39, 55);
            requestAnimationFrame(() => copia.remove());
        }
    };

    // Registra el hueco de destino mientras la carta atraviesa la mano.
    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (indiceDestinoArrastre !== index) setIndiceDestinoArrastre(index);
    };

    // Inserta la carta en la posición elegida y actualiza el orden de la mano.
    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (cartaArrastradaIndex === null) return;
        if (cartaArrastradaIndex !== targetIndex) {
            const manoActual = [...manosJugadores[turno]];
            const [cartaMovida] = manoActual.splice(cartaArrastradaIndex, 1);
            manoActual.splice(targetIndex, 0, cartaMovida);
            const nuevasManos = [...manosJugadores];
            nuevasManos[turno] = manoActual;
            setManosJugadores(nuevasManos);
            setCartasSeleccionadas([]);
        }
        setCartaArrastradaIndex(null);
        setIndiceDestinoArrastre(null);
    };

    // Limpia los indicadores visuales al terminar cualquier operación de arrastre.
    const handleDragEnd = () => {
        setCartaArrastradaIndex(null);
        setIndiceDestinoArrastre(null);
    };

    // Valida las 13 cartas y las reglas específicas de cada contrato especial.
    const esContratoEspecialValido = (cartas, subtipo) => {
        if (cartas.length !== 13) return false;
        const detalles = cartas.map(obtenerDetallesCarta);
        if (detalles.some(d => d.esJoker || !d.valor || !d.palo)) return false;
        const orden = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
        if (orden.some(valor => detalles.filter(d => d.valor === valor).length !== 1)) return false;
        if (subtipo === "real") return detalles.every(d => d.palo === detalles[0].palo);
        if (subtipo === "primavera") {
            return detalles.slice(1).every((d, i) =>
                colorDePalo(d.palo) !== colorDePalo(detalles[i].palo)
            );
        }
        return subtipo === "loca";
    };

    // Prepara la escala especial seleccionada y retira sus cartas de la mano.
    const armarContratoEspecial = () => {
        if (!contratoActual.esEspecial || !especialElegido) return;
        const manoActual = manosJugadores[turno];
        const cartasGrupo = cartasSeleccionadas.map(idx => manoActual[idx]);
        if (!esContratoEspecialValido(cartasGrupo, especialElegido.id)) return;
        setGruposParaBajar([...gruposParaBajar, {
            tipo: "Escala Especial", subtipo: especialElegido.id, cartas: cartasGrupo
        }]);
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual.filter((_, idx) => !cartasSeleccionadas.includes(idx));
        setManosJugadores(nuevasManos);
        setCartasSeleccionadas([]);
    };

    // Prepara un trío o una escala normal que forma parte del contrato actual.
    const armarGrupoParaBajar = (tipo) => {
        const manoActual = manosJugadores[turno];
        const cartasGrupo = cartasSeleccionadas.map(idx => manoActual[idx]);

        if (tipo === "Trío") {
            if (!esTríoVálido(cartasGrupo)) return;
        } else if (tipo === "Escala") {
            if (!esEscalaVálidaInicial(cartasGrupo)) return;
        }

        setGruposParaBajar([...gruposParaBajar, { tipo, cartas: cartasGrupo }]);

        const nuevaMano = manoActual.filter((_, idx) => !cartasSeleccionadas.includes(idx));
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = nuevaMano;

        setManosJugadores(nuevasManos);
        setCartasSeleccionadas([]);
    };

    // Devuelve a la mano todas las cartas de grupos preparados pero no confirmados.
    const cancelarGruposParaBajar = () => {
        if (gruposParaBajar.length === 0) return;
        const cartasDevueltas = gruposParaBajar.flatMap(g => g.cartas);
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], ...cartasDevueltas];
        setManosJugadores(nuevasManos);
        setGruposParaBajar([]);
    };

    // Comprueba que el jugador haya preparado exactamente todos los grupos requeridos.
    const validarContratoCumplido = () => {
        if (contratoActual.esEspecial) return gruposParaBajar.length > 0;
        const triosActuales = gruposParaBajar.filter(g => g.tipo === "Trío").length;
        const escalasActuales = gruposParaBajar.filter(g => g.tipo === "Escala").length;
        return triosActuales === contratoActual.triosReq && escalasActuales === contratoActual.escalasReq;
    };

    // Confirma los grupos preparados y los publica sobre la mesa.
    const confirmarBajada = () => {
        if (!validarContratoCumplido()) return;

        const nuevosJuegos = gruposParaBajar.map((g, idx) => ({
            id: Date.now() + idx,
            jugadorId: turno,
            tipo: g.tipo,
            cartas: g.cartas
        }));

        setJuegosEnMesa([...juegosEnMesa, ...nuevosJuegos]);

        const bajados = [...jugadoresBajados];
        bajados[turno] = true;
        setJugadoresBajados(bajados);

        setSeBajoEnEsteTurno(true);
        setGruposParaBajar([]);

        // Bajar el contrato también puede dejar la mano vacía.
        if (manosJugadores[turno].length === 0) {
            const penalizaciones = manosJugadores.map((manoJug, idx) =>
                idx === turno ? 0 : manoJug.reduce((acc, carta) => acc + calcularValorCarta(carta), 0)
            );
            setPuntuaciones(prev => prev.map((puntos, idx) => puntos + penalizaciones[idx]));
            setPuntosUltimaRonda(penalizaciones);
            setGanadorRonda(turno);
        }
    };

    // Añade cartas seleccionadas a una combinación ya bajada, validando sus reglas.
    const acoplarCartasAJuego = (juegoId) => {
        if (!haRobado || !jugadoresBajados[turno] || manoOculta || seBajoEnEsteTurno || cartasSeleccionadas.length === 0) return;

        const juegoDestino = juegosEnMesa.find(j => j.id === juegoId);
        if (!juegoDestino) return;

        const manoActual = [...manosJugadores[turno]];
        const cartasACoplar = cartasSeleccionadas.map(idx => manoActual[idx]);

        let valido = false;
        if (juegoDestino.tipo === "Trío") {
            valido = cartasSePuedenAcoplarATrío(juegoDestino.cartas, cartasACoplar);
        } else if (juegoDestino.tipo === "Escala") {
            valido = cartasSePuedenAcoplarAEscala(juegoDestino.cartas, cartasACoplar);
        }

        if (!valido) return;

        const nuevaMano = manoActual.filter((_, idx) => !cartasSeleccionadas.includes(idx));

        const nuevosJuegos = juegosEnMesa.map(juego => {
            if (juego.id === juegoId) {
                let nuevasCartas = [...juego.cartas, ...cartasACoplar];
                if (juego.tipo === "Escala") {
                    nuevasCartas = ordenarCartasDeEscala(nuevasCartas);
                }
                return { ...juego, cartas: nuevasCartas };
            }
            return juego;
        });

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = nuevaMano;

        setManosJugadores(nuevasManos);
        setJuegosEnMesa(nuevosJuegos);
        setCartasSeleccionadas([]);

        // Acoplar una o varias cartas puede vaciar la mano sin necesidad de descartar.
        if (nuevaMano.length === 0) {
            const penalizaciones = nuevasManos.map((manoJug, idx) =>
                idx === turno ? 0 : manoJug.reduce((acc, carta) => acc + calcularValorCarta(carta), 0)
            );
            setPuntuaciones(prev => prev.map((puntos, idx) => puntos + penalizaciones[idx]));
            setPuntosUltimaRonda(penalizaciones);
            setGanadorRonda(turno);
        }
    };

    // Descarta una carta y determina si la ronda terminó o debe pasar el turno.
    const descartarCarta = (indexCarta) => {
        if (!haRobado || manoOculta || botPending || gruposParaBajar.length > 0) return;

        const manoActual = [...manosJugadores[turno]];
        const [cartaTirada] = manoActual.splice(indexCarta, 1);

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual;

        setManosJugadores(nuevasManos);
        setDescarte([...descarte, cartaTirada]);
        setCartasSeleccionadas([]);

        if (manoActual.length === 0) {
            const penalizaciones = manosJugadores.map((manoJug, idx) => {
                if (idx === turno) return 0;
                return manoJug.reduce((acc, carta) => acc + calcularValorCarta(carta), 0);
            });

            const nuevosPuntajes = puntuaciones.map((puntosActuales, idx) => puntosActuales + penalizaciones[idx]);
            setPuntuaciones(nuevosPuntajes);
            setPuntosUltimaRonda(penalizaciones);
            setGanadorRonda(turno);
        } else {
            setHaRobado(false);
            setSeBajoEnEsteTurno(false);
            if (vsBot) {
                // En modo individual el jugador humano siempre conserva la mano inferior.
                setTurno(1);
                setManoOculta(false);
                setBotPending(true);
            } else {
                setTurno((turno + 1) % numJugadores);
                setManoOculta(true);
            }
        }
    };

    // Cada bot ocupa un asiento propio: el jugador humano siempre es el índice 0.
    // Los bots comparten la mesa y pueden añadir cartas a cualquier combinación legal.
    useEffect(() => {
        if (!vsBot || !botPending || !juegoIniciado || ganadorRonda !== null || turno === 0) return undefined;

        const botIndex = turno;
        const timer = setTimeout(() => {
            let stock = [...mazo];
            let pile = [...descarte];
            const hands = manosJugadores.map(hand => [...hand]);
            let botHand = [...(hands[botIndex] || [])];
            let tableNow = [...juegosEnMesa];
            const laidFlags = [...jugadoresBajados];
            let botLaidNow = false;

            // Toma el descarte solo cuando aporta a un trío o una escala.
            const top = pile[pile.length - 1];
            const tipoEspecialBot = contratoActual.esEspecial ? (especialElegido?.id || 'loca') : null;
            const takeDiscard = Boolean(top) &&
                evaluarPotencialManoBot([...botHand, top], contratoActual, tipoEspecialBot) >
                evaluarPotencialManoBot(botHand, contratoActual, tipoEspecialBot);
            if (takeDiscard) {
                botHand.push(pile.pop());
            } else {
                const recycled = verificarYReciclarMazo(stock, pile);
                stock = [...recycled.mazo];
                pile = [...recycled.descarte];
                if (stock.length > 0) botHand.push(stock.shift());
                else if (pile.length > 0) botHand.push(pile.pop());
            }

            // Busca el contrato completo sin reutilizar cartas de la mano.
            if (!laidFlags[botIndex]) {
                const candidates = [];
                if (!contratoActual.esEspecial) {
                    const byRank = {};
                    botHand.forEach((card, i) => {
                        const d = obtenerDetallesCarta(card);
                        if (!d.esJoker && d.valor) (byRank[d.valor] ||= []).push(i);
                    });
                    Object.values(byRank).forEach(indices => {
                        if (indices.length >= 3) {
                            for (let a = 0; a < indices.length - 2; a++)
                                for (let b = a + 1; b < indices.length - 1; b++)
                                    for (let c = b + 1; c < indices.length; c++)
                                        candidates.push({ tipo: 'Trío', indices: [indices[a], indices[b], indices[c]] });
                        }
                    });
                }
                candidates.push(...generarCandidatosEscalaBot(botHand, tipoEspecialBot));

                const needTrio = contratoActual.esEspecial ? 0 : contratoActual.triosReq;
                const needScale = contratoActual.esEspecial ? 0 : contratoActual.escalasReq;
                let chosen = null;
                let bestScore = -Infinity;
                const search = (from, trios, scales, used, groups) => {
                    const complete = contratoActual.esEspecial
                        ? groups.length > 0
                        : trios === needTrio && scales === needScale;
                    if (complete) {
                        const remaining = botHand.filter((_, index) => !used.has(index));
                        const score = evaluarPotencialManoBot(remaining, contratoActual, tipoEspecialBot);
                        if (score > bestScore) {
                            bestScore = score;
                            chosen = [...groups];
                        }
                        return;
                    }
                    for (let i = from; i < candidates.length; i++) {
                        const g = candidates[i];
                        if (g.indices.some(index => used.has(index))) continue;
                        if (g.tipo === 'Trío' && !contratoActual.esEspecial && trios < needTrio) {
                            const next = new Set(used); g.indices.forEach(x => next.add(x));
                            search(i + 1, trios + 1, scales, next, [...groups, g]);
                        }
                        if (g.tipo === 'Escala' && scales < needScale) {
                            const next = new Set(used); g.indices.forEach(x => next.add(x));
                            search(i + 1, trios, scales + 1, next, [...groups, g]);
                        }
                    }
                };
                search(0, 0, 0, new Set(), []);

                if (chosen) {
                    const used = new Set(chosen.flatMap(g => g.indices));
                    const laid = chosen.map((g, index) => ({
                        id: Date.now() + botIndex * 100 + index,
                        jugadorId: botIndex,
                        tipo: g.tipo,
                        cartas: g.indices.map(i => botHand[i])
                    }));
                    botHand = botHand.filter((_, i) => !used.has(i));
                    tableNow = [...tableNow, ...laid];
                    botLaidNow = true;
                    laidFlags[botIndex] = true;
                }
            }

            // Tras bajar su contrato, revisa TODOS los grupos de la mesa.
            // No filtra por propietario: puede acoplar a sus grupos o a los de cualquier rival.
            if (laidFlags[botIndex] && !botLaidNow) {
                let addedSomething = true;
                while (addedSomething && botHand.length > 0) {
                    addedSomething = false;
                    for (let meldIndex = 0; meldIndex < tableNow.length; meldIndex++) {
                        const meld = tableNow[meldIndex];
                        for (let cardIndex = botHand.length - 1; cardIndex >= 0; cardIndex--) {
                            const card = botHand[cardIndex];
                            let updatedCards = [...meld.cartas, card];
                            let valid = false;

                            if (meld.tipo === 'Trío') {
                                valid = cartasSePuedenAcoplarATrío(meld.cartas, [card]);
                            } else if (meld.tipo === 'Escala') {
                                updatedCards = ordenarCartasDeEscala(updatedCards);
                                valid = cartasSePuedenAcoplarAEscala(meld.cartas, [card]);
                            }

                            if (valid) {
                                tableNow[meldIndex] = { ...meld, cartas: updatedCards };
                                botHand.splice(cardIndex, 1);
                                addedSomething = true;
                            }
                        }
                    }
                }
            }

            // Descarta la carta menos útil, conservando parejas y secuencias potenciales.
            if (botHand.length > 0) {
                let discardIndex = 0;
                let bestRemainingScore = -Infinity;
                botHand.forEach((card, i) => {
                    const remaining = botHand.filter((_, j) => j !== i);
                    // Descarta la carta cuya salida deja la mejor combinación potencial,
                    // usando penalización alta para cartas caras que no aportan al contrato.
                    const score = evaluarPotencialManoBot(remaining, contratoActual, tipoEspecialBot) +
                        calcularValorCarta(card) * 0.08;
                    if (score > bestRemainingScore) {
                        bestRemainingScore = score;
                        discardIndex = i;
                    }
                });
                pile.push(botHand.splice(discardIndex, 1)[0]);
            }

            hands[botIndex] = botHand;
            setMazo(stock);
            setDescarte(pile);
            setJuegosEnMesa(tableNow);
            setManosJugadores(hands);
            setJugadoresBajados(laidFlags);
            setHaRobado(false);
            setSeBajoEnEsteTurno(false);

            if (botHand.length === 0) {
                const penalties = hands.map((hand, idx) =>
                    idx === botIndex ? 0 : hand.reduce((sum, card) => sum + calcularValorCarta(card), 0)
                );
                setPuntuaciones(prev => prev.map((score, idx) => score + penalties[idx]));
                setPuntosUltimaRonda(penalties);
                setGanadorRonda(botIndex);
                setBotPending(false);
                return;
            }

            const nextPlayer = (botIndex + 1) % numJugadores;
            setTurno(nextPlayer);
            setManoOculta(false);
            setBotPending(nextPlayer !== 0);
        }, 850);

        return () => clearTimeout(timer);
    }, [
        vsBot, botPending, juegoIniciado, ganadorRonda, turno, numJugadores,
        mazo, descarte, manosJugadores, juegosEnMesa, jugadoresBajados,
        contratoActual, especialElegido
    ]);

    // Avanza al contrato siguiente sin perder los puntos acumulados de la partida.
    const avanzarSiguienteRonda = () => {
        if (rondaIndex < CONTRATOS.length - 1) {
            setRondaIndex(rondaIndex + 1);
            setEspecialElegido(null);
            setJuegoIniciado(false);
            setGanadorRonda(null);
        }
    };

    // Cierra la partida en cualquier ronda y conserva las puntuaciones acumuladas.
    // La pantalla de resultados se muestra fuera de la mesa para evitar que el juego quede bloqueado.
    const terminarJuego = () => {
        setJuegoTerminado(true);
        setJuegoIniciado(false);
        setGanadorRonda(null);
        setMostrarPuntajes(false);
    };

    // Convierte los puntos acumulados en filas ordenables: en Cariocas gana quien menos puntos tiene.
    // Proyección de puntuaciones a nombres visibles para la pantalla de clasificación.
    const resultadosFinales = puntuaciones.map((score, index) => ({
        id: index,
        nombre: vsBot ? (index === 0 ? 'Tú' : `Bot ${index}`) : `Jugador ${index + 1}`,
        puntos: score,
    }));

    const ordenJugadores = obtenerOrdenVisualJugadores(turno, numJugadores);
    const oponentes = ordenJugadores.slice(1);
    // Estado derivado: indica si los grupos preparados satisfacen el contrato actual.
    const cumpleContrato = validarContratoCumplido();
    // Estado derivado que habilita acciones de extensión sobre combinaciones de la mesa.
    const puedeAcoplarGlobal = haRobado && jugadoresBajados[turno] && cartasSeleccionadas.length > 0 && !seBajoEnEsteTurno;

    return (
        <div className="mesa-container">
            <div className="hud-top">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <strong style={{ fontSize: "1.2rem", color: "#d4af37" }}>CARIOCAS</strong>
                    <span className="contrato-badge">
                        Ronda {contratoActual.id}: {contratoActual.esEspecial && especialElegido ? especialElegido.nombre : contratoActual.nombre}
                    </span>
                </div>

                {juegoIniciado && (
                    <div style={{ fontSize: "0.95rem" }}>
                        {botPending ? <span style={{ color: "#ffd700", fontWeight: "bold" }}>Bot {turno} está jugando...</span> : !haRobado ? (
                            <span style={{ color: "#ffd700", fontWeight: "bold" }}>
                                {vsBot ? 'Tu turno: roba una carta del Mazo o del Pozo' : `Jugador ${turno + 1}: Roba una carta del Mazo o del Pozo`}
                            </span>
                        ) : (
                            <span style={{ color: "#81c784", fontWeight: "bold" }}>
                                {vsBot ? "Tu turno" : `Jugador ${turno + 1}`}: {jugadoresBajados[turno] ? (seBajoEnEsteTurno ? "Descarta una carta para terminar tu turno" : "Selecciona carta(s) para acoplar o descarta") : "Arma tu contrato o descarta"}
                            </span>
                        )}
                    </div>
                )}

                <button className="btn-hud" onClick={() => setMostrarPuntajes(!mostrarPuntajes)}>
                    Puntajes
                </button>
            </div>

            {mostrarPuntajes && (
                <div className="overlay-modal" onClick={() => setMostrarPuntajes(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: "#d4af37", marginTop: 0 }}>Tabla de Puntajes</h2>
                        <p style={{ fontSize: "0.85rem", color: "#ccc" }}>(Gana quien tenga menos puntos al final de la Ronda 9)</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "16px 0" }}>
                            {puntuaciones.map((pts, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "#263530", padding: "10px 15px", borderRadius: "6px" }}>
                                    <span>{vsBot ? (idx === 0 ? "Tú" : `Bot ${idx}`) : `Jugador ${idx + 1}`}</span>
                                    <strong>{pts} pts</strong>
                                </div>
                            ))}
                        </div>
                        <button className="btn-accion btn-dorado" onClick={() => setMostrarPuntajes(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {!juegoIniciado ? (
                <div className="overlay-modal">
                    <div className="modal-box">
                        {juegoTerminado ? (
                            <PodioResultados resultados={resultadosFinales} onExit={onExit} />
                        ) : (
                            <>
                                <h2 style={{ color: "#d4af37", marginTop: 0 }}>Ronda {contratoActual.id} de 9</h2>
                                <h1 style={{ margin: "10px 0" }}>{contratoActual.nombre}</h1>

                                {contratoActual.esEspecial && (
                                    <div style={{ margin: "15px 0" }}>
                                        <p style={{ fontSize: "0.9rem" }}>Elige la modalidad especial (13 cartas):</p>
                                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                                            {ESPECIALES.map(esp => (
                                                <button
                                                    key={esp.id}
                                                    onClick={() => setEspecialElegido(esp)}
                                                    className="btn-accion"
                                                    style={{
                                                        background: especialElegido?.id === esp.id ? "#d4af37" : "#2e3d38",
                                                        color: especialElegido?.id === esp.id ? "#111" : "#fff"
                                                    }}
                                                >
                                                    {esp.nombre}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {rondaIndex === 0 && (
                                    <div style={{ margin: "18px 0" }}>
                                        {!vsBot ? <>
                                            <label style={{ marginRight: "10px" }}>Cantidad de jugadores:</label>
                                            <select
                                                value={numJugadores}
                                                onChange={(e) => setNumJugadores(Number(e.target.value))}
                                                style={{ padding: "6px 10px", borderRadius: "6px", fontWeight: "bold" }}
                                            >
                                                <option value={2}>2 Jugadores</option>
                                                <option value={3}>3 Jugadores</option>
                                                <option value={4}>4 Jugadores</option>
                                            </select>
                                        </> : <>
                                            <label style={{ marginRight: "10px" }}>Cantidad de bots:</label>
                                            <select
                                                value={numJugadores - 1}
                                                onChange={(e) => setNumJugadores(Number(e.target.value) + 1)}
                                                style={{ padding: "6px 10px", borderRadius: "6px", fontWeight: "bold" }}
                                            >
                                                <option value={1}>1 bot</option>
                                                <option value={2}>2 bots</option>
                                                <option value={3}>3 bots</option>
                                                
                                            </select>
                                            <p style={{ marginTop: "8px", color: "#c9bda7", fontSize: ".85rem" }}>
                                                Tú jugarás contra {numJugadores - 1} {numJugadores === 2 ? "bot" : "bots"}.
                                            </p>
                                        </>}
                                    </div>
                                )}

                                <button
                                    className="btn-accion btn-verde"
                                    style={{ fontSize: "1rem", padding: "10px 24px", marginTop: "10px" }}
                                    onClick={iniciarPartida}
                                    disabled={contratoActual.esEspecial && !especialElegido}
                                >
                                    Mezclar y Repartir
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="oponentes-bar">
                        {oponentes.map(idxOp => {
                            const juegosDelOponente = juegosEnMesa.filter(j => j.jugadorId === idxOp);
                            return (
                                <div key={idxOp} className="oponente-card-box">
                                    <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                                        {vsBot ? (idxOp === 0 ? "Tú" : `Bot ${idxOp}`) : `Jugador ${idxOp + 1}`} {jugadoresBajados[idxOp] ? " Bajado" : ""}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "#ccc" }}>
                                        {manosJugadores[idxOp]?.length} cartas en mano
                                    </div>
                                    <div className="dorso-mini-stack" style={{ marginBottom: "6px" }}>
                                        {Array.from({ length: Math.min(manosJugadores[idxOp]?.length || 0, 8) }).map((_, i) => (
                                            <img key={i} src="/images/reversoCarta.png" alt="Carta oculta" className="dorso-mini" />
                                        ))}
                                    </div>
                                    {juegosDelOponente.length > 0 && (
                                        <div className="oponente-zona-mesa">
                                            {juegosDelOponente.map(juego => {
                                                const manoActual = manosJugadores[turno] || [];
                                                const cartasSel = cartasSeleccionadas.map(idx => manoActual[idx]);
                                                const esValidoParaEsteJuego = puedeAcoplarGlobal && (
                                                    juego.tipo === "Trío"
                                                        ? cartasSePuedenAcoplarATrío(juego.cartas, cartasSel)
                                                        : cartasSePuedenAcoplarAEscala(juego.cartas, cartasSel)
                                                );

                                                return (
                                                    <div key={juego.id} className="grupo-bajado-oponente">
                                                        <small style={{ color: "#ffd700", fontSize: "0.65rem" }}>{juego.tipo}</small>
                                                        <div className="grupo-cartas-row">
                                                            {juego.cartas.map((c, i) => (
                                                                <img key={i} src={obtenerRutaImagen(c)} alt={c} className="carta-bajadas-img" />
                                                            ))}
                                                        </div>
                                                        {esValidoParaEsteJuego && (
                                                            <button
                                                                onClick={() => acoplarCartasAJuego(juego.id)}
                                                                className="btn-accion btn-dorado"
                                                                style={{ marginTop: "4px", padding: "2px 6px", fontSize: "0.65rem" }}
                                                            >
                                                                + Acoplar aquí ({cartasSeleccionadas.length})
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="zona-central">
                        <div className="mazos-row">
                            <div style={{ textAlign: "center" }}>
                                <div
                                    className={`pila-carta ${!haRobado && !manoOculta ? "pila-activa" : ""}`}
                                    onClick={robarMazo}
                                    title="Haz clic para robar del mazo"
                                >
                                    <div className="mazo-dorso">
                                        <img src="/images/reversoCarta.png" alt="Reverso de carta" className="mazo-reverso-img" />
                                        <span className="mazo-contador">{mazo.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ textAlign: "center" }}>
                                <div
                                    className={`pila-carta ${!haRobado && descarte.length > 0 && !manoOculta ? "pila-activa" : ""}`}
                                    onClick={robarDescarte}
                                    title="Haz clic para robar del pozo"
                                >
                                    <div className="descarte-slot">
                                        {descarte.length > 0 ? (
                                            <img
                                                src={obtenerRutaImagen(descarte[descarte.length - 1])}
                                                alt="Descarte"
                                                className="carta-img"
                                            />
                                        ) : (
                                            <span style={{ fontSize: "0.75rem", color: "#aaa" }}>Vacío</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="juegos-mesa-grid">
                            {juegosEnMesa
                                .filter(juego => juego.jugadorId === turno)
                                .map(juego => {
                                    const manoActual = manosJugadores[turno] || [];
                                    const cartasSel = cartasSeleccionadas.map(idx => manoActual[idx]);
                                    const esValidoParaEsteJuego = puedeAcoplarGlobal && (
                                        juego.tipo === "Trío"
                                            ? cartasSePuedenAcoplarATrío(juego.cartas, cartasSel)
                                            : cartasSePuedenAcoplarAEscala(juego.cartas, cartasSel)
                                    );

                                    return (
                                        <div key={juego.id} className="grupo-bajado">
                                            <small style={{ color: "#ffd700", fontWeight: "bold" }}>
                                                {juego.tipo}
                                            </small>
                                            <div className="grupo-cartas-row">
                                                {juego.cartas.map((c, i) => (
                                                    <img
                                                        key={i}
                                                        src={obtenerRutaImagen(c)}
                                                        alt={c}
                                                        className="carta-bajadas-img"
                                                    />
                                                ))}
                                            </div>
                                            {esValidoParaEsteJuego && (
                                                <button
                                                    onClick={() => acoplarCartasAJuego(juego.id)}
                                                    className="btn-accion btn-dorado"
                                                    style={{ marginTop: "6px", padding: "3px 8px", fontSize: "0.72rem" }}
                                                >
                                                    + Acoplar carta ({cartasSeleccionadas.length})
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="zona-jugador">
                        {gruposParaBajar.length > 0 && (
                            <div style={{ display: "flex", gap: "10px", marginBottom: "8px", background: "rgba(0,0,0,0.6)", padding: "6px 12px", borderRadius: "8px", alignItems: "center" }}>
                                <span style={{ fontSize: "0.8rem", color: cumpleContrato ? "#81c784" : "#ffcc00" }}>
                                    {cumpleContrato ? " Contrato cumplido" : `Atención Faltan grupos (Req: ${contratoActual.triosReq} Tríos, ${contratoActual.escalasReq} Escalas)`}
                                </span>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    {gruposParaBajar.map((g, idx) => (
                                        <div key={idx} style={{ textAlign: "center" }}>
                                            <small style={{ color: "#81c784", display: "block" }}>{g.tipo}</small>
                                            <div style={{ display: "flex", gap: "2px" }}>
                                                {g.cartas.map((c, i) => (
                                                    <img key={i} src={obtenerRutaImagen(c)} alt={c} style={{ width: "34px", height: "48px", borderRadius: "3px" }} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="barra-acciones">
                            {/* Botones de ordenar separados */}
                            <button className="btn-hud" disabled={botPending} onClick={ordenarManoPorPalo}>
                                 Ordenar Palo
                            </button>
                            <button className="btn-hud" disabled={botPending} onClick={ordenarManoPorValor}>
                                Ordenar por valor
                            </button>

                            {!vsBot && <button className="btn-hud" onClick={() => setManoOculta(!manoOculta)}>
                                {manoOculta ? "Mostrar mano" : "Ocultar mano"}
                            </button>}

                            {haRobado && !jugadoresBajados[turno] && (
                                <>
                                    {!contratoActual.esEspecial && contratoActual.triosReq > 0 && (
                                        <button
                                            className="btn-accion btn-azul"
                                            onClick={() => armarGrupoParaBajar("Trío")}
                                            disabled={cartasSeleccionadas.length < 3}
                                        >
                                            Armar Trío ({cartasSeleccionadas.length})
                                        </button>
                                    )}

                                    {!contratoActual.esEspecial && contratoActual.escalasReq > 0 && (
                                        <button
                                            className="btn-accion btn-azul"
                                            onClick={() => armarGrupoParaBajar("Escala")}
                                            disabled={cartasSeleccionadas.length !== 4}
                                        >
                                            Armar Escala (4)
                                        </button>
                                    )}

                                    {contratoActual.esEspecial && (
                                        <button
                                            className="btn-accion btn-dorado"
                                            onClick={armarContratoEspecial}
                                            disabled={cartasSeleccionadas.length !== 13 || !especialElegido}
                                        >
                                            Armar {especialElegido?.nombre || "Contrato Especial"} (13)
                                        </button>
                                    )}

                                    {gruposParaBajar.length > 0 && (
                                        <>
                                            <button 
                                                className="btn-accion btn-verde" 
                                                onClick={confirmarBajada}
                                                disabled={!cumpleContrato}
                                            >
                                                Confirmar bajada
                                            </button>
                                            <button className="btn-accion btn-rojo" onClick={cancelarGruposParaBajar}>
                                                Cancelar
                                            </button>
                                        </>
                                    )}
                                </>
                            )}

                            {haRobado && cartasSeleccionadas.length === 1 && gruposParaBajar.length === 0 && (
                                <button
                                    className="btn-accion btn-rojo"
                                    onClick={() => descartarCarta(cartasSeleccionadas[0])}
                                >
                                    Descartar carta seleccionada
                                </button>
                            )}
                        </div>

                        {botPending ? (
                            <div className="mano-abanico mano-bot-oculta" aria-label="Cartas ocultas del bot">
                                {manosJugadores[turno]?.map((_, index) => (
                                    <div key={`bot-back-${index}`} className="carta-mano-wrapper carta-mano-reverso">
                                        <img src="/images/reversoCarta.png" alt="Carta oculta del bot" className="carta-img" />
                                    </div>
                                ))}
                            </div>
                        ) : manoOculta && !vsBot ? (
                            <div style={{ height: "120px", display: "flex", alignItems: "center", gap: "15px" }}>
                                <span>Turno de <strong>Jugador {turno + 1}</strong>. Asegúrate de que los demás no miren.</span>
                                <button className="btn-accion btn-dorado" onClick={() => setManoOculta(false)}>
                                    Ver mis cartas
                                </button>
                            </div>
                        ) : (
                            <div className="mano-abanico">
                                {manosJugadores[turno]?.map((carta, index) => {
                                    const estaSeleccionada = cartasSeleccionadas.includes(index);
                                    return (
                                        <div
                                            key={`${carta}-${index}`}
                                            className={`carta-mano-wrapper ${estaSeleccionada ? "carta-seleccionada" : ""} ${cartaArrastradaIndex === index ? "carta-arrastrando" : ""} ${indiceDestinoArrastre === index && cartaArrastradaIndex !== index ? "carta-destino-arrastre" : ""}`}
                                            draggable={!manoOculta}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragLeave={() => setIndiceDestinoArrastre(null)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => toggleSeleccionCarta(index)}
                                            onDoubleClick={() => {
                                                if (haRobado && gruposParaBajar.length === 0) {
                                                    descartarCarta(index);
                                                }
                                            }}
                                            title="Arrastra para reordenar · Clic para seleccionar · Doble clic para descartar"
                                            style={{ cursor: "grab" }}
                                        >
                                            <img src={obtenerRutaImagen(carta)} alt={carta} className="carta-img" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {ganadorRonda !== null && (
                <div className="overlay-modal">
                    <div className="modal-box">
                        <h2 style={{ color: "#d4af37", marginTop: 0 }}>Ronda cerrada</h2>
                        <p><strong>{vsBot ? (ganadorRonda === 0 ? "Tú" : `Bot ${ganadorRonda}`) : `Jugador ${ganadorRonda + 1}`}</strong> cerró el juego y ganó la ronda.</p>
                        <div style={{ textAlign: "left", background: "#263530", padding: "12px", borderRadius: "8px", margin: "15px 0" }}>
                            {puntosUltimaRonda.map((pts, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                                    <span>{vsBot ? (i === 0 ? "Tú" : `Bot ${i}`) : `Jugador ${i + 1}`}:</span>
                                    <span style={{ color: pts === 0 ? "#81c784" : "#ef9a9a" }}>+{pts} pts</span>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "15px" }}>
                            {rondaIndex < CONTRATOS.length - 1 ? (
                                <>
                                    <button className="btn-accion btn-verde" onClick={avanzarSiguienteRonda}>
                                        Siguiente Contrato →
                                    </button>
                                    <button className="btn-accion btn-rojo" onClick={terminarJuego}>
                                        Terminar partida y ver podio
                                    </button>
                                </>
                            ) : (
                                <button className="btn-accion btn-dorado" onClick={terminarJuego}>
                                    Ver puntuaciones y podio final
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import OnlineGame from './OnlineGame.jsx';
import Management from './Management.jsx';

// Menú inicial: permite elegir partida local, contra bots o multijugador online.
function MainMenu({ onSelect }) {
    return (
        <main className="main-menu">
            <div className="main-menu-content">
                <p className="main-menu-kicker">UN JUEGO DE ESTRATEGIA Y CARTAS</p>
                <h1>CARIOCAS</h1>
                <p className="main-menu-subtitle">¿Cómo quieres jugar hoy?</p>
                <div className="main-menu-options">
                    <button className="main-menu-option" onClick={() => onSelect('local')}>
                        <span className="main-menu-icon"></span>
                        <strong>Multijugador local</strong>
                        <small>Comparte el computador y juega por turnos</small>
                    </button>
                    <button className="main-menu-option" onClick={() => onSelect('bot')}>
                        <span className="main-menu-icon"></span>
                        <strong>Contra el bot</strong>
                        <small>Enfréntate a la inteligencia artificial</small>
                    </button>
                    <button className="main-menu-option main-menu-online" onClick={() => onSelect('online')}>
                        <span className="main-menu-icon">♠</span>
                        <strong>Multijugador online</strong>
                        <small>Crea una sala pública o privada, o únete a tus amigos</small>
                    </button>
                    <button className="main-menu-option" onClick={() => onSelect('history')}>
                        <span className="main-menu-icon">▤</span>
                        <strong>Visualización de partidas</strong>
                        <small>Consulta, administra y elimina partidas del historial</small>
                    </button>
                    <button className="main-menu-option" onClick={() => onSelect('stats')}>
                        <span className="main-menu-icon">▥</span>
                        <strong>Estadísticas</strong>
                        <small>Consulta y actualiza tu rendimiento de juego</small>
                    </button>
                </div>
            </div>
        </main>
    );
}

// Componente raíz: gestiona autenticación y navegación entre modos de juego.
export default function App() {
    const [section, setSection] = useState('menu');
    const [hasAccess, setHasAccess] = useState(false);
    const goBack = () => setSection('menu');
    const handleAuthenticated = useCallback(() => setHasAccess(true), []);

    if (!hasAccess) {
        return <OnlineGame initialMode="gate" onAuthenticated={handleAuthenticated} onBack={() => {}} />;
    }

    return (
        <>
            {section === 'menu' && <MainMenu onSelect={setSection} />}
            {section === 'local' && <div className="app-game-shell">
                <button className="btn-accion btn-verde app-back-menu" onClick={goBack}>← Menú principal</button>
                <LocalGame onExit={goBack} />
            </div>}
            {section === 'bot' && <div className="app-game-shell"><button className="btn-accion btn-verde app-back-menu" onClick={goBack}>← Menú principal</button><LocalGame vsBot onExit={goBack} /></div>}
            {section === 'online' && <OnlineGame initialMode="online" onBack={goBack} />}
            {(section === 'history' || section === 'stats') && <Management section={section} onBack={goBack} onNavigate={setSection} />}
        </>
    );
}
