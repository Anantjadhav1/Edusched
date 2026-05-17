import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const icons = {
  infrastructure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  workconfig: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  structure: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  teachers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  subjects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  generate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  reschedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  rooms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  ),
  divisions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  teachersStat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
  ),
  subjectsStat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  timetables: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

const modules = [
  { key: 'infrastructure', label: 'Infrastructure',     path: '/infrastructure', bg: '#1a2340', iconBg: '#3a5bc7' },
  { key: 'workconfig',     label: 'Work Config',         path: '/workconfig',     bg: '#2a1f0a', iconBg: '#c47800' },
  { key: 'structure',      label: 'Academic Structure',  path: '/structure',      bg: '#0f2a1e', iconBg: '#1caa6b' },
  { key: 'teachers',       label: 'Teacher Management',  path: '/teachers',       bg: '#1e1535', iconBg: '#9b5de5' },
  { key: 'subjects',       label: 'Subject Allocation',  path: '/subjects',       bg: '#2a1510', iconBg: '#f07850' },
  { key: 'generate',       label: 'Generate Timetable',  path: '/generate',       bg: '#1a2340', iconBg: '#3a5bc7' },
  { key: 'view',           label: 'View Timetable',      path: '/view',           bg: '#0a2530', iconBg: '#1ab8e0' },
  { key: 'reschedule',     label: 'Reschedule',          path: '/reschedule',     bg: '#2a200a', iconBg: '#c48a00' },
  { key: 'download',       label: 'Download',            path: '/download',       bg: '#0a1a2a', iconBg: '#1a78c4' },
];

const statCards = [
  { key: 'rooms',       label: 'Total Rooms', iconKey: 'rooms',       bg: '#1a2340', iconBg: '#3a5bc7', glow: '#3a5bc7' },
  { key: 'divisions',   label: 'Divisions',   iconKey: 'divisions',   bg: '#0f2a1e', iconBg: '#1caa6b', glow: '#1caa6b' },
  { key: 'teachers',    label: 'Teachers',    iconKey: 'teachersStat',bg: '#2a1f0a', iconBg: '#c47800', glow: '#c47800' },
  { key: 'subjects',    label: 'Subjects',    iconKey: 'subjectsStat',bg: '#1e1535', iconBg: '#9b5de5', glow: '#9b5de5' },
  { key: 'timetables',  label: 'Timetables',  iconKey: 'timetables',  bg: '#2a1510', iconBg: '#f07850', glow: '#f07850' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ rooms: 0, divisions: 0, teachers: 0, subjects: 0, timetables: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/infrastructure'),
      api.get('/academic'),
      api.get('/teachers'),
      api.get('/subjects'),
      api.get('/timetable'),
    ]).then(([rooms, years, teachers, subjects, timetables]) => {
      const divs = (years.data.data || []).reduce((a, y) => a + (y.divisions?.length || 0), 0);
      setStats({
        rooms:      rooms.data.data?.length || 0,
        divisions:  divs,
        teachers:   teachers.data.data?.length || 0,
        subjects:   subjects.data.data?.length || 0,
        timetables: timetables.data.data?.length || 0,
      });
    }).catch(() => {});
  }, []);

  const filtered = modules.filter(m => m.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="breadcrumb">Home / <span>Dashboard</span></div>
      <div className="page-header">
        <h1>Welcome, Admin</h1>
        <p>Manage your institution's academic scheduling from one place.</p>
      </div>

      {/* Stats */}
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
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: s.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              marginBottom: 12,
              boxShadow: `0 4px 12px ${s.glow}55`,
            }}>
              {icons[s.iconKey]}
            </div>
            <div className="stat-value">{stats[s.key]}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="module-search-wrap">
        <div className="module-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search Module"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Module Grid */}
      <div className="module-grid">
        {filtered.map(m => (
          <div
            className="module-card"
            key={m.path}
            onClick={() => navigate(m.path)}
            style={{ background: m.bg, border: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <div className="module-card-top">
              <div
                className="module-icon-circle"
                style={{
                  background: m.iconBg,
                  color: '#fff',
                  border: 'none',
                  boxShadow: `0 4px 14px ${m.iconBg}55`,
                }}
              >
                {icons[m.key]}
              </div>
            </div>
            <div className="module-card-bottom" style={{ color: '#e2e8f0' }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}