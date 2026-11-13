import React, { useState } from 'react';

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
    { id: 1, nombre: "2 Tríos" },
    { id: 2, nombre: "1 Trío y 1 Escala" },
    { id: 3, nombre: "2 Escalas" },
    { id: 4, nombre: "3 Tríos" },
    { id: 5, nombre: "2 Tríos y 1 Escala" },
    { id: 6, nombre: "1 Trío y 2 Escalas" },
    { id: 7, nombre: "3 Escalas" },
    { id: 8, nombre: "4 Tríos" },
    { id: 9, nombre: "Rondas Especiales", esEspecial: true }
];

const ESPECIALES = [
    { id: "loca", nombre: "Escala Loca (Sucia)" },
    { id: "primavera", nombre: "Primavera" },
    { id: "real", nombre: "Escala Real (Limpia)" }
];

const calcularValorCarta = (carta) => {
    if (carta.includes("JOKER")) return 30;
    if (carta.startsWith("A_")) return 20;
    if (carta.startsWith("J_") || carta.startsWith("Q_") || carta.startsWith("K_")) return 10;
    
    const partes = carta.split("_");
    const valorNum = parseInt(partes[0]);
    return isNaN(valorNum) ? 10 : valorNum;
};

// Convierte el identificador interno de cada carta en el nombre de su PNG.
const obtenerRutaImagen = (carta) => {
    // Comodines
    if (carta === "JOKER") return "/images/JOKER.png";
    if (carta === "JOKER_2") return "/images/JOKER1.png";

    // Identifica valor, palo y si pertenece a la segunda baraja.
    const coincidencia = carta.match(
        /^(A|[2-9]|10|J|Q|K)_(sword|cup|coin|club)(1?)$/
    );

    if (!coincidencia) {
        console.warn("Carta no reconocida:", carta);
        return "/images/card-error.png";
    }

    const [, valor, palo, duplicado] = coincidencia;

    // Los archivos PNG usan los nombres de los palos en plural.
    const palos = {
        sword: "sword",
        cup: "cups",
        coin: "coins",
        club: "clubs"
    };

    return `/images/${valor}_${palos[palo]}${duplicado}.png`;
};

export default function App() {
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

    const contratoActual = CONTRATOS[rondaIndex];

    const iniciarPartida = () => {
        const lista = [...baraja1, ...baraja2, "JOKER", "JOKER_2"];

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
        setTurno(1 % numJugadores);
        setHaRobado(false);
        setJugadoresBajados(new Array(numJugadores).fill(false));
        setJuegosEnMesa([]);
        setCartasSeleccionadas([]);
        setGruposParaBajar([]);
        setGanadorRonda(null);
        setPuntosUltimaRonda([]);
        setJuegoIniciado(true);
    };

    const robarMazo = () => {
        if (haRobado || mazo.length === 0 || ganadorRonda !== null) return;
        const copiaMazo = [...mazo];
        const carta = copiaMazo.shift();

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], carta];

        setMazo(copiaMazo);
        setManosJugadores(nuevasManos);
        setHaRobado(true);
    };

    const robarDescarte = () => {
        if (haRobado || descarte.length === 0 || ganadorRonda !== null) return;
        const copiaDescarte = [...descarte];
        const carta = copiaDescarte.pop();

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = [...nuevasManos[turno], carta];

        setDescarte(copiaDescarte);
        setManosJugadores(nuevasManos);
        setHaRobado(true);
    };

    const toggleSeleccionCarta = (indexCarta) => {
        if (!haRobado) return;
        if (cartasSeleccionadas.includes(indexCarta)) {
            setCartasSeleccionadas(cartasSeleccionadas.filter(i => i !== indexCarta));
        } else {
            setCartasSeleccionadas([...cartasSeleccionadas, indexCarta]);
        }
    };

    const armarGrupoParaBajar = (tipo) => {
        if (cartasSeleccionadas.length === 0) return;
        
        const manoActual = manosJugadores[turno];
        const cartasGrupo = cartasSeleccionadas.map(idx => manoActual[idx]);

        setGruposParaBajar([...gruposParaBajar, { tipo, cartas: cartasGrupo }]);
        
        const nuevaMano = manoActual.filter((_, idx) => !cartasSeleccionadas.includes(idx));
        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = nuevaMano;

        setManosJugadores(nuevasManos);
        setCartasSeleccionadas([]);
    };

    const confirmarBajada = () => {
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
        setGruposParaBajar([]);
    };

    const acoplarCartaAJuego = (juegoId, indexCartaMano) => {
        if (!haRobado || !jugadoresBajados[turno]) return;

        const manoActual = [...manosJugadores[turno]];
        const [cartaAcoplada] = manoActual.splice(indexCartaMano, 1);

        const nuevosJuegos = juegosEnMesa.map(juego => {
            if (juego.id === juegoId) {
                return { ...juego, cartas: [...juego.cartas, cartaAcoplada] };
            }
            return juego;
        });

        const nuevasManos = [...manosJugadores];
        nuevasManos[turno] = manoActual;

        setManosJugadores(nuevasManos);
        setJuegosEnMesa(nuevosJuegos);
        setCartasSeleccionadas([]);
    };

    const descartarCarta = (indexCarta) => {
        if (!haRobado) return;

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
            setTurno((turno + 1) % numJugadores);
            setHaRobado(false);
        }
    };

    const avanzarSiguienteRonda = () => {
        if (rondaIndex < CONTRATOS.length - 1) {
            setRondaIndex(rondaIndex + 1);
            setEspecialElegido(null);
            setJuegoIniciado(false);
        } else {
            setJuegoTerminado(true);
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h1>Cariocas - Partida Multijugador</h1>

            <div style={{ background: "#eef", padding: "10px", borderRadius: "5px", marginBottom: "20px" }}>
                <h3>📊 Tabla de Puntajes Acumulados</h3>
                <div style={{ display: "flex", gap: "15px" }}>
                    {puntuaciones.map((puntos, idx) => (
                        <div key={idx} style={{ border: "1px solid #999", padding: "8px", background: "#fff", borderRadius: "4px" }}>
                            <strong>Jugador {idx + 1}:</strong> {puntos} pts
                        </div>
                    ))}
                </div>
            </div>

            {!juegoIniciado ? (
                <div>
                    {juegoTerminado ? (
                        <div>
                            <h2>🏆 ¡Juego Terminado!</h2>
                            <p>Se completaron todos los contratos de las Cariocas.</p>
                        </div>
                    ) : (
                        <div>
                            <h2>Ronda {contratoActual.id}: {contratoActual.nombre}</h2>

                            {contratoActual.esEspecial && (
                                <div style={{ margin: "10px 0" }}>
                                    <p><strong>Elige la modalidad especial (13 cartas):</strong></p>
                                    {ESPECIALES.map((esp) => (
                                        <button
                                            key={esp.id}
                                            onClick={() => setEspecialElegido(esp)}
                                            style={{
                                                marginRight: "8px",
                                                padding: "6px 10px",
                                                border: especialElegido?.id === esp.id ? "2px solid blue" : "1px solid #ccc"
                                            }}
                                        >
                                            {esp.nombre}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div style={{ margin: "15px 0" }}>
                                <label>
                                    Cantidad de jugadores:
                                    <select 
                                        value={numJugadores} 
                                        onChange={(e) => setNumJugadores(Number(e.target.value))}
                                        style={{ marginLeft: "10px", padding: "4px" }}
                                    >
                                        <option value={2}>2 Jugadores</option>
                                        <option value={3}>3 Jugadores</option>
                                        <option value={4}>4 Jugadores</option>
                                    </select>
                                </label>
                            </div>

                            <button 
                                onClick={iniciarPartida} 
                                disabled={contratoActual.esEspecial && !especialElegido}
                                style={{ padding: "8px 16px", cursor: "pointer" }}
                            >
                                Mezclar y Repartir
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <h2>
                        Ronda {contratoActual.id}: {contratoActual.esEspecial ? especialElegido?.nombre : contratoActual.nombre}
                    </h2>
                    
                    {ganadorRonda !== null ? (
                        <div style={{ padding: "15px", background: "#d4edda", borderRadius: "5px", marginBottom: "15px" }}>
                            <h3>🎉 ¡El Jugador {ganadorRonda + 1} cerró la ronda y ganó 0 puntos!</h3>
                            <p><strong>Puntos sumados a los demás esta ronda:</strong></p>
                            <ul>
                                {puntosUltimaRonda.map((pts, i) => (
                                    <li key={i}>Jugador {i + 1}: +{pts} puntos</li>
                                ))}
                            </ul>
                            <button onClick={avanzarSiguienteRonda} style={{ padding: "8px 16px", background: "green", color: "#fff", cursor: "pointer" }}>
                                {rondaIndex < CONTRATOS.length - 1 ? "Avanzar al Siguiente Contrato" : "Ver Resultados Finales"}
                            </button>
                        </div>
                    ) : (
                        <p style={{ color: "darkblue", fontWeight: "bold" }}>
                            Turno del Jugador {turno + 1} {jugadoresBajados[turno] ? "(Ya bajado)" : "(En mano)"}
                        </p>
                    )}

                    <p>
                        <strong>Cartas en Mazo:</strong> {mazo.length} | <strong>Pozo de Descarte:</strong>{" "}
                        {descarte.length > 0 && (
                            <img 
                                src={obtenerRutaImagen(descarte[descarte.length - 1])} 
                                alt={descarte[descarte.length - 1]} 
                                style={{ width: "50px", height: "70px", verticalAlign: "middle", marginLeft: "5px", borderRadius: "4px" }} 
                            />
                        )}
                    </p>

                    <div style={{ marginBottom: "15px" }}>
                        <button onClick={robarMazo} disabled={haRobado || ganadorRonda !== null} style={{ marginRight: "10px", padding: "6px 12px" }}>
                            Robar del Mazo
                        </button>
                        <button onClick={robarDescarte} disabled={haRobado || descarte.length === 0 || ganadorRonda !== null} style={{ padding: "6px 12px" }}>
                            Robar del Descarte
                        </button>
                    </div>

                    <div style={{ background: "#f5f5f5", padding: "10px", borderRadius: "5px", marginBottom: "15px" }}>
                        <h3>Mesa / Juegos Bajados</h3>
                        {juegosEnMesa.length === 0 ? (
                            <p>No hay juegos bajados en la mesa todavía.</p>
                        ) : (
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {juegosEnMesa.map(juego => (
                                    <div key={juego.id} style={{ border: "1px solid #666", background: "#fff", padding: "8px", borderRadius: "4px" }}>
                                        <small>Jugador {juego.jugadorId + 1} - {juego.tipo}</small>
                                        <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                                            {juego.cartas.map((c, i) => (
                                                <img 
                                                    key={i} 
                                                    src={obtenerRutaImagen(c)} 
                                                    alt={c} 
                                                    style={{ width: "45px", height: "65px", borderRadius: "3px", border: "1px solid #ccc" }} 
                                                />
                                            ))}
                                        </div>
                                        {haRobado && jugadoresBajados[turno] && cartasSeleccionadas.length === 1 && (
                                            <button 
                                                onClick={() => acoplarCartaAJuego(juego.id, cartasSeleccionadas[0])}
                                                style={{ marginTop: "6px", fontSize: "11px", display: "block" }}
                                            >
                                                Botar carta seleccionada aquí
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {haRobado && !jugadoresBajados[turno] && (
                        <div style={{ border: "1px dashed green", padding: "10px", marginBottom: "15px" }}>
                            <h4>Acciones para bajarte en este turno</h4>
                            <button onClick={() => armarGrupoParaBajar("Trío")} disabled={cartasSeleccionadas.length === 0} style={{ marginRight: "8px" }}>
                                Armar Trío con seleccionadas
                            </button>
                            <button onClick={() => armarGrupoParaBajar("Escala")} disabled={cartasSeleccionadas.length === 0} style={{ marginRight: "8px" }}>
                                Armar Escala con seleccionadas
                            </button>
                            {gruposParaBajar.length > 0 && (
                                <button onClick={confirmarBajada} style={{ background: "lightgreen" }}>
                                    Confirmar Bajada a la Mesa
                                </button>
                            )}
                            <div style={{ marginTop: "8px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {gruposParaBajar.map((g, idx) => (
                                    <div key={idx} style={{ border: "1px solid #ccc", padding: "4px", background: "#fff" }}>
                                        <small>{g.tipo}</small>
                                        <div style={{ display: "flex", gap: "2px" }}>
                                            {g.cartas.map((c, i) => (
                                                <img key={i} src={obtenerRutaImagen(c)} alt={c} style={{ width: "35px", height: "50px" }} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <hr />

                    <h3>Manos de los jugadores</h3>
                    {manosJugadores.map((mano, idxJugador) => (
                        <div 
                            key={idxJugador} 
                            style={{ 
                                border: idxJugador === turno ? "2px solid green" : "1px solid #ccc", 
                                padding: "10px", 
                                marginBottom: "10px",
                                borderRadius: "5px",
                                background: idxJugador === turno ? "#f9fff9" : "#fff"
                            }}
                        >
                            <h4>
                                Jugador {idxJugador + 1} ({mano.length} cartas) {jugadoresBajados[idxJugador] && "✅ Bajado"}
                            </h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {mano.map((carta, index) => {
                                    const estaSeleccionada = cartasSeleccionadas.includes(index) && idxJugador === turno;
                                    return (
                                        <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                                            <img 
                                                src={obtenerRutaImagen(carta)} 
                                                alt={carta}
                                                onClick={() => idxJugador === turno && haRobado && toggleSeleccionCarta(index)}
                                                style={{ 
                                                    width: "60px", 
                                                    height: "85px", 
                                                    cursor: idxJugador === turno && haRobado ? "pointer" : "default",
                                                    borderRadius: "5px",
                                                    border: estaSeleccionada ? "3px solid #ffcc00" : "1px solid #aaa",
                                                    transform: estaSeleccionada ? "translateY(-8px)" : "none",
                                                    transition: "transform 0.1s ease"
                                                }}
                                            />
                                            {idxJugador === turno && haRobado && (
                                                <button 
                                                    onClick={() => descartarCarta(index)}
                                                    style={{ fontSize: "10px", background: "#ffcccc", cursor: "pointer", padding: "2px 4px" }}
                                                >
                                                    Tirar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}