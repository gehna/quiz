import { NavLink } from 'react-router-dom'

const baseItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  textDecoration: 'none',
  color: '#444',
  padding: '8px 0',
  flex: 1,
}

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function IconFish() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12c4-4 10-4 14 0-4 4-10 4-14 0z" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <path d="M17 10l4 2-4 2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

function IconArrows() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5v6M8 5l-2 2M8 5l2 2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 19v-6M16 19l-2-2M16 19l2-2" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconReport() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 14l2-2 2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default function BottomNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        bottom: 0,
        borderTop: '1px solid #e5e5ea',
        background: '#fff',
        display: 'flex',
        paddingBottom: 'calc(4px + env(safe-area-inset-bottom))',
        paddingTop: 4,
      }}
    >
      <NavLink to="/judges" style={({ isActive }) => ({ ...baseItemStyle, color: isActive ? '#0b5' : '#444' })}>
        <IconUser />
        <span style={{ fontSize: 12 }}>Судьи</span>
      </NavLink>
      <NavLink to="/stages" style={({ isActive }) => ({ ...baseItemStyle, color: isActive ? '#0b5' : '#444' })}>
        <IconFish />
        <span style={{ fontSize: 12 }}>Этапы</span>
      </NavLink>
      <NavLink to="/distribution" style={({ isActive }) => ({ ...baseItemStyle, color: isActive ? '#0b5' : '#444' })}>
        <IconArrows />
        <span style={{ fontSize: 12 }}>Распределение</span>
      </NavLink>
      <NavLink to="/report" style={({ isActive }) => ({ ...baseItemStyle, color: isActive ? '#0b5' : '#444' })}>
        <IconReport />
        <span style={{ fontSize: 12 }}>Отчет</span>
      </NavLink>
    </nav>
  )
}


