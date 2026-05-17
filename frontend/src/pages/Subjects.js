import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const YEARS = [{ id: 'SY', label: 'Second Year' }, { id: 'TY', label: 'Third Year' }];
const emptyForm = { name: '', code: '', yearId: 'SY', type: 'theory', teacherId: '', weeklyHours: 3 };

const roomIcon = (type) => {
  if (type === 'lab') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>;
  if (type === 'tutorial') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
};

export default function Subjects() {
  const [subjects, setSubjects]         = useState([]);
  const [teachers, setTeachers]         = useState([]);
  const [activeYear, setActiveYear]     = useState('SY');
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [uploading, setUploading]       = useState(false);
  const [allocCount, setAllocCount]     = useState(null);
  const fileInputRef                    = useRef();

  const fetchAll = async () => {
    const [s, t] = await Promise.all([api.get('/subjects'), api.get('/teachers')]);
    setSubjects(s.data.data); setTeachers(t.data.data);
  };

  const fetchAllocCount = async () => {
    try {
      const res = await api.get('/allocation');
      setAllocCount(res.data.count);
    } catch { setAllocCount(0); }
  };

  useEffect(() => { fetchAll(); fetchAllocCount(); }, []);

  const openAdd  = () => { setEditing(null); setForm({...emptyForm, yearId: activeYear}); setShowModal(true); };
  const openEdit = (s) => { setEditing(s._id); setForm({...s, teacherId: s.teacherId?._id || s.teacherId}); setShowModal(true); };

  const save = async () => {
    try {
      if (editing) { await api.put(`/subjects/${editing}`, form); toast.success('Subject updated'); }
      else         { await api.post('/subjects', form);            toast.success('Subject added'); }
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete subject?')) return;
    await api.delete(`/subjects/${id}`); toast.success('Deleted'); fetchAll();
  };

  // ── Allocation Excel Upload ──
  const handleAllocationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)'); return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/allocation/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${res.data.count} records imported!`);
      fetchAllocCount();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const deleteAllAllocation = async () => {
    if (!window.confirm('Delete all allocation data? TT will be empty until you upload again.')) return;
    try {
      await api.delete('/allocation');
      toast.success('All allocation data deleted');
      setAllocCount(0);
    } catch (err) { toast.error('Delete failed'); }
  };

  const filtered = subjects.filter(s => s.yearId === activeYear);

  return (
    <div>
      <div className="breadcrumb">Home / <span>Subject Allocation</span></div>
      <div className="page-header">
        <h1>Subject Allocation</h1>
        <p>Upload your batchwise faculty Excel to drive the timetable generator.</p>
      </div>

      {/* ── Allocation Upload Card ── */}
      <div className="section-card" style={{ borderLeft: '3px solid #3a5bc7', marginBottom: 24 }}>
        <h2 style={{ color: '#7ba7f7', marginBottom: 4 }}>📂 Batchwise Faculty Excel</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Upload the Excel with columns: <code style={{ background: '#1a1f30', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>Year, Div, Subject, Type, Batch, Name of Faculty, Weekly hours</code>
        </p>

        {/* Record count badge */}
        {allocCount !== null && (
          <div style={{ marginBottom: 14 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: allocCount > 0 ? '#0f2a1e' : '#2a1510',
              color: allocCount > 0 ? '#4ade80' : '#fb923c',
              border: `0.5px solid ${allocCount > 0 ? '#1caa6b55' : '#c4480055'}`,
              borderRadius: 8, padding: '5px 14px', fontSize: 13, fontWeight: 600,
            }}>
              {allocCount > 0
                ? `✅ ${allocCount} records loaded in DB`
                : '⚠️ No allocation data — upload Excel to generate TT'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : '⬆ Upload Excel'}
          </button>
          <button
            className="btn btn-danger"
            onClick={deleteAllAllocation}
            disabled={allocCount === 0}
          >
            🗑 Delete All Data
          </button>
          <input
            type="file" ref={fileInputRef}
            style={{ display: 'none' }} accept=".xlsx,.xls"
            onChange={handleAllocationUpload}
          />
        </div>

        <div style={{ marginTop: 14, background: '#131720', border: '0.5px solid #2a2f3e', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12.5, color: '#7ba7f7', fontWeight: 700, marginBottom: 6 }}>Steps:</div>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 2 }}>
            1. Upload your Excel file (same format as <code style={{ color: '#e2e8f0' }}>sarthak.xlsx</code>)<br/>
            2. Old data automatically deleted, new data loaded<br/>
            3. Go to <strong style={{ color: '#e2e8f0' }}>Generate Timetable</strong> and click Generate<br/>
            4. Next time Excel changes → upload again → regenerate
          </div>
        </div>
      </div>

      {/* ── Year Tabs ── */}
      <div className="tabs">
        {YEARS.map(y => (
          <button key={y.id} className={`tab ${activeYear === y.id ? 'active' : ''}`} onClick={() => setActiveYear(y.id)}>
            {y.label}
          </button>
        ))}
      </div>

      {/* ── Subjects Table (existing) ── */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>{YEARS.find(y => y.id === activeYear)?.label} Subjects ({filtered.length})</h2>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" width="40" height="40" style={{ marginBottom: 10 }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <p>No subjects for this year yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Subject</th><th>Code</th><th>Type</th><th>Teacher</th><th>Weekly Hrs</th><th>Room</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: '#6b7280' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><code style={{ background: '#1a1f30', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#94a3b8' }}>{s.code}</code></td>
                    <td><span className={`badge ${s.type}`}>{s.type}</span></td>
                    <td style={{ color: '#94a3b8' }}>{s.teacherId?.name || '—'}</td>
                    <td><span style={{ background: '#1a2340', color: '#7ba7f7', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{s.weeklyHours}h/wk</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 12 }}>
                        {roomIcon(s.type)}
                        {s.type === 'lab' ? 'Lab' : s.type === 'tutorial' ? 'Tutorial' : 'Classroom'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(s._id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Subject' : 'Add Subject'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Subject Name</label>
                <input className="form-input" placeholder="Database Management"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input className="form-input" placeholder="CS301"
                  value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={form.yearId} onChange={e => setForm({...form, yearId: e.target.value})}>
                  {YEARS.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="theory">Theory</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="lab">Lab</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Teacher</label>
                <select className="form-select" value={form.teacherId} onChange={e => setForm({...form, teacherId: e.target.value})}>
                  <option value="">-- Select Teacher --</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Weekly Hours</label>
                <input className="form-input" type="number" min="1" max="20"
                  value={form.weeklyHours} onChange={e => setForm({...form, weeklyHours: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={save}>Save Subject</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}