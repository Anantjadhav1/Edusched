import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { section: 'Main', items: [
    { path: '/',               label: 'Dashboard',         icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { path: '/infrastructure', label: 'Infrastructure',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { path: '/workconfig',     label: 'Work Config',       icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg> },
  ]},
  { section: 'Academic', items: [
    { path: '/structure',      label: 'Academic Structure', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
    { path: '/teachers',       label: 'Teachers',           icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { path: '/subjects',       label: 'Subject Allocation', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  ]},
  { section: 'Timetable', items: [
    { path: '/generate',       label: 'Generate',           icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
    { path: '/view',           label: 'View Timetable',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { path: '/reschedule',     label: 'Reschedule',         icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> },
    { path: '/download',       label: 'Download',           icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
  ]},
];

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── HEADER ── */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/')}>ES</div>
          <div className="header-brand">
            <div className="header-brand-name">EduSched</div>
            <div className="header-brand-sub">Academic Timetable System</div>
          </div>
        </div>
        <div className="header-right">
          <div className="avatar" title="Click to logout" onClick={logout} style={{ cursor: 'pointer' }}>
            {admin?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          {navItems.map(group => (
            <div key={group.section}>
              <div className="sidebar-section">{group.section}</div>
              {group.items.map(item => (
                <div
                  key={item.path}
                  className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                  style={isActive(item.path) ? {
                    background: '#1a2340',
                    color: '#7ba7f7',
                    borderLeftColor: '#3a5bc7',
                    boxShadow: 'inset 0 0 20px rgba(58,91,199,0.08)',
                  } : {}}
                >
                  <span className="sidebar-icon" style={{
                    color: isActive(item.path) ? '#7ba7f7' : '#6b7280',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* ── CONTENT ── */}
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}