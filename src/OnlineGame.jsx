import React, { useEffect, useMemo, useState } from 'react';
import './OnlineGame.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS = API.replace(/^http/, 'ws');
const contractKinds = {
  1:['trio','trio'], 2:['trio','normal'], 3:['normal','normal'],
  4:['trio','trio','trio'], 5:['trio','trio','normal'],
  6:['trio','normal','normal'], 7:['normal','normal','normal'],
  8:['trio','trio','trio','trio'], 9:['loca'], 10:['primavera'], 11:['real']
};
const groupSize = k => k === 'trio' ? 3 : (k === 'normal' ? 4 : 13);

export default function OnlineGame({ onBack, onAuthenticated, initialMode = 'online' }) {
  const [token,setToken] = useState(localStorage.getItem('cariocas_token') || '');
  const [username,setUsername] = useState(localStorage.getItem('cariocas_user') || '');
  const [user,setUser] = useState('');
  const [password,setPassword] = useState('');
  const [roomCode,setRoomCode] = useState('');
  const [room,setRoom] = useState('');
  const [mode,setMode] = useState(initialMode);
  const [specialChoice,setSpecialChoice] = useState('loca');
  const [state,setState] = useState(null);
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

  const authHeaders = useMemo(() => ({
    'Content-Type':'application/json',
    ...(token ? {Authorization:`Token ${token}`} : {})
  }),[token]);

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

  const acceptAuth = data => {
    setToken(data.token); setUsername(data.username);
    localStorage.setItem('cariocas_token',data.token);
    localStorage.setItem('cariocas_user',data.username);
    setMessage(`Sesión iniciada como ${data.username}`);
    onAuthenticated?.();
  };
  const auth = async kind => {
    setBusy(true); setMessage('');
    try {
      const path = kind === 'guest' ? 'auth/guest/' : `auth/${kind}/`;
      const body = kind === 'guest' ? {} : {username:user,password};
      acceptAuth(await request(path,{method:'POST',body:JSON.stringify(body)}));
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  const updateRoom = async code => {
    const data=await request(`rooms/${code}/`);
    setRoom(code); setState(data.state); setSelected([]); setGroups([]);
  };
  const createRoom = async () => {
    setBusy(true); setMessage('');
    try {
      const data=await request('rooms/',{method:'POST',body:JSON.stringify({mode, is_public: mode === 'online' && visibility === 'public'})});
      setRoom(data.code); setState(data.state); setRoomCode(data.code);
      setMessage(`Sala creada: ${data.code}`);
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  const joinRoom = async () => {
    setBusy(true); setMessage('');
    try {
      const data=await request(`rooms/${roomCode.toUpperCase()}/join/`,{method:'POST',body:'{}'});
      setRoom(roomCode.toUpperCase()); setState(data.state); setMessage('Te uniste a la sala.');
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  const loadPublicRooms = async () => {
    try { setPublicRooms(await request('rooms/public/')); }
    catch(e) { setMessage(e.message); }
  };
  const joinPublicRoom = async code => {
    setBusy(true);
    try {
      const data = await request(`rooms/${code}/join/`,{method:'POST',body:'{}'});
      setRoom(code); setState(data.state); setMessage('Te uniste a la sala pública.');
    } catch(e) { setMessage(e.message); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    if (!room) return;
    try { const data=await request(`rooms/${room}/`); setState(data.state); }
    catch(e) { setMessage(e.message); }
  };
  useEffect(() => {
    if (token && initialMode === 'online' && !room) loadPublicRooms();
  }, [token, initialMode, room]);

  useEffect(() => {
    if (!token || !room) return undefined;
    const socket = new WebSocket(`${WS}/ws/rooms/${room}/?token=${token}`);
    socket.onmessage = event => {
      const msg=JSON.parse(event.data);
      if (msg.type==='state') { setState(msg.state); setSelected([]); }
    };
    socket.onerror = () => setMessage('WebSocket desconectado; puedes seguir usando Actualizar.');
    return () => socket.close();
  },[token,room]);
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
  const toggle = uid => setSelected(prev=>prev.includes(uid)?prev.filter(x=>x!==uid):[...prev,uid]);
  const required = contractKinds[state?.contract_id] || [];
  const nextKind = required[groups.length];
  const addGroup = () => {
    if (!nextKind || selected.length!==groupSize(nextKind)) {
      setMessage(`Selecciona ${nextKind ? groupSize(nextKind) : 0} cartas para el siguiente grupo.`); return;
    }
    setGroups(prev=>[...prev,selected]); setSelected([]); setMessage('');
  };
  const submitContract = () => {
    if (groups.length!==required.length) { setMessage('Debes preparar todos los grupos del contrato.'); return; }
    action('lay_contract',{groups});
  };
  const start = async () => {
    try {
      const data=await request(`rooms/${room}/start/`,{method:'POST',body:'{}'});
      setState(data.state); setMessage('¡Partida iniciada!');
    } catch(e) { setMessage(e.message); }
  };
  const nextRound = async () => {
    try {
      const data=await request(`rooms/${room}/next-round/`,{method:'POST',body:JSON.stringify({special_choice:specialChoice})});
      setState(data.state);
    } catch(e) { setMessage(e.message); }
  };
  const cardLabel = c => c.code || (c.joker ? 'Comodín' : `${c.rank}-${c.suit}`);
  const isMyTurn = state && state.current_player === String(JSON.parse(atob(token.split('.')[1]||'e30='))?.user_id || '') ;
  // Server player_id is the authenticated Django user id. Turn permission is also checked server-side.
  const current = state?.players?.find(p=>p.is_turn);
  const myPlayer = state?.players?.find(p=>p.name===username);
  const myTurn = !!(current && myPlayer && current.player_id===myPlayer.player_id);
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
              <div className="online-actions"><button disabled={busy} onClick={createRoom}>🎴 Comenzar partida</button></div>
            </> : <>
              <h2>Crear una sala online</h2>
              <div className="online-actions">
                <label className="visibility-choice">Tipo de sala
                  <select value={visibility} onChange={e=>setVisibility(e.target.value)}>
                    <option value="private">🔒 Privada (con código)</option>
                    <option value="public">🌐 Pública (visible en el listado)</option>
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
            {statsData && <p className="history-line">Partidas: {statsData.games_played} · Ganadas: {statsData.games_won} · Puntaje medio: {statsData.average_score}</p>}
            {historyRows.length>0 && <div className="history-list"><b>Últimas partidas</b>{historyRows.map(row=><div className="history-line" key={row.code}>
              <span>{row.code} · {row.mode==='bot'?'Contra bot':'Multijugador'} · ronda {row.round_id}</span>
              <small>{row.players?.map(p=>p.name).join(' vs ')}</small>
            </div>)}</div>}
            </>}
          </section>}
          {room && <section className="online-panel">
            <div className="room-title"><h2>Sala {room}</h2><button className="online-secondary" onClick={refresh}>Actualizar</button></div>
            {state?.status==='waiting' && <>
              <p>Jugadores: {state.players?.map(p=>p.name).join(' · ')}</p>
              <button onClick={start}>Iniciar partida</button>
            </>}
            {state && state.round_id && <>
              <div className="game-meta">
                <span>Ronda {state.round_id}/11 · {state.contract_name}</span>
                <span>{state.phase==='draw'?'Debes robar':'Debes descartar o completar acciones'}</span>
                <span>{current?.name ? `Turno: ${current.name}` : ''}</span>
              </div>
              <div className="players-row">
                {state.players.map(p=><div className={`player-chip ${p.is_turn?'active':''}`} key={p.player_id}>
                  <b>{p.name}</b><small>{p.card_count} cartas · {p.score} pts {p.has_laid?'· contrato bajado':''}</small>
                  {p.player_id !== myPlayer?.player_id && <div className="online-opponent-cards" aria-label={`${p.card_count} cartas ocultas`}>
                    {Array.from({length:Math.min(p.card_count || 0, 8)}).map((_,i)=><img key={i} src="/images/reversoCarta.png" alt="Carta oculta" />)}
                  </div>}
                </div>)}
              </div>
              <div className="table-area">
                <div className="online-piles">
                  <div><b>Descarte:</b> {state.discard?.length ? cardLabel(state.discard[state.discard.length-1]) : 'Vacío'}</div>
                  <div className="online-stock"><img src="/images/reversoCarta.png" alt="Reverso del mazo" /><span>Mazo: {state.stock_count}</span></div>
                </div>
                <div className="melds-row">{state.table_melds?.map((m,i)=><div className="meld-box" key={i}>
                  <b>{m.owner==='bot'?'Bot':(state.players.find(p=>p.player_id===m.owner)?.name||m.owner)} · {m.kind}</b>
                  <div>{m.cards.map(c=>cardLabel(c)).join(' | ')}</div>
                  {state.phase==='discard' && state.players.some(p=>p.player_id===String(myPlayer?.player_id)&&p.is_turn) && <button className="online-secondary" onClick={()=>{setMeldTarget(i);if(selected.length)action('add_cards',{meld_index:i,card_uids:selected});}}>Pegar seleccionadas</button>}
                </div>)}</div>
              </div>
              {state.status==='round_finished' ? <div className="online-actions">
                <h3>Ganó {state.players.find(p=>p.player_id===state.winner)?.name || state.winner}</h3>
                <p>{Object.entries(state.round_points||{}).map(([id,pts])=>`${state.players.find(p=>p.player_id===id)?.name||id}: +${pts} pts`).join(' · ')}</p>
                {state.round_id===8 && <label>Contrato especial de la ronda 9
                  <select value={specialChoice} onChange={e=>setSpecialChoice(e.target.value)}>
                    <option value="loca">Escala loca</option>
                    <option value="primavera">Primavera</option>
                    <option value="real">Escala real</option>
                  </select>
                </label>}
                <button onClick={nextRound}>{state.round_id===9?'Finalizar partida':'Siguiente ronda'}</button>
              </div> : <>
                <div className="online-actions">
                  <button disabled={busy || !myTurn || state.phase!=='draw'} onClick={()=>action('draw',{source:'stock'})}>Robar del mazo</button>
                  <button disabled={busy || !myTurn || state.phase!=='draw' || !state.discard?.length} onClick={()=>action('draw',{source:'discard'})}>Robar descarte</button>
                </div>
                <h3>Tu mano ({state.hand?.length||0})</h3>
                <div className="hand-grid">{state.hand?.map(c=><button key={c.uid} className={`online-card ${selected.includes(c.uid)?'chosen':''}`} onClick={()=>toggle(c.uid)}>
                  {c.code?.startsWith('JOKER') ? '🃏' : <img src={`/images/${c.code?.replace('_cup','_cups').replace('_coin','_coins')?.replace('_club','_clubs')}.png`} onError={e=>{e.currentTarget.style.display='none'}} alt=""/>}
                  <span>{cardLabel(c)}</span>
                </button>)}</div>
                {state.phase==='discard' && myTurn && <div className="online-panel inner-panel">
                  {!state.players.find(p=>p.player_id===myPlayer?.player_id)?.has_laid && <>
                    <h3>Bajar contrato completo</h3>
                    <p>Grupo siguiente: {nextKind || 'Todos preparados'} · {groups.length}/{required.length}</p>
                    <div className="online-actions">
                      <button disabled={!nextKind || selected.length!==groupSize(nextKind)} onClick={addGroup}>Añadir grupo seleccionado</button>
                      <button disabled={groups.length!==required.length || busy} onClick={submitContract}>Bajar todos los grupos</button>
                    </div>
                    <small>Grupos preparados: {groups.map((g,i)=>`Grupo ${i+1} (${g.length})`).join(' · ') || 'ninguno'}</small>
                  </>}
                  <div className="online-actions">
                    <button disabled={selected.length!==1 || busy} onClick={()=>action('discard',{card_uid:selected[0]})}>Descartar seleccionada</button>
                    <button className="online-secondary" onClick={()=>setSelected([])}>Limpiar selección</button>
                  </div>
                </div>}
              </>}
            </>}
          </section>}
        </>
      )}
      {message && <p className="online-message">{message}</p>}
    </main>
  );
}
