import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Armchair, Ticket, User, LogOut,
  School, ClipboardList, Users, Search,
} from 'lucide-react';
import FaceIdModal from './FaceIdModal';

const InfoSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isFaceIdOpen, setIsFaceIdOpen] = React.useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const infoAdminLinks = [
    { to: '/studentinfo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/studentinfo/booked-seats', label: 'Booked Seats', icon: ClipboardList },
    { to: '/studentinfo/profile', label: 'Profile', icon: User },
  ];

  const links = infoAdminLinks;

  return (
    <aside
      className="w-64 flex flex-col h-screen shrink-0"
      style={{
        background: 'linear-gradient(180deg, #12071f 0%, #1a0d35 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Brand */}
      <div className="px-6 py-5 flex flex-col items-center justify-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <img
          src="/codinggita-logo.svg"
          alt="CodingGita"
          className="h-8 w-auto"
        />
        <div className="flex items-center gap-2 justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#f9ca3a' }}>
            Info Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group"
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(135deg, rgba(249,202,58,0.15), rgba(245,166,35,0.08))', color: '#f9ca3a', border: '1px solid rgba(249,202,58,0.2)' }
                : { color: 'rgba(255,255,255,0.55)', border: '1px solid transparent' }
            }
          >
            {({ isActive }) => (
              <>
                <link.icon
                  className="w-4.5 h-4.5 shrink-0 transition-colors"
                  style={{ color: isActive ? '#f9ca3a' : 'rgba(255,255,255,0.4)', width: 18, height: 18 }}
                />
                <span>{link.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="flex items-center gap-3 p-3 rounded-2xl mb-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-400/50 transition-all"
            style={{ background: 'linear-gradient(135deg, #f9ca3a, #f5a623)', color: '#1a0900' }}
            onDoubleClick={() => setIsFaceIdOpen(true)}
            onClick={() => setIsFaceIdOpen(true)} // Added click as well for easier trigger
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {user?.role === 'info_admin' ? 'Info Admin' : user?.enrollmentNo}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{ color: 'rgba(255,100,100,0.7)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,100,100,0.7)'; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
      <FaceIdModal isOpen={isFaceIdOpen} onClose={() => setIsFaceIdOpen(false)} />
    </aside>
  );
};

export default InfoSidebar;
