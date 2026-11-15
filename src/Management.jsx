import React, { useCallback, useEffect, useState } from 'react';
import './Management.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Management({ section, onBack, onNavigate }) {
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState({});
  const token = localStorage.getItem('cariocas_token') || '';

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}/api/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
        ...options.headers
      }
    });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.detail || 'No se pudo completar la operación.');
    return data;
  }, [token]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [historyData, roomData] = await Promise.all([request('history/'), request('rooms/')]);
      setHistory(historyData);
      setRooms(roomData);
      setVisibility(Object.fromEntries(roomData.map(room => [room.code, room.is_public ? 'public' : 'private'])));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      setStats(await request('stats/'));
      setMessage('Estadísticas actualizadas desde SQLite.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (section === 'history') loadHistory();
    if (section === 'stats') loadStats();
  }, [section, loadHistory, loadStats]);

  const showDetails = async code => {
    try {
      const data = await request(`rooms/${code}/`);
      setSelected(data);
      setMessage(`Detalle de la partida ${code}.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateRoom = async code => {
    try {
      await request(`rooms/${code}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_public: visibility[code] === 'public' })
      });
      setMessage(`Partida ${code} actualizada correctamente.`);
      await loadHistory();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteRoom = async code => {
    if (!window.confirm(`¿Eliminar definitivamente la partida ${code} del historial?`)) return;
    try {
      await request(`rooms/${code}/`, { method: 'DELETE' });
      setHistory(rows => rows.filter(row => row.code !== code));
      setRooms(rows => rows.filter(row => row.code !== code));
      if (selected?.code === code) setSelected(null);
      setMessage(`Partida ${code} eliminada.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const winRate = stats?.games_played ? Math.round(stats.games_won / stats.games_played * 100) : 0;

  return (
    <main className="management-shell">
      <header className="management-header">
        <button className="management-button secondary" onClick={onBack}>← Menú principal</button>
        <div><span>CARIOCAS</span><h1>{section === 'history' ? 'Visualización de partidas' : 'Estadísticas'}</h1></div>
        <button className="management-button" onClick={section === 'history' ? loadHistory : loadStats} disabled={loading}>↻ Actualizar</button>
      </header>
      <nav className="management-tabs">
        <button className={section === 'history' ? 'active' : ''} onClick={() => onNavigate('history')}>Historial de partidas</button>
        <button className={section === 'stats' ? 'active' : ''} onClick={() => onNavigate('stats')}>Estadísticas</button>
      </nav>
      {message && <p className="management-message" role="status">{message}</p>}
      {section === 'history' && <div className="management-content">
        <section className="management-panel">
          <div className="management-section-heading"><div><span>REGISTROS PERSISTENTES</span><h2>Historial de partidas</h2></div><small>{history.length} finalizadas</small></div>
          {loading ? <p className="management-empty">Cargando partidas…</p> : history.length === 0 ? <p className="management-empty">Todavía no hay partidas finalizadas en tu historial.</p> : history.map(row => {
            return <article className="management-row" key={row.code}>
              <div className="management-row-main"><strong>{row.code}</strong><span>{row.mode === 'bot' ? 'Contra bot' : 'Multijugador'} · Ronda {row.round_id || '—'}</span><small>{(row.players || []).map(player => player.name).join(' · ')}</small><small>{row.finished_at ? new Date(row.finished_at).toLocaleString('es-CL') : 'Fecha no disponible'}</small></div>
              <div className="management-row-actions">
                <button className="management-button secondary" onClick={() => showDetails(row.code)}>Ver detalle</button>
                {row.can_delete && <button className="management-button danger" onClick={() => deleteRoom(row.code)}>Eliminar</button>}
              </div>
            </article>;
          })}
        </section>
        {selected && <section className="management-panel detail-panel"><div className="management-section-heading"><div><span>CONSULTA API REST</span><h2>Partida {selected.code}</h2></div><button className="management-button secondary" onClick={() => setSelected(null)}>Cerrar</button></div><p>Modalidad: {selected.mode === 'bot' ? 'Contra bot' : 'Multijugador'}</p><p>Estado: {selected.status}</p><p>Visibilidad: {selected.is_public ? 'Pública' : 'Privada'}</p><pre>{JSON.stringify(selected.state, null, 2)}</pre></section>}
        <section className="management-panel">
          <div className="management-section-heading"><div><span>OPERACIONES CRUD</span><h2>Administrar salas</h2></div><small>{rooms.length} registros</small></div>
          {rooms.length === 0 ? <p className="management-empty">No hay salas registradas.</p> : rooms.map(room => <article className="management-row" key={room.code}>
            <div className="management-row-main"><strong>{room.code}</strong><span>{room.mode === 'bot' ? 'Contra bot' : 'Multijugador'} · {room.status === 'finished' ? 'Finalizada' : room.status === 'playing' ? 'En juego' : 'Esperando'}</span><small>{(room.players || []).join(' · ')}</small></div>
            <div className="management-row-actions"><button className="management-button secondary" onClick={() => showDetails(room.code)}>GET detalle</button>
              {room.status === 'waiting' && <><select value={visibility[room.code] || 'private'} onChange={event => setVisibility(current => ({ ...current, [room.code]: event.target.value }))}><option value="private">Privada</option><option value="public">Pública</option></select><button className="management-button" onClick={() => updateRoom(room.code)}>PATCH</button></>}
              {room.status === 'finished' && room.can_delete && <button className="management-button danger" onClick={() => deleteRoom(room.code)}>DELETE</button>}
            </div>
          </article>)}
          <p className="management-footnote">Las salas se crean desde los modos de juego. La edición modifica la visibilidad de salas en espera; la eliminación requiere ser su anfitrión.</p>
        </section>
      </div>}
      {section === 'stats' && <div className="management-content"><section className="management-panel">
        <div className="management-section-heading"><div><span>RENDIMIENTO DEL JUGADOR</span><h2>Estadísticas generales</h2></div><button className="management-button" onClick={loadStats} disabled={loading}>Actualizar estadísticas</button></div>
        {!stats ? <p className="management-empty">{loading ? 'Calculando estadísticas…' : 'No hay estadísticas disponibles.'}</p> : <>
          <div className="management-stats-grid"><article><span>Partidas jugadas</span><strong>{stats.games_played}</strong></article><article><span>Partidas ganadas</span><strong>{stats.games_won}</strong></article><article><span>Partidas no ganadas</span><strong>{Math.max(0, stats.games_played - stats.games_won)}</strong></article><article><span>Puntos promedio</span><strong>{Number(stats.average_score || 0).toFixed(1)}</strong></article></div>
          <div className="management-winrate"><div><span>Porcentaje de victorias</span><strong>{winRate}%</strong></div><div className="management-progress"><span style={{ width: `${winRate}%` }} /></div></div>
          <p className="management-footnote">Datos calculados en el servidor a partir de las partidas finalizadas almacenadas en SQLite. En Cariocas, una puntuación menor representa un mejor resultado.</p>
        </>}
      </section></div>}
    </main>
  );
}
