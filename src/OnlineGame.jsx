// Cliente del modo online: autenticación, salas, sincronización y acciones de juego.
import React, { useEffect, useMemo, useState } from 'react';
import './OnlineGame.css';

// La URL puede cambiar por entorno sin modificar los componentes.
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS = API.replace(/^http/, 'ws');
// Traduce el identificador de contrato del servidor a los grupos que debe preparar la interfaz.
const contractKinds = {
  1:['trio','trio'], 2:['trio','normal'], 3:['normal','normal'],
  4:['trio','trio','trio'], 5:['trio','trio','normal'],
  6:['trio','normal','normal'], 7:['normal','normal','normal'],
  8:['trio','trio','trio','trio'], 9:['loca'], 10:['primavera'], 11:['real']
};
const groupSize = k => k === 'trio' ? 3 : (k === 'normal' ? 4 : 13);
const cardImage = code => {
  if (!code) return '/images/reversoCarta.png';
  if (code.startsWith('JOKER')) return code === 'JOKER' || code === 'JOKER_1' ? '/images/JOKER.png' : '/images/JOKER1.png';
  return `/images/${code.replace('_cup','_cups').replace('_coin','_coins').replace('_club','_clubs')}.png`;
};

// Muestra la clasificación final del servidor, ordenada de menor a mayor puntuación.
// En Cariocas el ganador es quien acumula menos puntos de penalización.
function OnlinePodium({ players, onBack }) {
  const ranking = [...(players || [])].sort((a, b) => a.score - b.score || a.seat - b.seat);
  const winner = ranking[0];

  return (
    <section className="online-final-results">
      <p className="podio-eyebrow">PARTIDA FINALIZADA</p>
      <h2>Resultados finales</h2>
      {winner && <p className="podio-ganador">Ganador: <strong>{winner.name}</strong></p>}
      <div className="podio-columnas">
        {ranking.slice(0, 3).map((player, index) => (
          <article className={`podio-lugar podio-lugar-${index + 1}`} key={player.player_id}>
            <span className="podio-posicion">{index + 1}° lugar</span>
            <strong>{player.name}</strong>
            <span>{player.score} puntos</span>
          </article>
        ))}
      </div>
      <div className="podio-tabla">
        <h3>Tabla completa</h3>
        {ranking.map((player, index) => (
          <div className="podio-fila" key={player.player_id}>
            <span>{index + 1}. {player.name}</span>
            <strong>{player.score} pts</strong>
          </div>
        ))}
      </div>
      <button className="online-primary" onClick={onBack}>Volver al menú principal</button>
    </section>
  );
}

export default function OnlineGame({ onBack, onAuthenticated, initialMode = 'online' }) {
  // Credenciales y sesión persistida del usuario actual.
  const [token,setToken] = useState(localStorage.getItem('cariocas_token') || '');
  const [username,setUsername] = useState(localStorage.getItem('cariocas_user') || '');
  const [user,setUser] = useState('');
  const [password,setPassword] = useState('');
  // Sala seleccionada y estado sincronizado que devuelve el servidor.
  const [roomCode,setRoomCode] = useState('');
  const [room,setRoom] = useState('');
  const [mode,setMode] = useState(initialMode);
  const [specialChoice,setSpecialChoice] = useState('loca');
  const [state,setState] = useState(null);
  // Cartas elegidas y grupos preparados para bajar el contrato de esta ronda.
  const [selected,setSelected] = useState([]);
  const [groups,setGroups] = useState([]);
  const [meldTarget,setMeldTarget] = useState(0);
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [historyRows,setHistoryRows] = useState([]);
  const [statsData,setStatsData] = useState(null);
  const [authView,setAuthView] = useState('login');
  const [visibility,setVisibility] = useState('private');
  const [publicRooms,setPublicRooms] = useState([]);
  const [showScores,setShowScores] = useState(false);

  // Encabezados autenticados memoizados para reutilizar el token sin reconstruirlos en cada render.
  const authHeaders = useMemo(() => ({
    'Content-Type':'application/json',
    ...(token ? {Authorization:`Token ${token}`} : {})
  }),[token]);

  // Centraliza las peticiones HTTP, agrega la autenticación y normaliza los errores de API.
  const request = async (path, options={}) => {
    const publicEndpoint = path.startsWith('auth/');
    const response = await fetch(`${API}/api/${path}`, {
      ...options,
      headers:{...(publicEndpoint ? {'Content-Type':'application/json'} : authHeaders),...(options.headers||{})}
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) {
      const detail = data.detail || Object.entries(data).map(([key,value]) =>
        `${key}: ${Array.isArray(value) ? value.join(' ') : value}`
      ).join(' ') || 'No se pudo completar la operación.';
      throw new Error(detail);
    }
    return data;
  };
  // Valida la sesión almacenada y limpia credenciales vencidas.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`${API}/api/auth/me/`, {headers:{Authorization:`Token ${token}`}})
      .then(async response => {
        if (!response.ok) throw new Error('La sesión guardada ya no es válida.');
        return response.json();
      })
      .then(data => { if (!cancelled && data.username) { setUsername(data.username); onAuthenticated?.(); } })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('cariocas_token');
        localStorage.removeItem('cariocas_user');
        setToken('');
        setUsername('');
        setMessage('Tu sesión anterior no era válida. Puedes iniciar sesión o entrar como invitado.');
      });
    return () => { cancelled = true; };
  }, [token, onAuthenticated]);

  // Guarda token y nombre recibidos del servidor y notifica al componente raíz.
  const acceptAuth = data => {
    setToken(data.token); setUsername(data.username);
    localStorage.setItem('cariocas_token',data.token);
    localStorage.setItem('cariocas_user',data.username);
    setMessage(`Sesión iniciada como ${data.username}`);
    onAuthenticated?.();
  };
  // Ejecuta inicio de sesión, registro o acceso temporal como invitado.
  const auth = async kind => {
    setBusy(true); setMessage('');
    try {
      const path = kind === 'guest' ? 'auth/guest/' : `auth/${kind}/`;
      const body = kind === 'guest' ? {} : {username:user,password};
      acceptAuth(await request(path,{method:'POST',body:JSON.stringify(body)}));
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  // Recupera el estado actual de una sala a la que el usuario ya pertenece.
  const updateRoom = async code => {
    const data=await request(`rooms/${code}/`);
    setRoom(code); setState(data.state); setSelected([]); setGroups([]);
  };
  // Crea una sala online o una sala contra el bot según el modo activo.
  const createRoom = async () => {
    setBusy(true); setMessage('');
    try {
      const data=await request('rooms/',{method:'POST',body:JSON.stringify({mode, is_public: mode === 'online' && visibility === 'public'})});
      if (!data.code || !data.state) throw new Error('El servidor no devolvió los datos de la sala. Revisa las migraciones del backend.');
      setRoom(data.code); setState(data.state); setRoomCode(data.code);
      setMessage(`Sala creada correctamente: ${data.code}. Comparte este código con tus amigos.`);
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  // Se une a una sala privada mediante su código de invitación.
  const joinRoom = async () => {
    setBusy(true); setMessage('');
    try {
      const data=await request(`rooms/${roomCode.toUpperCase()}/join/`,{method:'POST',body:'{}'});
      setRoom(roomCode.toUpperCase()); setState(data.state); setMessage('Te uniste a la sala.');
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  // Consulta salas públicas que todavía aceptan jugadores.
  const loadPublicRooms = async () => {
    try { setPublicRooms(await request('rooms/public/')); }
    catch(e) { setMessage(e.message); }
  };
  // Ingresa a una sala pública desde el listado disponible.
  const joinPublicRoom = async code => {
    setBusy(true);
    try {
      const data = await request(`rooms/${code}/join/`,{method:'POST',body:'{}'});
      setRoom(code); setState(data.state); setMessage('Te uniste a la sala pública.');
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  // Actualiza manualmente el estado de la sala cuando se necesita resincronizar.
  const refresh = async () => {
    if (!room) return;
    try { const data=await request(`rooms/${room}/`); setState(data.state); }
    catch(e) { setMessage(e.message); }
  };
  // Carga salas públicas al entrar al selector online, pero no durante una partida.
  useEffect(() => {
    if (token && initialMode === 'online' && !room) loadPublicRooms();
  }, [token, initialMode, room]);

  // Mantiene la sala sincronizada mediante WebSocket y libera la conexión al salir.
  useEffect(() => {
    if (!token || !room) return undefined;
    let socket, retryTimer, stopped=false, delay=1000;
    const connect=()=>{
      if(stopped) return;
      socket=new WebSocket(`${WS}/ws/rooms/${room}/?token=${token}`);
      socket.onopen=()=>{delay=1000;};
      socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.type==='state')setState(msg.state);};
      socket.onerror=()=>{try{socket.close();}catch{}};
      socket.onclose=()=>{
        if(!stopped){setMessage('Conexión interrumpida. Intentando reconectar…');retryTimer=setTimeout(connect,delay);delay=Math.min(delay*2,10000);}
      };
    };
    connect();
    return ()=>{stopped=true;clearTimeout(retryTimer);if(socket)socket.close();};
  },[token,room]);
  // Envía una acción del jugador al motor del servidor y actualiza el estado recibido.
  const action = async (name,data={}) => {
    setBusy(true); setMessage('');
    try {
      const result=await request(`rooms/${room}/action/`,{
        method:'POST',body:JSON.stringify({action:name,data})
      });
      setState(result.state); setSelected([]); setGroups([]);
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  // Cambia la selección de una carta por su UID, que identifica su copia física.
  const toggle = uid => setSelected(prev=>prev.includes(uid)?prev.filter(x=>x!==uid):[...prev,uid]);
  // Orden visual local de la mano; no modifica cartas ni reglas del servidor.
  const sortHand = mode => {
    if (!state?.hand) return;
    const suitOrder = {sword:0, cup:1, coin:2, club:3};
    const rankOrder = {A:1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, J:11, Q:12, K:13};
    const suit = c => (c.code || '').match(/_(sword|cups?|coins?|clubs?)/)?.[1]?.replace('cups','cup').replace('coins','coin').replace('clubs','club') || '';
    const rank = c => (c.code || '').split('_')[0];
    setState(prev => ({...prev, hand:[...prev.hand].sort((a,b) => {
      const bySuit = (suitOrder[suit(a)] ?? 9) - (suitOrder[suit(b)] ?? 9);
      const byRank = (rankOrder[rank(a)] ?? 99) - (rankOrder[rank(b)] ?? 99);
      return mode === 'suit' ? bySuit || byRank : byRank || bySuit;
    })}));
  };
  const required = contractKinds[state?.contract_id] || [];
  const nextKind = required[groups.length];
  // Guarda localmente el siguiente grupo de cartas que forma parte del contrato online.
  const addGroup = () => {
    if (!nextKind || selected.length!==groupSize(nextKind)) {
      setMessage(`Selecciona ${nextKind ? groupSize(nextKind) : 0} cartas para el siguiente grupo.`); return;
    }
    setGroups(prev=>[...prev,selected]); setSelected([]); setMessage('');
  };
  // Envía todos los grupos preparados para que el servidor valide y baje el contrato.
  const submitContract = () => {
    if (groups.length!==required.length) { setMessage('Debes preparar todos los grupos del contrato.'); return; }
    action('lay_contract',{groups});
  };
  // Solicita al servidor repartir las cartas e iniciar la primera ronda.
  const start = async () => {
    try {
      const data=await request(`rooms/${room}/start/`,{method:'POST',body:'{}'});
      setState(data.state); setMessage('¡Partida iniciada!');
    } catch(e) { setMessage(e.message); }
  };
  // Pide al servidor iniciar el contrato siguiente conservando el marcador acumulado.
  const nextRound = async () => {
    try {
      const data=await request(`rooms/${room}/next-round/`,{method:'POST',body:JSON.stringify({special_choice:specialChoice})});
      setState(data.state);
    } catch(e) { setMessage(e.message); }
  };
  // Solicita al servidor cerrar la partida y devolver el estado final con las puntuaciones.
  const finishGame = async () => {
    setBusy(true);
    setMessage('');
    try {
      const data = await request(`rooms/${room}/finish/`, {method:'POST', body:'{}'});
      setState(data.state);
      setSelected([]);
      setGroups([]);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  // Texto compacto para identificar una carta en la mesa online.
  const cardLabel = c => c.code || (c.joker ? 'Comodín' : `${c.rank}-${c.suit}`);
  const isMyTurn = state && state.current_player === String(JSON.parse(atob(token.split('.')[1]||'e30='))?.user_id || '') ;
  // Server player_id is the authenticated Django user id. Turn permission is also checked server-side.
  const current = state?.players?.find(p=>p.is_turn);
  const myPlayer = state?.players?.find(p=>p.name===username);
  const myTurn = !!(current && myPlayer && current.player_id===myPlayer.player_id);
  const isHost = !!(myPlayer && (myPlayer.is_host || state?.owner_id === myPlayer.player_id));
  const winRate = statsData?.games_played ? Math.round((statsData.games_won / statsData.games_played) * 100) : 0;
  return (
    <main className="online-shell">
      <header className="online-header">
        {initialMode !== 'gate' && <button onClick={onBack} className="online-secondary">← Menú principal</button>}
        <div><h1>{initialMode === 'gate' ? 'CARIOCAS' : 'Cariocas Online'}</h1><small>{username ? `Conectado como ${username}` : initialMode === 'gate' ? 'Un juego de cartas entre amigos' : 'Juega en línea o contra el bot'}</small></div>
        {token && <button className="online-secondary" onClick={()=>{localStorage.removeItem('cariocas_token');localStorage.removeItem('cariocas_user');setToken('');setUsername('');setState(null);setRoom('');}}>Cerrar sesión</button>}
      </header>
      {!token ? (
        <section className="online-panel auth-panel">
          <h2>{initialMode === 'gate' ? 'Bienvenido a Cariocas' : initialMode === 'bot' ? 'Jugar contra el bot' : 'Acceso al multijugador'}</h2>
          <p>{initialMode === 'gate' ? 'Inicia sesión, crea una cuenta o entra como invitado para acceder a todos los modos de juego.' : initialMode === 'bot' ? 'Entra como invitado para comenzar sin crear una cuenta.' : 'Inicia sesión, crea una cuenta o entra como invitado para jugar online.'}</p>
          <div className="auth-tabs">
            <button className={authView==='login'?'auth-tab active':'auth-tab'} onClick={()=>setAuthView('login')}>Iniciar sesión</button>
            <button className={authView==='register'?'auth-tab active':'auth-tab'} onClick={()=>setAuthView('register')}>Crear cuenta</button>
          </div>
          <label>Nombre de usuario<input value={user} onChange={e=>setUser(e.target.value)} placeholder="Tu usuario" autoComplete="username"/></label>
          <label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete={authView==='login'?'current-password':'new-password'}/></label>
          <div className="online-actions auth-buttons">
            <button disabled={busy || !user.trim() || !password} onClick={()=>auth(authView)}>{authView==='login'?'Entrar':'Registrarme'}</button>
            <button className="online-secondary" disabled={busy} onClick={()=>auth('guest')}>Continuar como invitado</button>
          </div>
          <p className="auth-note">Como invitado no necesitas correo ni contraseña. Si pierdes tu sesión, no podrás recuperar esa cuenta temporal.</p>
        </section>
      ) : (
        <>
          {!room && <section className="online-panel">
            {initialMode === 'bot' ? <>
              <h2>Partida contra bot</h2>
              <p>Jugarás contra Cariocas Bot. No necesitas otros jugadores.</p>
              <div className="online-actions"><button disabled={busy} onClick={createRoom}>Comenzar partida</button></div>
            </> : <>
              <h2>Crear una sala online</h2>
              <div className="online-actions">
                <label className="visibility-choice">Tipo de sala
                  <select value={visibility} onChange={e=>setVisibility(e.target.value)}>
                    <option value="private">Privada (con código)</option>
                    <option value="public">Pública (visible en el listado)</option>
                  </select>
                </label>
                <button disabled={busy} onClick={createRoom}>Crear sala {visibility==='private'?'privada':'pública'}</button>
              </div>
              <h2>Unirse a una sala</h2>
            <div className="online-actions">
              <input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} maxLength={6} placeholder="Código de sala"/>
              <button disabled={busy || roomCode.length!==6} onClick={joinRoom}>Unirme con código</button>
            </div>
            <div className="public-rooms">
              <div className="room-title"><h3>Salas públicas disponibles</h3><button className="online-secondary" onClick={loadPublicRooms}>Actualizar lista</button></div>
              {publicRooms.length===0 ? <p className="auth-note">No hay salas públicas esperando jugadores.</p> : publicRooms.map(item=><div className="public-room-row" key={item.code}>
                <span><b>{item.code}</b><small>{item.players}/{item.max_players} jugadores · creada por {item.owner}</small></span>
                <button disabled={busy || item.players>=item.max_players} onClick={()=>joinPublicRoom(item.code)}>Unirme</button>
              </div>)}
            </div>
            <div className="online-actions">
              <button className="online-secondary" onClick={async()=>{try{setHistoryRows(await request('history/'));setMessage('Historial actualizado.')}catch(e){setMessage(e.message)}}}>Consultar historial</button>
              <button className="online-secondary" onClick={async()=>{try{setStatsData(await request('stats/'));setMessage('Estadísticas actualizadas.')}catch(e){setMessage(e.message)}}}>Estadísticas</button>
            </div>
            {statsData && <div className="stats-dashboard">
              <div className="stats-heading"><div><span>RENDIMIENTO</span><h3>Estadísticas de juego</h3></div><strong>{winRate}%<small> victorias</small></strong></div>
              <div className="stats-metrics">
                <article><span>Partidas jugadas</span><b>{statsData.games_played}</b></article>
                <article><span>Partidas ganadas</span><b>{statsData.games_won}</b></article>
                <article><span>Partidas no ganadas</span><b>{Math.max(0, statsData.games_played-statsData.games_won)}</b></article>
                <article><span>Puntos promedio</span><b>{Number(statsData.average_score || 0).toFixed(1)}</b></article>
              </div>
              <div className="stats-progress-label"><span>Porcentaje de victorias</span><b>{winRate}%</b></div>
              <div className="stats-progress"><span style={{width:`${winRate}%`}} /></div>
              <small className="stats-footnote">En Cariocas, una puntuación acumulada menor es mejor.</small>
            </div>}
            {historyRows.length>0 && <div className="history-list"><b>Últimas partidas</b>{historyRows.map(row=><div className="history-line" key={row.code}>
              <span>{row.code} · {row.mode==='bot'?'Contra bot':'Multijugador'} · ronda {row.round_id}</span>
              <small>{row.players?.map(p=>p.name).join(' vs ')}</small>
            </div>)}</div>}
            </>}
          </section>}
          {room && <section className="online-panel online-game-room">
            <div className="room-title"><h2>Sala {room}</h2><button className="online-secondary" onClick={refresh}>Actualizar</button></div>
            {state?.status==='waiting' && <>
              <p>Jugadores: {state.players?.map(p=>`${p.name}${p.is_host?' (anfitrión)':''}${p.is_connected===false?' · desconectado':''}`).join(' · ')}</p>
              <p className="online-lobby-hint">Comparte el código de esta sala para que se unan desde otros computadores. La partida comenzará cuando haya al menos 2 jugadores.</p>
              {state.players?.some(p => p.is_host && p.name === username) && <button disabled={busy || (state.players?.length || 0) < 2} onClick={start}>Iniciar partida</button>}
            </>}
            {state && state.round_id && (state.status === 'finished' ? (
              <OnlinePodium players={state.players} onBack={onBack} />
            ) : state.status === 'round_finished' ? (
              <div className="overlay-modal"><div className="modal-box">
                <h2>Ganó {state.players.find(p=>p.player_id===state.winner)?.name || state.winner}</h2>
                <p>{Object.entries(state.round_points||{}).map(([id,pts])=>`${state.players.find(p=>p.player_id===id)?.name||id}: +${pts} pts`).join(' · ')}</p>
                {state.round_id===8 && isHost && <label>Contrato especial
                  <select value={specialChoice} onChange={e=>setSpecialChoice(e.target.value)}>
                    <option value="loca">Escala loca</option><option value="primavera">Primavera</option><option value="real">Escala real</option>
                  </select>
                </label>}
                {isHost && <button className="btn-accion btn-verde" disabled={busy} onClick={nextRound}>{state.round_id===9?'Finalizar partida':'Siguiente ronda'}</button>}
                {isHost && state.round_id<9 && <button className="btn-accion btn-rojo" disabled={busy} onClick={finishGame}>Terminar partida</button>}
                {!isHost && <p className="online-lobby-hint">Esperando a que el anfitrión inicie la siguiente ronda.</p>}
              </div></div>
            ) : (
              <div className="mesa-container online-mesa">
                <div className="hud-top">
                  <div className="online-hud-left">
                    <button className="btn-hud online-menu-button" onClick={onBack}>← Menú principal</button>
                    <span className="contrato-badge">Ronda {state.round_id}: {state.contract_name}</span>
                  </div>
                  <strong className="online-turn-label">{myTurn ? (state.phase==='draw'?'Tu turno: roba una carta del Mazo o del Pozo':'Tu turno: arma tu contrato o descarta') : `Turno de ${current?.name || 'otro jugador'}`}</strong>
                  <button className="btn-hud" onClick={()=>setShowScores(x=>!x)}>Puntajes</button>
                </div>
                {showScores && <div className="online-score-overlay"><div className="online-score-box">
                  <h3>Puntajes</h3>{state.players.map(p=><p key={p.player_id}>{p.name}: {p.score} pts</p>)}
                  <button className="btn-accion btn-dorado" onClick={()=>setShowScores(false)}>Cerrar</button>
                </div></div>}
                <div className="oponentes-bar">
                  {state.players.filter(p=>p.player_id!==myPlayer?.player_id).map(p=>(
                    <div key={p.player_id} className="oponente-card-box">
                      <strong>{p.name}{p.is_host?' · Anfitrión':''}</strong>
                      <small>{p.is_connected===false?'Desconectado':'Conectado'} · {p.card_count} cartas · {p.score} pts</small>
                      <div className="dorso-mini-stack">{Array.from({length:Math.min(p.card_count||0,8)}).map((_,i)=><img key={i} src="/images/reversoCarta.png" alt="Carta oculta" className="dorso-mini"/>)}</div>
                      {state.table_melds?.filter(m=>m.owner===p.player_id).map((m,i)=>(
                        <div className="grupo-bajado-oponente" key={`${p.player_id}-${i}`}>
                          <small>{m.kind==='trio'?'Trío':m.kind==='normal'?'Escala':m.kind}</small>
                          <div className="grupo-cartas-row">{m.cards.map((c,j)=><img key={j} src={cardImage(c.code)} alt={c.code} className="carta-bajadas-img"/>)}</div>
                          {myTurn&&state.phase==='discard'&&myPlayer?.has_laid&&<button className="btn-accion btn-dorado" disabled={!selected.length||busy} onClick={()=>action('add_cards',{meld_index:state.table_melds.indexOf(m),card_uids:selected})}>+ Acoplar</button>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="zona-central">
                  <div className="mazos-row">
                    <button type="button" className={`pila-carta online-pile ${myTurn&&state.phase==='draw'&&!busy?'pile-ready':''}`} disabled={!myTurn||state.phase!=='draw'||busy} onClick={()=>action('draw',{source:'stock'})} aria-label="Robar una carta del mazo" title="Robar del mazo">
                      <div className="mazo-dorso"><img src="/images/reversoCarta.png" alt="Mazo" className="mazo-reverso-img"/><span className="mazo-contador">{state.stock_count}</span></div>
                    </button>
                    <button type="button" className={`pila-carta online-pile ${myTurn&&state.phase==='draw'&&state.discard?.length&&!busy?'pile-ready':''}`} disabled={!myTurn||state.phase!=='draw'||busy||!state.discard?.length} onClick={()=>action('draw',{source:'discard'})} aria-label="Robar la carta superior del descarte" title="Robar del descarte">
                      <div className="descarte-slot">{state.discard?.length?<img src={cardImage(state.discard[state.discard.length-1].code)} alt="Descarte" className="carta-img"/>:<span>Vacío</span>}</div>
                    </button>
                  </div>
                  <div className="juegos-mesa-grid">
                    {state.table_melds?.filter(m=>m.owner===myPlayer?.player_id).map((m,i)=>(
                      <div className="grupo-bajado" key={i}><small>{m.kind==='trio'?'Trío':m.kind==='normal'?'Escala':m.kind}</small>
                        <div className="grupo-cartas-row">{m.cards.map((c,j)=><img key={j} src={cardImage(c.code)} alt={c.code} className="carta-bajadas-img"/>)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="zona-jugador">
                  {groups.length > 0 && (
                    <div className="online-contract-preview">
                      <span className={groups.length===required.length ? 'contract-ready' : 'contract-pending'}>
                        {groups.length===required.length ? 'Contrato cumplido' : `Grupos preparados: ${groups.length}/${required.length}`}
                      </span>
                      <div className="online-contract-preview-groups">
                        {groups.map((uids,index)=>(
                          <div className="online-contract-preview-group" key={index}>
                            <small>{required[index]==='trio'?'Trío':required[index]==='normal'?'Escala':'Contrato especial'}</small>
                            <div>{uids.map(uid=>{
                              const card=state.hand?.find(c=>c.uid===uid);
                              return card ? <img key={uid} src={cardImage(card.code)} alt={card.code}/> : null;
                            })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="barra-acciones">
                    <button className="btn-hud" disabled={!myTurn||busy} onClick={()=>sortHand('suit')}>Ordenar Palo</button>
                    <button className="btn-hud" disabled={!myTurn||busy} onClick={()=>sortHand('value')}>Ordenar por valor</button>
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&nextKind==='trio'&&(
                      <button className="btn-accion btn-azul" disabled={selected.length!==3||busy} onClick={addGroup}>Armar Trío ({selected.length})</button>
                    )}
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&nextKind==='normal'&&(
                      <button className="btn-accion btn-azul" disabled={selected.length!==4||busy} onClick={addGroup}>Armar Escala (4)</button>
                    )}
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&nextKind==='loca'&&(
                      <button className="btn-accion btn-dorado" disabled={selected.length!==13||busy} onClick={addGroup}>Armar Escala loca (13)</button>
                    )}
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&nextKind==='primavera'&&(
                      <button className="btn-accion btn-dorado" disabled={selected.length!==13||busy} onClick={addGroup}>Armar Primavera (13)</button>
                    )}
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&nextKind==='real'&&(
                      <button className="btn-accion btn-dorado" disabled={selected.length!==13||busy} onClick={addGroup}>Armar Escala real (13)</button>
                    )}
                    {myTurn&&state.phase==='discard'&&!myPlayer?.has_laid&&groups.length>0&&(
                      <>
                        <button className="btn-accion btn-verde" disabled={groups.length!==required.length||busy} onClick={submitContract}>Confirmar bajada</button>
                        <button className="btn-accion btn-rojo" disabled={busy} onClick={()=>{setGroups([]);setSelected([]);}}>Cancelar</button>
                      </>
                    )}
                    {myTurn&&myPlayer?.has_laid&&state.phase==='discard'&&(
                      <>
                        <select className="online-meld-select" value={meldTarget} onChange={e=>setMeldTarget(Number(e.target.value))}>
                          {state.table_melds.map((m,i)=><option key={i} value={i}>{i+1}. {m.kind==='trio'?'Trío':'Escala'}</option>)}
                        </select>
                        <button className="btn-accion btn-dorado" disabled={!selected.length||busy} onClick={()=>action('add_cards',{meld_index:meldTarget,card_uids:selected})}>Acoplar seleccionadas</button>
                      </>
                    )}
                    {myTurn&&state.phase==='discard'&&<button className="btn-accion btn-rojo" disabled={selected.length!==1||busy} onClick={()=>action('discard',{card_uid:selected[0]})}>Descartar carta seleccionada</button>}
                  </div>
                  {myTurn&&state.phase==='discard'&&<small className="online-hand-hint">Clic para seleccionar · doble clic sobre una carta para descartarla directamente</small>}
                  <div className="mano-abanico">{state.hand?.map(c=>(
                    <div key={c.uid} role="button" tabIndex={0} className={`carta-mano-wrapper ${selected.includes(c.uid)?'carta-seleccionada':''}`} onClick={()=>toggle(c.uid)} onDoubleClick={e=>{e.preventDefault();e.stopPropagation();if(myTurn&&state.phase==='discard'&&!busy)action('discard',{card_uid:c.uid});}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(c.uid);}}} title={myTurn&&state.phase==='discard'?'Doble clic para descartar · clic para seleccionar':'Clic para seleccionar carta'}>
                      <img src={cardImage(c.code)} alt={c.code} className="carta-img"/>
                    </div>
                  ))}</div>
                </div>
              </div>
            ))}

          </section>}
        </>
      )}
      {message && <p className="online-message">{message}</p>}
    </main>
  );
}
