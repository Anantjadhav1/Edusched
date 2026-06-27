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

const PROGRESS_MESSAGES = [
  'Initializing scheduler...',
  'Loading subject allocations from DB...',
  'Building division subject maps...',
  'Scheduling lab blocks (parallel batches)...',
  'Running backtracking algorithm for theory...',
  'Scheduling tutorials with MRV ordering...',
  'Resolving teacher conflicts...',
  'Filling free slots...',
  'Saving timetables to database...',
  'Almost done...',
];

export default function GenerateTimetable() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState({ rooms: 0, divisions: 0, teachers: 0, allocation: 0, slots: 0 });
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);

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
    setResult(null);
    setElapsed(0);

    // Cycle through progress messages
    let msgIdx = 0;
    setProgressMsg(PROGRESS_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % PROGRESS_MESSAGES.length;
      setProgressMsg(PROGRESS_MESSAGES[msgIdx]);
    }, 4000);

    // Elapsed timer
    const startTime = Date.now();
    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      // Set long timeout for axios (10 min)
      const res = await api.post('/timetable/generate', {}, { timeout: 10 * 60 * 1000 });
      toast.success(res.data.message);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      clearInterval(msgInterval);
      clearInterval(elapsedInterval);
      setGenerating(false);
      setProgressMsg('');
    }
  };

  return (
    <div>
      <div className="breadcrumb">Home / <span>Generate Timetable</span></div>
      <div className="page-header">
        <h1>Timetable Generation Engine</h1>
        <p>Backtracking algorithm — guarantees maximum subject allocation.</p>
      </div>

      {/* Checklist */}
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

        {/* Generating progress UI */}
        {generating && (
          <div style={{ background: '#1a2340', border: '0.5px solid #3a5bc7', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {/* Spinner */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: '3px solid #2a3a6a',
                borderTop: '3px solid #7ba7f7',
                animation: 'spin 1s linear infinite',
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontWeight: 700, color: '#7ba7f7', fontSize: 14 }}>{progressMsg}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                  Elapsed: {elapsed}s — backtracking in progress, please wait...
                </div>
              </div>
            </div>
            {/* Progress bar animation */}
            <div style={{ background: '#0f1117', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6,
                background: 'linear-gradient(90deg, #3a5bc7, #7ba7f7)',
                animation: 'progressBar 4s ease-in-out infinite',
              }} />
            </div>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes progressBar {
                0% { width: 5%; }
                50% { width: 80%; }
                100% { width: 95%; }
              }
            `}</style>
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-primary" onClick={generate}
            disabled={issues.length > 0 || generating}
            style={{ fontSize: 14, padding: '10px 24px' }}>
            {generating ? `Generating... (${elapsed}s)` : 'Generate Timetable'}
          </button>
          {!generating && (
            <button className="btn btn-outline" onClick={() => navigate('/view')}>View Existing</button>
          )}
        </div>
      </div>

      {/* Result summary */}
      {result && (
        <div className="section-card" style={{ borderLeft: '3px solid #1caa6b' }}>
          <h2 style={{ color: '#4ade80' }}>Generation Complete</h2>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>{result.message}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {(result.data || []).map(d => (
              <span key={d.divisionId} style={{
                background: '#0f2a1e', border: '0.5px solid #1caa6b44',
                borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#4ade80',
              }}>
                {d.divisionId} — {d.cellCount} cells
              </span>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/view')}>
            View Timetables →
          </button>
        </div>
      )}

      {/* Algorithm info */}
      <div className="section-card">
        <h2>Algorithm Details</h2>
        <div className="info-box">
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Labs first</span> — each lab subject gets one dedicated day; all batches run parallel same slot, different rooms<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>MRV ordering</span> — most constrained subjects scheduled first<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Backtracking</span> — if a subject can't fit, algorithm backtracks and tries alternate slots<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>No teacher clashes</span> — enforced globally across all divisions<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Fully dynamic</span> — upload new Excel anytime, regenerate instantly<br/>
          • <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Time</span> — may take 30s–2min depending on data size, please wait
        </div>
      </div>
    </div>
  );
}