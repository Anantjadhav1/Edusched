import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkConfig() {
  const [config, setConfig] = useState({
    days: ['Mon','Tue','Wed','Thu','Fri'],
    startTime: '09:00', endTime: '17:00',
    slotDuration: 60, maxDailyHours: 6,
    generatedSlots: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/workconfig').then(res => setConfig(res.data.data)).catch(() => {});
  }, []);

  const toggleDay = (day) => {
    setConfig(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/workconfig', config);
      setConfig(res.data.data);
      toast.success(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="breadcrumb">Home / <span>Work Config</span></div>
      <div className="page-header">
        <h1>College Working Configuration</h1>
        <p>Define working days, hours, and slot duration and time slots are auto-generated.</p>
      </div>

      <div className="section-card">
        <h2>Configuration Settings</h2>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Working Days</label>
            <div className="checkbox-row">
              {ALL_DAYS.map(d => (
                <label className="check-label" key={d}>
                  <input type="checkbox" checked={config.days.includes(d)} onChange={() => toggleDay(d)} />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">College Start Time</label>
            <input className="form-input" type="time" value={config.startTime}
              onChange={e => setConfig({...config, startTime: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">College End Time</label>
            <input className="form-input" type="time" value={config.endTime}
              onChange={e => setConfig({...config, endTime: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Slot Duration (minutes)</label>
            <input className="form-input" type="number" min="30" max="180" value={config.slotDuration}
              onChange={e => setConfig({...config, slotDuration: parseInt(e.target.value)})} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Daily Teaching Hours</label>
            <input className="form-input" type="number" min="1" max="12" value={config.maxDailyHours}
              onChange={e => setConfig({...config, maxDailyHours: parseInt(e.target.value)})} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Generate Slots'}
          </button>
        </div>
      </div>

      <div className="section-card">
        <h2>Generated Time Slots ({config.generatedSlots?.length || 0})</h2>
        {!config.generatedSlots?.length ? (
          <p className="text-muted">Save config to generate slots.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {config.generatedSlots.map((s, i) => (
              <span key={i} style={{
                background: '#1a2340',
                color: '#7ba7f7',
                border: '0.5px solid #2a3a6a',
                borderRadius: 7,
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: 600,
              }}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <h2>Active Working Days</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {config.days.map(d => (
            <span key={d} style={{
              background: '#1a2340',
              color: '#7ba7f7',
              border: '0.5px solid #2a3a6a',
              padding: '6px 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
            }}>
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}