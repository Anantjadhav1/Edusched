import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Download() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDiv, setSelectedDiv] = useState('');
  const [timetables, setTimetables] = useState([]);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('student');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [teacherList, setTeacherList] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/academic'),
      api.get('/timetable'),
      api.get('/workconfig'),
      api.get('/teachers'),
    ]).then(async ([y, tt, wc, tc]) => {
      const divs = (y.data.data || []).flatMap(yr =>
        (yr.divisions || []).map(d => ({ ...d, yearId: yr.yearId }))
      );
      setDivisions(divs);
      const summaryList = tt.data.data || [];
      const fullTTs = await Promise.all(
        summaryList.map(s => api.get('/timetable/' + s.divisionId).then(r => r.data.data).catch(() => null))
      );
      setTimetables(fullTTs.filter(Boolean));
      setConfig(wc.data.data);
      if (divs.length > 0) setSelectedDiv(divs[0].divisionId);
      const tcData = tc.data.data || tc.data || [];
      const teachers = Array.isArray(tcData)
        ? tcData.map(t => typeof t === 'string' ? t : t.name).filter(Boolean).sort()
        : [];
      setTeacherList(teachers);
      if (teachers.length > 0) setSelectedTeacher(teachers[0]);
    });
  }, []);

  const getLectureCount = (cells = []) =>
    cells.filter(c => !c.isFree && c.subjectName && c.subjectName !== '').length;

  const getYear = (divisionId = '') => divisionId.split('-')[0] || '';

  const teacherMatches = (cellTeacher = '', searchName = '') => {
    const search = searchName.trim().toLowerCase();
    const cell = cellTeacher.trim().toLowerCase();
    return search.split(' ').filter(w => w.length > 1).every(w => cell.includes(w));
  };

  const getTeacherCells = (teacherName) => {
    const result = [];
    timetables.forEach(tt => {
      const year = getYear(tt.divisionId);
      (tt.cells || []).forEach(cell => {
        if (!cell.isFree && cell.subjectName && cell.teacherName) {
          if (cell.subjectType === 'lab') {
            const tParts = cell.teacherName.split('|').map(t => t.trim());
            const sParts = cell.subjectName.split('|').map(s => s.trim());
            tParts.forEach((t, idx) => {
              if (teacherMatches(t, teacherName)) {
                let subj = (sParts[idx] || cell.subjectName).replace(/\(.*?\)/g, '').trim();
                result.push({ ...cell, subjectName: subj, teacherName: t, divisionId: tt.divisionId, year });
              }
            });
          } else {
            if (teacherMatches(cell.teacherName, teacherName)) {
              result.push({ ...cell, divisionId: tt.divisionId, year });
            }
          }
        }
      });
    });
    return result;
  };

  const getTeacherLoad = (teacherName) => {
    const cells = getTeacherCells(teacherName);
    const loadMap = {};
    cells.forEach(cell => {
      const key = `${cell.subjectName}__${cell.subjectType}__${cell.year}`;
      if (!loadMap[key]) loadMap[key] = { subject: cell.subjectName, type: cell.subjectType, year: cell.year, hrs: 0, divisions: new Set() };
      loadMap[key].hrs += 1;
      loadMap[key].divisions.add(cell.divisionId);
    });
    return Object.values(loadMap).map(l => ({ ...l, divisions: [...l.divisions].join(', ') }))
      .sort((a, b) => a.year.localeCompare(b.year) || a.subject.localeCompare(b.subject));
  };

  const buildExcelWs = (wsData, days) => {
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 13 }, ...days.map(() => ({ wch: 32 }))];
    ws['!rows'] = wsData.map(() => ({ hpt: 70 }));
    wsData.forEach((row, ri) => {
      row.forEach((val, ci) => {
        const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[ref]) return;
        let fill = 'FFFFFF', fontColor = '222222', bold = false;
        if (ri === 0) { fill = '1E2A5E'; fontColor = 'FFFFFF'; bold = true; }
        else if (ci === 0) { fill = 'EEF2FB'; bold = true; }
        else if (typeof val === 'string' && val.startsWith('LAB')) fill = 'FDECEA';
        else if (typeof val === 'string' && val.includes('THEORY')) fill = 'E3F0FF';
        else if (typeof val === 'string' && val.includes('TUTORIAL')) fill = 'E6F9EE';
        else if (val === 'Free') { fill = 'F5F5F5'; fontColor = 'AAAAAA'; }
        ws[ref].s = {
          fill: { patternType: 'solid', fgColor: { rgb: fill } },
          font: { sz: 9, bold, color: { rgb: fontColor } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } }
        };
      });
    });
    return ws;
  };

  const downloadStudentExcel = async (divId) => {
    try {
      const res = await api.get(`/timetable/${divId}`);
      const ttData = res.data.data;
      if (!ttData?.cells) { toast.error('No timetable found'); return; }
      const slots = config?.generatedSlots || [];
      const days = config?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const cells = ttData.cells || [];
      const wsData = [['Slot / Day', ...days]];
      slots.forEach((slot, si) => {
        const row = [slot.label || slot];
        days.forEach(day => {
          const cell = cells.find(c => c.day === day && c.slotIndex === si);
          if (!cell || cell.isFree || !cell.subjectName) { row.push('Free'); return; }
          if (cell.subjectType === 'lab') row.push('LAB\n' + cell.subjectName.split(' | ').join('\n') + '\n' + cell.roomLabel);
          else row.push(cell.subjectName + '\n' + (cell.subjectType || '').toUpperCase() + '\n' + cell.teacherName + '\n' + cell.roomLabel);
        });
        wsData.push(row);
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, buildExcelWs(wsData, days), divId);
      XLSX.writeFile(wb, 'Timetable_' + divId + '.xlsx', { cellStyles: true });
      toast.success('Downloaded ' + divId + '!');
    } catch { toast.error('Download failed'); }
  };

  const downloadAllStudentExcel = () => {
    timetables.forEach((tt, i) => setTimeout(() => downloadStudentExcel(tt.divisionId), i * 600));
  };

  const downloadTeacherExcel = () => {
    if (!selectedTeacher) return;
    const teacherCells = getTeacherCells(selectedTeacher);
    const load = getTeacherLoad(selectedTeacher);
    const days = config?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const slots = config?.generatedSlots || [];
    const wb = XLSX.utils.book_new();
    const loadData = [
      ['Subject', 'Year', 'Type', 'Hours/Week', 'Divisions'],
      ...load.map(l => [l.subject, l.year, l.type.toUpperCase(), l.hrs + ' hrs', l.divisions]),
      ['', '', 'TOTAL', load.reduce((a, l) => a + l.hrs, 0) + ' hrs/week', ''],
    ];
    const loadWs = XLSX.utils.aoa_to_sheet(loadData);
    loadWs['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, loadWs, 'Load Summary');
    const wsData = [['Slot / Day', ...days]];
    slots.forEach((slot, si) => {
      const row = [slot.label || slot];
      days.forEach(day => {
        const cell = teacherCells.find(c => c.day === day && c.slotIndex === si);
        if (!cell) { row.push('Free'); return; }
        if (cell.subjectType === 'lab') row.push('LAB\n' + cell.subjectName + '\n[' + cell.year + '] ' + cell.divisionId + '\n' + cell.roomLabel);
        else row.push(cell.subjectName + '\n' + (cell.subjectType || '').toUpperCase() + '\n[' + cell.year + '] ' + cell.divisionId + '\n' + cell.roomLabel);
      });
      wsData.push(row);
    });
    XLSX.utils.book_append_sheet(wb, buildExcelWs(wsData, days), 'Timetable');
    XLSX.writeFile(wb, 'Teacher_' + selectedTeacher.replace(/\s+/g, '_') + '.xlsx', { cellStyles: true });
    toast.success('Downloaded ' + selectedTeacher + ' timetable!');
  };

  const downloadTeacherPDF = () => {
    if (!selectedTeacher) return;
    const teacherCells = getTeacherCells(selectedTeacher);
    const load = getTeacherLoad(selectedTeacher);
    const days = config?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const slots = config?.generatedSlots || [];
    const totalHrs = load.reduce((a, l) => a + l.hrs, 0);
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(18); doc.setTextColor(30, 42, 94); doc.setFont('helvetica', 'bold');
    doc.text('EduSched — Teacher Timetable', 14, 16);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
    doc.text('Teacher: ' + selectedTeacher, 14, 24);
    doc.text('Total Hours/Week: ' + totalHrs + ' hrs', 14, 30);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 42, 94);
    doc.text('Weekly Load Summary', 14, 42);
    autoTable(doc, {
      startY: 46,
      head: [['Subject', 'Year', 'Type', 'Hrs/Week', 'Divisions']],
      body: [...load.map(l => [l.subject, l.year, l.type.toUpperCase(), l.hrs + ' hrs', l.divisions]), ['', '', 'TOTAL', totalHrs + ' hrs/week', '']],
      headStyles: { fillColor: [30, 42, 94], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 15 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 60 } },
      margin: { left: 14 },
    });
    const afterLoad = doc.lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 42, 94);
    doc.text('Weekly Timetable', 14, afterLoad);
    const ttHead = [['Slot', ...days]];
    const ttBody = slots.map((slot, si) => {
      const row = [slot.label || slot];
      days.forEach(day => {
        const cell = teacherCells.find(c => c.day === day && c.slotIndex === si);
        if (!cell) { row.push(''); return; }
        if (cell.subjectType === 'lab') row.push('LAB\n' + cell.subjectName + '\n[' + cell.year + '] ' + cell.divisionId + '\n' + cell.roomLabel);
        else row.push(cell.subjectName + '\n' + (cell.subjectType || '').toUpperCase() + '\n[' + cell.year + '] ' + cell.divisionId + '\n' + cell.roomLabel);
      });
      return row;
    });
    autoTable(doc, {
      startY: afterLoad + 4, head: ttHead, body: ttBody,
      headStyles: { fillColor: [30, 42, 94], fontSize: 8, halign: 'center' },
      bodyStyles: { fontSize: 7.5, halign: 'center', valign: 'middle', cellPadding: 3, minCellHeight: 20 },
      columnStyles: { 0: { cellWidth: 22, fillColor: [238, 242, 251], fontStyle: 'bold' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('LAB')) data.cell.styles.fillColor = [253, 236, 234];
          else if (val.includes('THEORY')) data.cell.styles.fillColor = [227, 240, 255];
          else if (val.includes('TUTORIAL')) data.cell.styles.fillColor = [230, 249, 238];
        }
      },
      margin: { left: 14 },
    });
    doc.save('Teacher_' + selectedTeacher.replace(/\s+/g, '_') + '.pdf');
    toast.success('PDF downloaded!');
  };

  const teacherCells = selectedTeacher ? getTeacherCells(selectedTeacher) : [];
  const teacherLoad  = selectedTeacher ? getTeacherLoad(selectedTeacher) : [];
  const totalHrs = teacherLoad.reduce((a, l) => a + l.hrs, 0);
  const slots = config?.generatedSlots || [];
  const days  = config?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const slotBg = (type) => {
    if (type === 'lab') return { bg: '#FDECEA', accent: '#e24b4a' };
    if (type === 'tutorial') return { bg: '#E6F9EE', accent: '#1caa6b' };
    return { bg: '#E3F0FF', accent: '#3a5bc7' };
  };

  const yearChipStyle = (year) => {
    if (year === 'SY') return { background: '#1a5fb4', color: '#fff' };
    if (year === 'TY') return { background: '#2e7d52', color: '#fff' };
    return { background: '#c01c28', color: '#fff' };
  };

  return (
    <div>
      <div className="breadcrumb">Home / <span>Download</span></div>
      <div className="page-header"><h1>Download Timetables</h1></div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['student', 'teacher'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={'btn ' + (activeTab === tab ? 'btn-primary' : 'btn-outline')}>
            {tab === 'student' ? 'Student TT' : 'Teacher TT'}
          </button>
        ))}
      </div>

      {/* Student Tab */}
      {activeTab === 'student' && (
        <>
          <div className="section-card">
            <h2>Student Timetable</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <label style={{ fontWeight: 700, color: '#94a3b8' }}>Division:</label>
              <select className="form-select" style={{ width: 'auto', minWidth: 180 }}
                value={selectedDiv} onChange={e => setSelectedDiv(e.target.value)}>
                {divisions.map(d => <option key={d.divisionId} value={d.divisionId}>{d.divisionId} – {d.label}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => downloadStudentExcel(selectedDiv)}>Download Excel</button>
              <button className="btn btn-outline" onClick={downloadAllStudentExcel}>Download All</button>
            </div>
          </div>

          <div className="section-card">
            <h2>Generated Timetables Summary</h2>
            {timetables.length === 0 ? (
              <div className="empty-state"><p>No timetables generated yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Division</th><th>Year</th><th>Lectures Scheduled</th><th>Generated</th></tr></thead>
                  <tbody>
                    {timetables.map(tt => (
                      <tr key={tt._id}>
                        <td style={{ fontWeight: 600 }}>{tt.divisionId}</td>
                        <td>{tt.yearId}</td>
                        <td><span style={{ background: '#1a2340', color: '#7ba7f7', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{getLectureCount(tt.cells)} lectures</span></td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{new Date(tt.generatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Teacher Tab */}
      {activeTab === 'teacher' && (
        <>
          <div className="section-card">
            <h2>Teacher Timetable</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <label style={{ fontWeight: 700, color: '#94a3b8' }}>Teacher:</label>
              <select className="form-select" style={{ width: 'auto', minWidth: 240 }}
                value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                {teacherList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={downloadTeacherExcel}>Download Excel</button>
              <button className="btn btn-danger" onClick={downloadTeacherPDF}>Download PDF</button>
            </div>
          </div>

          {/* Load Summary */}
          {selectedTeacher && (
            <div className="section-card">
              <h2>Weekly Load — {selectedTeacher}</h2>
              <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, color: '#7ba7f7' }}>
                Total: {totalHrs} hrs/week
              </div>
              {teacherLoad.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No classes assigned — teacher name may not match TT data.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Subject</th><th>Year</th><th>Type</th><th>Hrs/Week</th><th>Divisions</th><th>Load</th></tr>
                    </thead>
                    <tbody>
                      {teacherLoad.map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{l.subject}</td>
                          <td>
                            <span style={{ ...yearChipStyle(l.year), padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>{l.year}</span>
                          </td>
                          <td><span className={`badge ${l.type}`}>{l.type}</span></td>
                          <td style={{ fontWeight: 600 }}>{l.hrs} hrs</td>
                          <td style={{ fontSize: 11, color: '#6b7280' }}>{l.divisions}</td>
                          <td>
                            <div style={{ background: '#1e2336', borderRadius: 6, height: 8, width: 100 }}>
                              <div style={{
                                background: l.type === 'lab' ? '#e24b4a' : l.type === 'tutorial' ? '#1caa6b' : '#3a5bc7',
                                width: Math.min(100, (l.hrs / 10) * 100) + '%',
                                height: '100%', borderRadius: 6,
                              }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Teacher TT Grid — white cells */}
          {selectedTeacher && teacherCells.length > 0 && (
            <div className="section-card">
              <h2>Weekly Timetable of {selectedTeacher}</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 900, borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#1E2A5E', color: '#fff', padding: '10px 8px', minWidth: 80, fontSize: 12, border: '1px solid #2a3a6a' }}>DAY / SLOT</th>
                      {slots.map((slot, si) => (
                        <th key={si} style={{ background: '#1E2A5E', color: '#fff', padding: '8px 6px', fontSize: 11, minWidth: 95, border: '1px solid #2a3a6a' }}>
                          {slot.label || slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => (
                      <tr key={day}>
                        <td style={{ fontWeight: 700, background: '#EEF2FB', padding: '8px 10px', textAlign: 'center', color: '#1E2A5E', border: '1px solid #ddd', fontSize: 13 }}>
                          {day}
                        </td>
                        {slots.map((slot, si) => {
                          const cell = teacherCells.find(c => c.day === day && c.slotIndex === si);
                          if (!cell) return (
                            <td key={si} style={{ background: '#F8F8F8', padding: 6, textAlign: 'center', fontSize: 11, color: '#bbb', border: '1px solid #eee' }}>—</td>
                          );
                          const { bg, accent } = slotBg(cell.subjectType);
                          return (
                            <td key={si} style={{ background: '#ffffff', padding: 4, border: '1px solid #eee', verticalAlign: 'top', minWidth: 95 }}>
                              <div style={{ borderLeft: `3px solid ${accent}`, background: bg, borderRadius: 4, padding: '5px 7px' }}>
                                <div style={{ fontWeight: 700, fontSize: 11, color: '#1E2A5E', marginBottom: 2 }}>
                                  {cell.subjectName?.replace(/\(.*?\)/g, '').trim()}
                                </div>
                                <div style={{ fontSize: 10, marginTop: 2 }}>
                                  <span style={{ ...yearChipStyle(cell.year), borderRadius: 3, padding: '1px 4px', fontSize: 9, display: 'inline-block' }}>
                                    {cell.year}
                                  </span>
                                  {' '}<span style={{ color: '#475569' }}>{cell.divisionId}</span>
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{cell.roomLabel}</div>
                                <span style={{ fontSize: 9, background: accent, color: '#fff', borderRadius: 3, padding: '1px 4px', marginTop: 2, display: 'inline-block' }}>
                                  {cell.subjectType}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}