import React, { useState, useEffect } from 'react';
import api from '../api/axios';

export default function ViewTimetable() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDiv, setSelectedDiv] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/academic'), api.get('/workconfig')]).then(([y, c]) => {
      const divs = (y.data.data || []).flatMap(yr => (yr.divisions || []).map(d => ({ ...d, yearId: yr.yearId })));
      setDivisions(divs);
      setConfig(c.data.data);
      if (divs.length > 0) setSelectedDiv(divs[0].divisionId);
    });
  }, []);

  useEffect(() => {
    if (!selectedDiv) return;
    setLoading(true);
    api.get('/timetable/' + selectedDiv)
      .then(res => setTimetable(res.data.data))
      .catch(() => setTimetable(null))
      .finally(() => setLoading(false));
  }, [selectedDiv]);

  const getCell = (day, slotIndex) =>
    timetable?.cells?.find(c => c.day === day && c.slotIndex === slotIndex);

  const days  = config?.days || [];
  const slots = config?.generatedSlots || [];

  // Parse lab cell: "B1:MAD(Teacher1) | B2:SAD(Teacher2) | B3:DS2(Teacher3)"
  function parseLabBatches(subjectName) {
    if (!subjectName) return [];
    return subjectName.split(' | ').map(part => {
      // part = "B1:MAD(Teacher1)"
      const match = part.match(/^(\w+):([^(]+)\(([^)]*)\)$/);
      if (match) return { batch: match[1], subject: match[2], teacher: match[3] };
      return { batch: '', subject: part, teacher: '' };
    });
  }

  // Parse shared slot cell like "IOT(Teacher1) | MC(Teacher2)" with rooms "1328 | 1410"
  function parseSharedSlot(subjectName, roomLabel) {
    if (!subjectName || !subjectName.includes(' | ')) return null;
    const subjects = subjectName.split(' | ');
    const rooms = roomLabel ? roomLabel.split(' | ') : [];
    return subjects.map((s, i) => ({ subject: s, room: rooms[i] || '' }));
  }

  function renderCell(cell) {
    if (!cell || cell.isFree || !cell.subjectName) {
      return (
        <td style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 4, textAlign: 'center', color: '#cbd5e1', fontSize: 11 }}>
          —
        </td>
      );
    }

    // LAB cell
    if (cell.subjectType === 'lab') {
      const batches = parseLabBatches(cell.subjectName);
      return (
        <td style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 4, verticalAlign: 'top' }}>
          <div style={{ borderLeft: '3px solid #e24b4a', background: '#fee2e2', borderRadius: 5, padding: '5px 7px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#991b1b', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              LAB
            </div>
            {batches.map((b, i) => (
              <div key={i} style={{ fontSize: 10, color: '#1e2a5e', marginBottom: 2, borderBottom: i < batches.length - 1 ? '1px solid #fca5a5' : 'none', paddingBottom: i < batches.length - 1 ? 2 : 0 }}>
                <span style={{ fontWeight: 700 }}>{b.batch}</span>
                {b.batch ? ': ' : ''}{b.subject}
                {b.teacher ? <span style={{ color: '#6b7280', fontSize: 9 }}> ({b.teacher})</span> : null}
              </div>
            ))}
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>{cell.roomLabel}</div>
          </div>
        </td>
      );
    }

    // THEORY — check if shared slot (IOT|MC type)
    if (cell.subjectType === 'theory') {
      const shared = parseSharedSlot(cell.subjectName, cell.roomLabel);
      if (shared) {
        return (
          <td style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 4, verticalAlign: 'top' }}>
            <div style={{ borderLeft: '3px solid #3a5bc7', background: '#dbeafe', borderRadius: 5, padding: '5px 7px' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#1e3a8a', marginBottom: 3, textTransform: 'uppercase' }}>
                SHARED
              </div>
              {shared.map((s, i) => (
                <div key={i} style={{ fontSize: 10, color: '#1e2a5e', marginBottom: 2, borderBottom: i < shared.length - 1 ? '1px solid #bfdbfe' : 'none', paddingBottom: i < shared.length - 1 ? 2 : 0 }}>
                  <span style={{ fontWeight: 700 }}>{s.subject}</span>
                  {s.room ? <span style={{ color: '#64748b', fontSize: 9 }}> — {s.room}</span> : null}
                </div>
              ))}
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{cell.teacherName}</div>
            </div>
          </td>
        );
      }

      // Normal theory
      return (
        <td style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 4, verticalAlign: 'top' }}>
          <div style={{ borderLeft: '3px solid #3a5bc7', background: '#dbeafe', borderRadius: 5, padding: '5px 7px' }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#1e2a5e', marginBottom: 2 }}>{cell.subjectName}</div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 1 }}>{cell.teacherName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{cell.roomLabel}</div>
          </div>
        </td>
      );
    }

    // TUTORIAL
    if (cell.subjectType === 'tutorial') {
      return (
        <td style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 4, verticalAlign: 'top' }}>
          <div style={{ borderLeft: '3px solid #1caa6b', background: '#dcfce7', borderRadius: 5, padding: '5px 7px' }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#14532d', marginBottom: 2 }}>{cell.subjectName}</div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 1 }}>{cell.teacherName}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{cell.roomLabel}</div>
          </div>
        </td>
      );
    }

    // Fallback
    return (
      <td style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: 4, verticalAlign: 'top' }}>
        <div style={{ borderLeft: '3px solid #94a3b8', background: '#f1f5f9', borderRadius: 5, padding: '5px 7px' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#1e2a5e', marginBottom: 2 }}>{cell.subjectName}</div>
          <div style={{ fontSize: 10, color: '#475569' }}>{cell.teacherName}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{cell.roomLabel}</div>
        </div>
      </td>
    );
  }

  if (!config || divisions.length === 0) {
    return (
      <div>
        <div className="breadcrumb">Home / <span>View Timetable</span></div>
        <div className="page-header"><h1>Division Timetable</h1></div>
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" width="40" height="40" style={{ marginBottom: 10 }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p>Configure your system first, then generate a timetable.</p>
        </div>
      </div>
    );
  }

  // Stats for current timetable
  const totalCells = timetable?.cells?.filter(c => !c.isFree && c.subjectName) || [];
  const labCount   = totalCells.filter(c => c.subjectType === 'lab').length;
  const theoryCount = totalCells.filter(c => c.subjectType === 'theory').length;
  const tutCount   = totalCells.filter(c => c.subjectType === 'tutorial').length;

  return (
    <div>
      <div className="breadcrumb">Home / <span>View Timetable</span></div>
      <div className="page-header">
        <h1>Division Timetable</h1>
        <p>Color-coded timetable grid for each division.</p>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <label style={{ fontWeight: 700, color: '#7ba7f7' }}>Division:</label>
          <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
            value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)}>
            {divisions.map(d => (
              <option key={d.divisionId} value={d.divisionId}>{d.divisionId} – {d.label}</option>
            ))}
          </select>

          {/* Mini stats */}
          {timetable && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
              {[
                { label: 'Theory', count: theoryCount, color: '#3a5bc7' },
                { label: 'Lab', count: labCount, color: '#e24b4a' },
                { label: 'Tutorial', count: tutCount, color: '#1caa6b' },
              ].map(s => (
                <span key={s.label} style={{
                  background: '#1a1f30', border: '0.5px solid ' + s.color + '44',
                  borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: s.color,
                }}>
                  {s.label}: {s.count}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-muted">Loading timetable...</p>
        ) : !timetable ? (
          <div className="empty-state">
            <p>No timetable generated yet. <a href="/generate" style={{ color: '#7ba7f7' }}>Generate now →</a></p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ background: '#1a1f30', color: '#94a3b8', padding: '10px 12px', textAlign: 'center', border: '1px solid #2a2f3e', minWidth: 70, fontSize: 12 }}>
                      DAY / SLOT
                    </th>
                    {slots.map((s, i) => (
                      <th key={i} style={{ background: '#1a1f30', color: '#94a3b8', padding: '8px 6px', textAlign: 'center', border: '1px solid #2a2f3e', minWidth: 110, fontSize: 11 }}>
                        {s.label || s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day}>
                      <td style={{ background: '#1e2336', color: '#7ba7f7', fontWeight: 700, textAlign: 'center', padding: '10px 8px', border: '1px solid #2a2f3e', fontSize: 13 }}>
                        {day}
                      </td>
                      {slots.map((_, si) => renderCell(getCell(day, si)))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
              {[
                { label: 'Theory',      bg: '#dbeafe', border: '#3a5bc7' },
                { label: 'Lab',         bg: '#fee2e2', border: '#e24b4a' },
                { label: 'Tutorial',    bg: '#dcfce7', border: '#1caa6b' },
                { label: 'Shared Slot', bg: '#dbeafe', border: '#3a5bc7' },
                { label: 'Free',        bg: '#f1f5f9', border: '#94a3b8' },
              ].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                  <span style={{ width: 14, height: 14, background: l.bg, borderLeft: '3px solid ' + l.border, borderRadius: 2, display: 'inline-block' }}/>
                  {l.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}