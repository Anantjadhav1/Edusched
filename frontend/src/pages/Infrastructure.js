import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const IconClassroom = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconTutorial = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 21V9"/>
  </svg>
);

const IconLab = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const statCards = [
  { key: 'classroom', label: 'Classrooms',    Icon: IconClassroom, bg: '#1a2340', iconBg: '#3a5bc7', glow: '#3a5bc7' },
  { key: 'tutorial',  label: 'Tutorial Rooms', Icon: IconTutorial,  bg: '#2a1f0a', iconBg: '#c47800', glow: '#c47800' },
  { key: 'lab',       label: 'Laboratories',   Icon: IconLab,       bg: '#0f2a1e', iconBg: '#1caa6b', glow: '#1caa6b' },
];

const typeColor = { classroom: 'theory', tutorial: 'tutorial', lab: 'lab' };

export default function Infrastructure() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genForm, setGenForm] = useState({ type: 'classroom', count: '', prefix: '' });
  const [singleForm, setSingleForm] = useState({ roomId: '', label: '', type: 'classroom', capacity: 60 });
  const [showModal, setShowModal] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/infrastructure');
      setRooms(res.data.data);
    } catch { toast.error('Failed to load rooms'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const generateRooms = async () => {
    try {
      const res = await api.post('/infrastructure/generate', genForm);
      toast.success(res.data.message);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const addSingleRoom = async () => {
    try {
      await api.post('/infrastructure', singleForm);
      toast.success('Room added');
      setShowModal(false);
      setSingleForm({ roomId: '', label: '', type: 'classroom', capacity: 60 });
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const deleteRoom = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await api.delete(`/infrastructure/${id}`);
      toast.success('Room deleted');
      fetchRooms();
    } catch { toast.error('Failed to delete'); }
  };

  const clearAll = async () => {
    if (!window.confirm('Delete ALL rooms?')) return;
    try {
      await api.delete('/infrastructure');
      toast.success('All rooms cleared');
      fetchRooms();
    } catch { toast.error('Failed to clear'); }
  };

  const countByType = (type) => rooms.filter(r => r.type === type).length;

  return (
    <div>
      <div className="breadcrumb">Home / <span>Infrastructure</span></div>
      <div className="page-header">
        <h1>Infrastructure Configuration</h1>
        <p>Configure classrooms, tutorial rooms, and laboratories.</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(s => (
          <div
            key={s.key}
            className="stat-card"
            style={{
              background: s.bg,
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderLeft: 'none',
              boxShadow: `0 4px 20px ${s.glow}33`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: s.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
              boxShadow: `0 4px 12px ${s.glow}55`,
            }}>
              <s.Icon />
            </div>
            <div>
              <div className="stat-value">{countByType(s.key)}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Rooms */}
      <div className="section-card">
        <h2>Generate Rooms in Bulk</h2>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Room Type</label>
            <select className="form-select" value={genForm.type} onChange={e => setGenForm({...genForm, type: e.target.value})}>
              <option value="classroom">Classroom</option>
              <option value="tutorial">Tutorial Room</option>
              <option value="lab">Laboratory</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Number of Rooms</label>
            <input className="form-input" type="number" min="1" max="50"
              placeholder="e.g. 5"
              value={genForm.count}
              onChange={e => setGenForm({...genForm, count: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Prefix (optional)</label>
            <input className="form-input" placeholder="e.g. CR, TR, LAB"
              value={genForm.prefix}
              onChange={e => setGenForm({...genForm, prefix: e.target.value})} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={generateRooms}>Generate Rooms</button>
          <button className="btn btn-outline" onClick={() => setShowModal(true)}>Add Single Room</button>
          <button className="btn btn-danger btn-sm" onClick={clearAll}>Clear All</button>
        </div>
      </div>

      {/* Room List */}
      <div className="section-card">
        <h2>Room List ({rooms.length})</h2>
        {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : rooms.length === 0 ? (
          <div className="empty-state">
            <div style={{ marginBottom: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" width="40" height="40">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <p>No rooms configured yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Room ID</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => (
                  <tr key={r._id}>
                    <td style={{ color: '#6b7280' }}>{i + 1}</td>
                    <td><code style={{ background: '#1a1f30', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#94a3b8' }}>{r.roomId}</code></td>
                    <td style={{ fontWeight: 600 }}>{r.label}</td>
                    <td>
                      <span className={`badge ${typeColor[r.type] || 'theory'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td>{r.capacity}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteRoom(r._id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <IconTrash /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Room Modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Single Room</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Room ID</label>
                <input className="form-input" placeholder="e.g. LAB01"
                  value={singleForm.roomId} onChange={e => setSingleForm({...singleForm, roomId: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Label</label>
                <input className="form-input" placeholder="e.g. Computer Lab 1"
                  value={singleForm.label} onChange={e => setSingleForm({...singleForm, label: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={singleForm.type} onChange={e => setSingleForm({...singleForm, type: e.target.value})}>
                  <option value="classroom">Classroom</option>
                  <option value="tutorial">Tutorial Room</option>
                  <option value="lab">Laboratory</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Capacity</label>
                <input className="form-input" type="number" value={singleForm.capacity}
                  onChange={e => setSingleForm({...singleForm, capacity: e.target.value})} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={addSingleRoom}>Add Room</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}