import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const yearConfig = {
  SY: { color: '#c084fc', bg: '#1e1535', chipBg: '#1e1535' },
  TY: { color: '#fbbf24', bg: '#2a1f0a', chipBg: '#2a1f0a' },
 
};

const IconOnline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
  </svg>
);

const IconOffline = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function AcademicStructure() {
  const [years, setYears] = useState([]);
  const [inputs, setInputs] = useState({
    SY: { count: '', mode: 'offline' },
    TY: { count: '', mode: 'offline' },
  });
  const [batchCounts, setBatchCounts] = useState({ SY: [], TY: [] });

  useEffect(() => {
    api.get('/academic').then(res => {
      const data = res.data.data;
      setYears(data);
      const inp = {};
      const bc = {};
      data.forEach(y => {
        inp[y.yearId] = { count: y.divisions.length || '', mode: y.mode || 'offline' };
        bc[y.yearId] = y.divisions.map(d => d.batchCount || 3);
      });
      setInputs(inp);
      setBatchCounts(bc);
    }).catch(() => {});
  }, []);

  const handleCountChange = (yearId, val) => {
    const count = parseInt(val) || 0;
    setInputs(prev => ({ ...prev, [yearId]: { ...prev[yearId], count: val } }));
    setBatchCounts(prev => {
      const existing = prev[yearId] || [];
      const newArr = Array.from({ length: count }, (_, i) => existing[i] || 3);
      return { ...prev, [yearId]: newArr };
    });
  };

  const handleBatchChange = (yearId, divIdx, val) => {
    setBatchCounts(prev => {
      const arr = [...(prev[yearId] || [])];
      arr[divIdx] = parseInt(val) || 3;
      return { ...prev, [yearId]: arr };
    });
  };

  const apply = async (yearId) => {
    const { count, mode } = inputs[yearId];
    if (!count || count < 1) { toast.error('Enter valid division count'); return; }
    try {
      const res = await api.put(`/academic/${yearId}`, {
        divisionCount: parseInt(count),
        mode,
        batchCounts: batchCounts[yearId] || [],
      });
      toast.success(res.data.message);
      setYears(prev => prev.map(y => y.yearId === yearId ? res.data.data : y));
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="breadcrumb">Home / <span>Academic Structure</span></div>
      <div className="page-header">
        <h1>Academic Structure</h1>
        <p>Configure years, divisions, batch count per division, and learning mode.</p>
      </div>

      {years.map(year => {
        const yc = yearConfig[year.yearId] || yearConfig.SY;
        const mode = inputs[year.yearId]?.mode || 'offline';
        return (
          <div className="section-card" key={year.yearId}>

            {/* Year Title */}
            <h2 style={{ color: yc.color, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              </svg>
              {year.label}
            </h2>

            <div className="form-grid" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Number of Divisions</label>
                <input className="form-input" type="number" min="1" max="26"
                  placeholder="e.g. 14"
                  value={inputs[year.yearId]?.count || ''}
                  onChange={e => handleCountChange(year.yearId, e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Learning Mode</label>
                <select className="form-select"
                  value={mode}
                  onChange={e => setInputs(prev => ({ ...prev, [year.yearId]: { ...prev[year.yearId], mode: e.target.value } }))}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>

            {/* Batch count per division */}
            {inputs[year.yearId]?.count > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                  Batches per Division <span style={{ color: '#4b5563', fontWeight: 400 }}>(default 3)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: parseInt(inputs[year.yearId].count) || 0 }, (_, i) => (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      background: '#131720', border: '0.5px solid #2a2f3e',
                      borderRadius: 8, padding: '8px 12px', minWidth: 80,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: yc.color, marginBottom: 6 }}>
                        {year.yearId}-{LETTERS[i]}
                      </span>
                      <select
                        style={{
                          fontSize: 12, padding: '4px 6px', borderRadius: 6,
                          border: '0.5px solid #2a2f3e', width: '100%',
                          background: '#0f1117', color: '#e2e8f0',
                        }}
                        value={batchCounts[year.yearId]?.[i] || 3}
                        onChange={e => handleBatchChange(year.yearId, i, e.target.value)}>
                        <option value="1">1 Batch</option>
                        <option value="2">2 Batches</option>
                        <option value="3">3 Batches</option>
                        <option value="4">4 Batches</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary"
                onClick={() => apply(year.yearId)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconCheck /> Apply
              </button>
            </div>

            {/* Division tags */}
            {year.divisions?.length > 0 && (
              <>
                <hr />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {year.divisions.map(d => (
                    <span key={d.divisionId} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: yc.bg, border: `0.5px solid ${yc.color}33`,
                      borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: yc.color,
                    }}>
                      {d.divisionId}
                      <span style={{
                        background: '#1a2340', color: '#7ba7f7',
                        borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                      }}>
                        {d.batchCount || 3}B
                      </span>
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: mode === 'online' ? '#1a2340' : '#2a1510',
                    color: mode === 'online' ? '#7ba7f7' : '#fb923c',
                    border: `0.5px solid ${mode === 'online' ? '#2a3a6a' : '#3a2010'}`,
                    borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  }}>
                    {mode === 'online' ? <IconOnline /> : <IconOffline />}
                    {mode === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}