import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function GenerateTimetable() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({ rooms: 0, divisions: 0, teachers: 0, allocation: 0, slots: 0 });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/infrastructure'),
      api.get('/academic'),
      api.get('/teachers'),
      api.get('/allocation'),
      api.get('/workconfig'),
    ]).then(([r, y, t, a, c]) => {
      setChecks({
        rooms:      r.data.data?.length || 0,
        divisions:  (y.data.data || []).reduce((acc, yr) => acc + (yr.divisions?.length || 0), 0),
        teachers:   t.data.data?.length || 0,
        allocation: a.data.count || 0,
        slots:      c.data.data?.generatedSlots?.length || 0,
      });
    }).catch(() => {});
  }, []);

  const checkItems = [
    { label: 'Rooms configured',     ok: checks.rooms > 0,      val: `${checks.rooms} rooms` },
    { label: 'Divisions configured', ok: checks.divisions > 0,  val: `${checks.divisions} divisions` },
    { label: 'Teachers added',       ok: checks.teachers > 0,   val: `${checks.teachers} teachers` },
    { label: 'Subjects allocated',   ok: checks.allocation > 0, val: `${checks.allocation} records` },
    { label: 'Time slots generated', ok: checks.slots > 0,      val: `${checks.slots} slots` },
  ];

  const issues = checkItems.filter(i => !i.ok).map(i => i.label);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/timetable/generate');
      toast.success(res.data.message);
      navigate('/view');
    } catch (err) { toast.error(err.response?.data?.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  return (
    <div>
      <div className="breadcrumb">Home / <span>Generate Timetable</span></div>
      <div className="page-header">
        <h1>Timetable Generation Engine</h1>
        <p>Automatically generate conflict-free timetables for all divisions.</p>
      </div>

      <div className="section-card">
        <h2>Pre-Generation Checklist</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {checkItems.map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 8,
              background: item.ok ? '#0f2a1e' : '#2a1510',
              border: `0.5px solid ${item.ok ? '#1caa6b44' : '#e24b4a44'}`,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: item.ok ? '#1caa6b' : '#e24b4a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
              }}>
                {item.ok ? <IconCheck /> : <IconX />}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: item.ok ? '#4ade80' : '#f87171', flex: 1 }}>
                {item.label}
              </span>
              <span style={{ background: '#1a2340', color: '#7ba7f7', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {item.val}
              </span>
            </div>
          ))}
        </div>

        {issues.length > 0 && (
          <div style={{ background: '#2a1510', border: '0.5px solid #e24b4a55', borderRadius: 10, padding: 14, marginBottom: 14, color: '#f87171', fontSize: 13, fontWeight: 600 }}>
            Please resolve: {issues.join(', ')}
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-primary" onClick={generate} disabled={issues.length > 0 || generating}
            style={{ fontSize: 14, padding: '10px 24px' }}>
            {generating ? 'Generating...' : 'Generate Timetable'}
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/view')}>View Existing</button>
        </div>
      </div>

      <div className="section-card">
        <h2>Algorithm Details</h2>
        <div className="info-box">
          The scheduling engine enforces these constraints:<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>No teacher clashes</span> — same teacher never placed in 2 divisions at same time<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>No room double-booking</span> — rooms exclusively assigned per slot<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Max daily hours</span> — per division strictly respected and for teachers also<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Buffer slots</span> — intentionally left free for rescheduling<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Lab scheduling</span> — MAD+SAD consecutive 1hr slots, other labs 2hr blocks per batch<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Excel-driven</span> — upload new Excel anytime, regenerate TT without code changes
        </div>
      </div>
    </div>
  );
}