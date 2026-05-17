import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Reschedule() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDiv, setSelectedDiv] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [freeSlots, setFreeSlots] = useState([]);
  const [config, setConfig] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const [toSlot, setToSlot] = useState('');

  useEffect(() => {
    Promise.all([api.get('/academic'), api.get('/workconfig')]).then(([y, c]) => {
      const divs = (y.data.data || []).flatMap(yr => (yr.divisions || []).map(d => ({ ...d, yearId: yr.yearId })));
      setDivisions(divs); setConfig(c.data.data);
      if (divs.length > 0) setSelectedDiv(divs[0].divisionId);
    });
  }, []);

  const fetchTimetableData = async (divId) => {
    try {
      const [tt, fs] = await Promise.all([
        api.get(`/timetable/${divId}`),
        api.get(`/timetable/${divId}/free-slots`),
      ]);
      setTimetable(tt.data.data);
      const freeSlotsData = fs.data.data || fs.data || [];
      setFreeSlots(Array.isArray(freeSlotsData) ? freeSlotsData : []);
    } catch { setTimetable(null); setFreeSlots([]); }
  };

  useEffect(() => { if (!selectedDiv) return; fetchTimetableData(selectedDiv); }, [selectedDiv]);

  const openMove = (cell) => {
    setToSlot('');
    setMoveModal({ fromDay: cell.day, fromSlotIndex: cell.slotIndex, subjectName: cell.subjectName });
  };

  const doMove = async () => {
    if (!toSlot) { toast.error('Select a target slot'); return; }
    const [toDay, toSlotIndex] = toSlot.split('|');
    try {
      await api.put(`/timetable/${selectedDiv}/reschedule`, {
        fromDay: moveModal.fromDay, fromSlotIndex: moveModal.fromSlotIndex,
        toDay, toSlotIndex: parseInt(toSlotIndex),
      });
      toast.success('Lecture rescheduled!');
      setMoveModal(null);
      await fetchTimetableData(selectedDiv);
    } catch (err) { toast.error(err.response?.data?.message || 'Reschedule failed'); }
  };

  const slots = config?.generatedSlots || [];
  const scheduledCells = (timetable?.cells || []).filter(c => !c.isFree);

  const MoveIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );

  return (
    <div>
      <div className="breadcrumb">Home / <span>Reschedule</span></div>
      <div className="page-header">
        <h1>Rescheduling Module</h1>
        <p>Move lectures to available slots.</p>
      </div>

      <div className="section-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <label style={{ fontWeight: 700, color: '#94a3b8' }}>Division:</label>
          <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
            value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)}>
            {divisions.map(d => <option key={d.divisionId} value={d.divisionId}>{d.divisionId}</option>)}
          </select>
        </div>

        <h2>Scheduled Lectures</h2>
        {scheduledCells.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" width="40" height="40" style={{ marginBottom: 10 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No timetable found. Generate first.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Day</th><th>Slot</th><th>Subject</th><th>Type</th><th>Teacher</th><th>Room</th><th>Action</th></tr>
              </thead>
              <tbody>
                {scheduledCells.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.day}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{slots[c.slotIndex]?.label || c.slotLabel}</td>
                    <td style={{ fontWeight: 600 }}>{c.subjectName}</td>
                    <td><span className={`badge ${c.subjectType}`}>{c.subjectType}</span></td>
                    <td style={{ color: '#94a3b8' }}>{c.teacherName}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{c.roomLabel}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => openMove(c)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <MoveIcon /> Move
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {moveModal && (
        <div className="overlay" onClick={() => setMoveModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Move Lecture</h2>
              <button className="modal-close" onClick={() => setMoveModal(null)}>✕</button>
            </div>
            <div style={{ background: '#1a2340', border: '0.5px solid #2a3a6a', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
              <div style={{ color: '#6b7280', marginBottom: 4 }}>Moving:</div>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{moveModal.subjectName}</div>
              <div style={{ color: '#6b7280' }}>From: <span style={{ color: '#7ba7f7' }}>{moveModal.fromDay}, {slots[moveModal.fromSlotIndex]?.label || moveModal.fromSlotIndex}</span></div>
            </div>
            <div className="form-group">
              <label className="form-label">Select Free Target Slot</label>
              <select className="form-select" value={toSlot} onChange={e => setToSlot(e.target.value)}>
                <option value="">-- Choose Free Slot --</option>
                {freeSlots.map((fs, i) => (
                  <option key={i} value={`${fs.day}|${fs.slotIndex}`}>{fs.day} — {fs.slotLabel}</option>
                ))}
              </select>
              {freeSlots.length === 0 && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>No free slots available for this division.</p>
              )}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={doMove}>Confirm Move</button>
              <button className="btn btn-outline" onClick={() => setMoveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}