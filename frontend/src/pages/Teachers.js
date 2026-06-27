import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor'];
const emptyForm = { name: '', designation: 'Assistant Professor', phone: '' };

const designationStyle = (d) => {
  if (d === 'Professor') return { background: '#2a1510', color: '#fb923c' };
  if (d === 'Associate Professor') return { background: '#1a2340', color: '#7ba7f7' };
  return { background: '#0f2a1e', color: '#4ade80' };
};

export default function Teachers() {
  const [teachers, setTeachers]   = useState([]);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef();

  const fetchTeachers = async () => {
    const res = await api.get('/teachers');
    setTeachers(res.data.data);
  };
  useEffect(() => { fetchTeachers(); }, []);

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (t) => { setEditing(t._id); setForm({ name: t.name, designation: t.designation, phone: t.phone || '' }); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    try {
      if (editing) { await api.put(`/teachers/${editing}`, form); toast.success('Teacher updated'); }
      else         { await api.post('/teachers', form);            toast.success('Teacher added'); }
      setShowModal(false); fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    await api.delete(`/teachers/${id}`); toast.success('Deleted'); fetchTeachers();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx)'); return;
    }
    setUploading(true); setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/teachers/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadResult(res.data);
      toast.success(`${res.data.created} teachers uploaded!`);
      fetchTeachers();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="breadcrumb">Home / <span>Teachers</span></div>
      <div className="page-header">
        <h1>Teacher Management</h1>
        <p>Add teachers one by one OR upload Excel for bulk entry.</p>
      </div>

      {/* Bulk Upload Card */}
      <div className="section-card" style={{ borderLeft: '3px solid #3a5bc7' }}>
        <h2>Bulk Upload via Excel</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          Upload all teachers at once using the given Excel template.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/teachers_upload_template.xlsx" download style={{ textDecoration: 'none' }}>
            <button className="btn btn-outline">Download Excel Template</button>
          </a>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Filled Excel'}
          </button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleFileUpload} />
        </div>

        {/* Info box - dark */}
        <div style={{ marginTop: 14, background: '#1a2340', border: '0.5px solid #2a3a6a', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12.5, color: '#7ba7f7', fontWeight: 700, marginBottom: 6 }}>Excel Format:</div>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 2 }}>
            Column 1: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>TeacherName</span> :-  Full name W/O TITLE (e.g. Sandip Shinde)<br/>
            Column 2: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Designation</span> :- Professor / Associate Professor / Assistant Professor<br/>
            Column 3: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Phone</span> :- Optional, can be left blank
          </div>
        </div>

        {uploadResult && (
          <div style={{ marginTop: 14, background: uploadResult.errors?.length > 0 ? '#2a1f0a' : '#0f2a1e', border: `0.5px solid ${uploadResult.errors?.length > 0 ? '#c47800' : '#1caa6b'}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#e2e8f0' }}>{uploadResult.message}</div>
            {uploadResult.errors?.map((e, i) => (
              <div key={i} style={{ fontSize: 11.5, color: '#fb923c' }}>• {e}</div>
            ))}
          </div>
        )}
      </div>

      {/* Teachers List */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>All Teachers ({filtered.length})</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" placeholder="Search teacher..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ width: 220, marginBottom: 0 }} />
            <button className="btn btn-primary" onClick={openAdd}>+ Add Single</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" width="40" height="40" style={{ marginBottom: 10 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <p>No teachers found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Designation</th><th>Phone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t._id}>
                    <td style={{ color: '#6b7280' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>
                      <span style={{ ...designationStyle(t.designation), padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
                        {t.designation}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: 13 }}>{t.phone || '—'}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(t._id)}>
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

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name (with title)</label>
                <input className="form-input" placeholder="Prof. Dr. Sandip Shinde"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Designation</label>
                <select className="form-select" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}>
                  {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <input className="form-input" placeholder="9876543210"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={save}>Save Teacher</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}