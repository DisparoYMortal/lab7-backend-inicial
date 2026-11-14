import React, { useEffect, useState, useCallback } from 'react';
import './App.css';

const baraja1 = [
    "A_sword", "2_sword", "3_sword", "4_sword", "5_sword", "6_sword", "7_sword", "8_sword", "9_sword", "10_sword", "J_sword", "Q_sword", "K_sword",
    "A_cup", "2_cup", "3_cup", "4_cup", "5_cup", "6_cup", "7_cup", "8_cup", "9_cup", "10_cup", "J_cup", "Q_cup", "K_cup",
    "A_coin", "2_coin", "3_coin", "4_coin", "5_coin", "6_coin", "7_coin", "8_coin", "9_coin", "10_coin", "J_coin", "Q_coin", "K_coin",
    "A_club", "2_club", "3_club", "4_club", "5_club", "6_club", "7_club", "8_club", "9_club", "10_club", "J_club", "Q_club", "K_club"
];

const baraja2 = [
    "A_sword1", "2_sword1", "3_sword1", "4_sword1", "5_sword1", "6_sword1", "7_sword1", "8_sword1", "9_sword1", "10_sword1", "J_sword1", "Q_sword1", "K_sword1",
    "A_cup1", "2_cup1", "3_cup1", "4_cup1", "5_cup1", "6_cup1", "7_cup1", "8_cup1", "9_cup1", "10_cup1", "J_cup1", "Q_cup1", "K_cup1",
    "A_coin1", "2_coin1", "3_coin1", "4_coin1", "5_coin1", "6_coin1", "7_coin1", "8_coin1", "9_coin1", "10_coin1", "J_coin1", "Q_coin1", "K_coin1",
    "A_club1", "2_club1", "3_club1", "4_club1", "5_club1", "6_club1", "7_club1", "8_club1", "9_club1", "10_club1", "J_club1", "Q_club1", "K_club1"
];

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

const ESPECIALES = [
    { id: "loca", nombre: "Escala Loca (Sucia)" },
    { id: "primavera", nombre: "Primavera" },
    { id: "real", nombre: "Escala Real (Limpia)" }
];

const ORDEN_ESCALA = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const calcularValorCarta = (carta) => {
    if (carta.includes("JOKER")) return 30;
    if (carta.startsWith("A_")) return 20;
    if (carta.startsWith("J_") || carta.startsWith("Q_") || carta.startsWith("K_")) return 10;
    const partes = carta.split("_");
    const valorNum = parseInt(partes[0], 10);
    return isNaN(valorNum) ? 10 : valorNum;
};

const obtenerDetallesCarta = (carta) => {
    if (carta.startsWith("JOKER")) {
        return { esJoker: true, valor: null, palo: null };
    }
    const match = carta.match(/^(A|[2-9]|10|J|Q|K)_(sword|cup|coin|club)(1?)$/);
    if (!match) return { esJoker: false, valor: null, palo: null };
    return { esJoker: false, valor: match[1], palo: match[2] };
};

const obtenerRutaImagen = (carta) => {
    if (carta.startsWith("JOKER")) return carta === "JOKER" || carta === "JOKER_3" ? "/images/JOKER.png" : "/images/JOKER1.png";

    const coincidencia = carta.match(/^(A|[2-9]|10|J|Q|K)_(sword|cup|coin|club)(1?)$/);
    if (!coincidencia) return "/images/card-error.png";

    const [, valor, palo, duplicado] = coincidencia;
    const palos = { sword: "sword", cup: "cups", coin: "coins", club: "clubs" };
    return `/images/${valor}_${palos[palo]}${duplicado}.png`;
};

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

const esEscalaVálidaInicial = (cartas) => {
    if (cartas.length !== 4) return false;

    for (let i = 0; i <= ORDEN_ESCALA.length - 4; i++) {
        const sub = ORDEN_ESCALA.slice(i, i + 4);
        if (comprobarSecuenciaConCartas(cartas, sub)) return true;
    }
    return false;
};

const comprobarSecuenciaConCartas = (cartas, valoresEsperados) => {
    let paloComun = null;

    for (let i = 0; i < 4; i++) {
        const c = cartas[i];
        const det = obtenerDetallesCarta(c);

        if (!det.esJoker) {
            if (det.valor !== valoresEsperados[i]) return false;
            if (paloComun === null) {
                paloComun = det.palo;
            } else if (paloComun !== det.palo) {
                return false;
            }
        }
    }
    return true;
};

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

const rangoNumericoCarta = (valor) => ({ A: 1, J: 11, Q: 12, K: 13 }[valor] ?? Number(valor));

// Devuelve las cartas ordenadas por el rango que representan. El As puede ser bajo o alto.
const ordenarCartasDeEscala = (cartas) => [...cartas].sort((a, b) => {
    const da = obtenerDetallesCarta(a), db = obtenerDetallesCarta(b);
    const ra = da.esJoker ? 99 : rangoNumericoCarta(da.valor);
    const rb = db.esJoker ? 99 : rangoNumericoCarta(db.valor);
    return ra - rb;
});

const esSecuenciaValidaCompleta = (cartas) => {
    const n = cartas.length;
    if (n < 4 || n > 13) return false;
    const naturales = cartas.map(obtenerDetallesCarta).filter(d => !d.esJoker);
    if (!naturales.length || new Set(naturales.map(d => d.palo)).size !== 1) return false;
    const ranks = naturales.map(d => rangoNumericoCarta(d.valor));
    if (new Set(ranks).size !== ranks.length) return false;

    // Se prueban ventanas consecutivas A-2...K y 2-3...A alto.
    const starts = Array.from({ length: 15 - n }, (_, i) => i + 1);
    for (const start of starts) {
        const objetivo = Array.from({ length: n }, (_, i) => start + i);
        const objetivoSet = new Set(objetivo);
        const naturalesEnVentana = ranks.every(r => objetivoSet.has(r) || (r === 1 && objetivo.includes(14)));
        if (!naturalesEnVentana) continue;
        const ranksAjustados = ranks.map(r => r === 1 && objetivo.includes(14) && !objetivo.includes(1) ? 14 : r);
        if (new Set(ranksAjustados).size !== ranksAjustados.length) continue;
        if (objetivo.filter(r => !ranksAjustados.includes(r)).length === cartas.length - naturales.length) return true;
    }
    return false;
};

const cartasSePuedenAcoplarAEscala = (escalaCartas, cartasNuevas) => {
    if (!cartasNuevas.length) return false;
    const todas = [...escalaCartas, ...cartasNuevas];
    const naturales = todas.map(obtenerDetallesCarta).filter(d => !d.esJoker);
    if (naturales.length && new Set(naturales.map(d => d.palo)).size !== 1) return false;
    // Una escala ya bajada solo admite extensiones por sus extremos, nunca huecos internos.
    const rango = (v) => rangoNumericoCarta(v);
    const existentes = escalaCartas.map(obtenerDetallesCarta).filter(d => !d.esJoker).map(d => rango(d.valor));
    const agregadas = cartasNuevas.map(obtenerDetallesCarta).filter(d => !d.esJoker).map(d => rango(d.valor));
    if (existentes.length && agregadas.length) {
        const lo = Math.min(...existentes), hi = Math.max(...existentes);
        if (agregadas.some(r => r >= lo && r <= hi)) return false;
        const todosLosRangos = [...existentes, ...agregadas];
        if (new Set(todosLosRangos).size !== todosLosRangos.length) return false;
        const ordenados = [...todosLosRangos].sort((a,b)=>a-b);
        if (ordenados.some((r,i)=>i>0 && r !== ordenados[i-1]+1)) return false;
    }
    return esSecuenciaValidaCompleta(todas);
};

const colorDePalo = (palo) => (palo === 'cup' || palo === 'coin' ? 'rojo' : 'negro');

// Genera candidatas reales para los bots: escalas normales y las tres escalas especiales.
const generarCandidatosEscalaBot = (mano, tipoEspecial = null) => {
    const candidatos = [];
    const valores = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
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

const obtenerOrdenVisualJugadores = (turnoActual, totalJugadores) => {
    const orden = [];
    for (let i = 0; i < totalJugadores; i++) {
        orden.push((turnoActual + i) % totalJugadores);
    }
    return orden;
};

function LocalGame({ vsBot = false }) {
    const [numJugadores, setNumJugadores] = useState(2);
    const [rondaIndex, setRondaIndex] = useState(0);
    const [especialElegido, setEspecialElegido] = useState(null);

    const [mazo, setMazo] = useState([]);
    const [descarte, setDescarte] = useState([]);
    const [manosJugadores, setManosJugadores] = useState([]);
    const [turno, setTurno] = useState(0);
    const [haRobado, setHaRobado] = useState(false);
    const [juegoIniciado, setJuegoIniciado] = useState(false);

    const [jugadoresBajados, setJugadoresBajados] = useState([]);
    const [juegosEnMesa, setJuegosEnMesa] = useState([]);
    const [cartasSeleccionadas, setCartasSeleccionadas] = useState([]);
    const [gruposParaBajar, setGruposParaBajar] = useState([]);

    const [puntuaciones, setPuntuaciones] = useState([]);
    const [ganadorRonda, setGanadorRonda] = useState(null);
    const [puntosUltimaRonda, setPuntosUltimaRonda] = useState([]);
    const [juegoTerminado, setJuegoTerminado] = useState(false);

    const [manoOculta, setManoOculta] = useState(false);
    const [mostrarPuntajes, setMostrarPuntajes] = useState(false);
    const [seBajoEnEsteTurno, setSeBajoEnEsteTurno] = useState(false);

    // Estados para Drag & Drop (Arrastrar cartas)
    const [cartaArrastradaIndex, setCartaArrastradaIndex] = useState(null);
    const [botPending, setBotPending] = useState(false);

    const contratoActual = CONTRATOS[rondaIndex];

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

    const toggleSeleccionCarta = (indexCarta) => {
        if (manoOculta || botPending) return;
        if (cartasSeleccionadas.includes(indexCarta)) {
            setCartasSeleccionadas(cartasSeleccionadas.filter(i => i !== indexCarta));
        } else {
            setCartasSeleccionadas([...cartasSeleccionadas, indexCarta]);
        }
    };

    // Funciones de ordenamiento separadas
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
    const handleDragStart = (e, index) => {
        setCartaArrastradaIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (cartaArrastradaIndex === null || cartaArrastradaIndex === targetIndex) return;

        const manoActual = [...manosJugadores[turno]];
        const [cartaMovida] = manoActual.splice(cartaArrastradaIndex, 1);
        manoActual.splice(targetIndex, 0, cartaMovida);

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual;
        setManosJugadores(nuevasManos);
        setCartaArrastradaIndex(null);
        setCartasSeleccionadas([]);
    };

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

    const cancelarGruposParaBajar = () => {
        if (gruposParaBajar.length === 0) return;
        const cartasDevueltas = gruposParaBajar.flatMap(g => g.cartas);
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], ...cartasDevueltas];
        setManosJugadores(nuevasManos);
        setGruposParaBajar([]);
    };

    const validarContratoCumplido = () => {
        if (contratoActual.esEspecial) return gruposParaBajar.length > 0;
        const triosActuales = gruposParaBajar.filter(g => g.tipo === "Trío").length;
        const escalasActuales = gruposParaBajar.filter(g => g.tipo === "Escala").length;
        return triosActuales === contratoActual.triosReq && escalasActuales === contratoActual.escalasReq;
    };

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
    };

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
    };

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
            const topDetails = top ? obtenerDetallesCarta(top) : null;
            const rankCount = topDetails && !topDetails.esJoker
                ? botHand.filter(c => obtenerDetallesCarta(c).valor === topDetails.valor).length : 0;
            const sequenceHelp = topDetails && !topDetails.esJoker
                ? botHand.some(c => {
                    const d = obtenerDetallesCarta(c);
                    if (d.esJoker || d.palo !== topDetails.palo) return false;
                    const a = ORDEN_ESCALA.indexOf(d.valor);
                    const b = ORDEN_ESCALA.indexOf(topDetails.valor);
                    return a >= 0 && b >= 0 && Math.abs(a - b) <= 2;
                }) : false;
            const specialRankHelp = contratoActual.esEspecial && topDetails && !topDetails.esJoker &&
                !botHand.some(c => { const d = obtenerDetallesCarta(c); return !d.esJoker && d.valor === topDetails.valor; });
            const takeDiscard = pile.length > 0 && (rankCount >= 1 || sequenceHelp || topDetails?.esJoker || specialRankHelp);

            if (takeDiscard) {
                botHand.push(pile.pop());
            } else {
                const recycled = verificarYReciclarMazo(stock, pile);
                stock = [...recycled.mazo];
                pile = [...recycled.descarte];
                if (stock.length > 0) botHand.push(stock.shift());
                else if (pile.length > 0) botHand.push(pile.pop());
            }

            const tipoEspecialBot = contratoActual.esEspecial ? (especialElegido?.id || 'loca') : null;

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
                const search = (from, trios, scales, used, groups) => {
                    if (chosen) return;
                    if (contratoActual.esEspecial ? groups.length > 0 : trios === needTrio && scales === needScale) {
                        chosen = groups;
                        return;
                    }
                    for (let i = from; i < candidates.length; i++) {
                        const g = candidates[i];
                        if (g.indices.some(index => used.has(index))) continue;
                        if (g.tipo === 'Trío' && (contratoActual.esEspecial || trios < needTrio)) {
                            const next = new Set(used); g.indices.forEach(x => next.add(x));
                            search(i + 1, trios + 1, scales, next, [...groups, g]);
                        }
                        if (g.tipo === 'Escala' && (contratoActual.esEspecial || scales < needScale)) {
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
                let lowest = Infinity;
                botHand.forEach((card, i) => {
                    const d = obtenerDetallesCarta(card);
                    let utility = 0;
                    if (d.esJoker) utility += 100;
                    else {
                        const iguales = botHand.filter((other, j) => j !== i && obtenerDetallesCarta(other).valor === d.valor).length;
                        if (contratoActual.esEspecial) {
                            // Las escalas especiales requieren un ejemplar de cada rango.
                            utility += iguales === 0 ? 24 : -8;
                            if (tipoEspecialBot === 'real') {
                                const conteoPalos = botHand.map(c => obtenerDetallesCarta(c)).filter(x => !x.esJoker)
                                    .reduce((acc, x) => (acc[x.palo] = (acc[x.palo] || 0) + 1, acc), {});
                                utility += (conteoPalos[d.palo] || 0) * 3;
                            } else if (tipoEspecialBot === 'primavera') {
                                const vecinos = botHand.filter((other,j) => j !== i).map(obtenerDetallesCarta).filter(x => !x.esJoker &&
                                    Math.abs(rangoNumericoCarta(x.valor) - rangoNumericoCarta(d.valor)) === 1);
                                utility += vecinos.filter(x => colorDePalo(x.palo) !== colorDePalo(d.palo)).length * 5;
                            }
                        } else {
                            utility += iguales * 8;
                            utility += botHand.filter((other, j) => {
                                if (j === i) return false;
                                const od = obtenerDetallesCarta(other);
                                return !od.esJoker && od.palo === d.palo &&
                                    Math.abs(rangoNumericoCarta(od.valor) - rangoNumericoCarta(d.valor)) <= 2;
                            }).length * 4;
                        }
                        utility -= calcularValorCarta(card) * 0.05;
                    }
                    if (utility < lowest) { lowest = utility; discardIndex = i; }
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

    const avanzarSiguienteRonda = () => {
        if (rondaIndex < CONTRATOS.length - 1) {
            setRondaIndex(rondaIndex + 1);
            setEspecialElegido(null);
            setJuegoIniciado(false);
            setGanadorRonda(null);
        }
    };

    const terminarJuego = () => {
        setJuegoTerminado(true);
        setGanadorRonda(null);
    };

    const ordenJugadores = obtenerOrdenVisualJugadores(turno, numJugadores);
    const oponentes = ordenJugadores.slice(1);
    const cumpleContrato = validarContratoCumplido();
    const puedeAcoplarGlobal = haRobado && jugadoresBajados[turno] && cartasSeleccionadas.length > 0 && !seBajoEnEsteTurno;

    return (
        <div className="mesa-container">
            <div className="hud-top">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <strong style={{ fontSize: "1.2rem", color: "#d4af37" }}>♠ CARIOCAS</strong>
                    <span className="contrato-badge">
                        Ronda {contratoActual.id}: {contratoActual.esEspecial && especialElegido ? especialElegido.nombre : contratoActual.nombre}
                    </span>
                </div>

                {juegoIniciado && (
                    <div style={{ fontSize: "0.95rem" }}>
                        {botPending ? <span style={{ color: "#ffd700", fontWeight: "bold" }}>🤖 Bot {turno} está jugando...</span> : !haRobado ? (
                            <span style={{ color: "#ffd700", fontWeight: "bold" }}>
                                {vsBot ? '👉 Tu turno: roba una carta del Mazo o del Pozo' : `👉 Jugador ${turno + 1}: Roba una carta del Mazo o del Pozo`}
                            </span>
                        ) : (
                            <span style={{ color: "#81c784", fontWeight: "bold" }}>
                                ✨ {vsBot ? "Tu turno" : `Jugador ${turno + 1}`}: {jugadoresBajados[turno] ? (seBajoEnEsteTurno ? "Descarta una carta para terminar tu turno" : "Selecciona carta(s) para acoplar o descarta") : "Arma tu contrato o descarta"}
                            </span>
                        )}
                    </div>
                )}

                <button className="btn-hud" onClick={() => setMostrarPuntajes(!mostrarPuntajes)}>
                    📊 Puntajes
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
                            <>
                                <h1 style={{ color: "#d4af37" }}>🏆 ¡Partida Finalizada!</h1>
                                <p>Resultados finales tras las rondas jugadas:</p>
                                {puntuaciones.map((pts, idx) => (
                                    <p key={idx}><strong>{vsBot ? (idx === 0 ? "Tú" : `Bot ${idx}`) : `Jugador ${idx + 1}`}:</strong> {pts} puntos</p>
                                ))}
                                <button className="btn-accion btn-dorado" onClick={() => { setRondaIndex(0); setPuntuaciones([]); setJuegoTerminado(false); }}>
                                    Nueva Partida
                                </button>
                            </>
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
                                        {vsBot ? (idxOp === 0 ? "Tú" : `Bot ${idxOp}`) : `Jugador ${idxOp + 1}`} {jugadoresBajados[idxOp] ? "✅ Bajado" : ""}
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
                                    {cumpleContrato ? "✅ Contrato cumplido" : `⚠️ Faltan grupos (Req: ${contratoActual.triosReq} Tríos, ${contratoActual.escalasReq} Escalas)`}
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
                                ♠ Ordenar Palo
                            </button>
                            <button className="btn-hud" disabled={botPending} onClick={ordenarManoPorValor}>
                                🔢 Ordenar Valor
                            </button>

                            {!vsBot && <button className="btn-hud" onClick={() => setManoOculta(!manoOculta)}>
                                {manoOculta ? "👁 Mostrar Mano" : "🙈 Ocultar Mano"}
                            </button>}

                            {haRobado && !jugadoresBajados[turno] && (
                                <>
                                    <button
                                        className="btn-accion btn-azul"
                                        onClick={() => armarGrupoParaBajar("Trío")}
                                        disabled={cartasSeleccionadas.length < 3}
                                    >
                                        Armar Trío ({cartasSeleccionadas.length})
                                    </button>

                                    {(contratoActual.escalasReq > 0 || contratoActual.esEspecial) && (
                                        <button
                                            className="btn-accion btn-azul"
                                            onClick={() => armarGrupoParaBajar("Escala")}
                                            disabled={cartasSeleccionadas.length !== 4}
                                        >
                                            Armar Escala (4)
                                        </button>
                                    )}

                                    {gruposParaBajar.length > 0 && (
                                        <>
                                            <button 
                                                className="btn-accion btn-verde" 
                                                onClick={confirmarBajada}
                                                disabled={!cumpleContrato}
                                            >
                                                ✅ Confirmar Bajada
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
                                    🗑️ Descartar Carta Seleccionada
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
                                            className={`carta-mano-wrapper ${estaSeleccionada ? "carta-seleccionada" : ""}`}
                                            draggable={!manoOculta}
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
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
                        <h2 style={{ color: "#d4af37", marginTop: 0 }}>🎉 ¡Ronda Cerrada!</h2>
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
                                        Siguiente Contrato ➔
                                    </button>
                                    <button className="btn-accion btn-rojo" onClick={terminarJuego}>
                                        Terminar Juego 🏁
                                    </button>
                                </>
                            ) : (
                                <button className="btn-accion btn-dorado" onClick={terminarJuego}>
                                    Ver Podio Final 🏆
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

function MainMenu({ onSelect }) {
    return (
        <main className="main-menu">
            <div className="main-menu-content">
                <p className="main-menu-kicker">UN JUEGO DE ESTRATEGIA Y CARTAS</p>
                <h1>CARIOCAS</h1>
                <p className="main-menu-subtitle">¿Cómo quieres jugar hoy?</p>
                <div className="main-menu-options">
                    <button className="main-menu-option" onClick={() => onSelect('local')}>
                        <span className="main-menu-icon">♠</span>
                        <strong>Multijugador local</strong>
                        <small>Comparte el computador y juega por turnos</small>
                    </button>
                    <button className="main-menu-option" onClick={() => onSelect('bot')}>
                        <span className="main-menu-icon">🤖</span>
                        <strong>Contra el bot</strong>
                        <small>Enfréntate a la inteligencia artificial</small>
                    </button>
                    <button className="main-menu-option main-menu-online" onClick={() => onSelect('online')}>
                        <span className="main-menu-icon">🌐</span>
                        <strong>Multijugador online</strong>
                        <small>Crea una sala pública o privada, o únete a tus amigos</small>
                    </button>
                </div>
            </div>
        </main>
    );
}

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
                <LocalGame />
            </div>}
            {section === 'bot' && <div className="app-game-shell"><button className="btn-accion btn-verde app-back-menu" onClick={goBack}>← Menú principal</button><LocalGame vsBot /></div>}
            {section === 'online' && <OnlineGame initialMode="online" onBack={goBack} />}
        </>
    );
}
