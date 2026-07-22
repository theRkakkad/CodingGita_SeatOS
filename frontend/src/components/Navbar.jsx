import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, LogOut, User as UserIcon, Sparkles, CheckCircle2 } from 'lucide-react';

const formatCurrentDate = () => {
  const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  return new Date().toLocaleDateString('en-US', options);
};

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mockNotifications = [
    {
      id: 1,
      icon: Sparkles,
      iconColor: '#f9ca3a',
      title: 'SeatSync Portal Active',
      text: 'System is configured and ready.',
      time: 'Just now',
    },
    {
      id: 2,
      icon: CheckCircle2,
      iconColor: '#10b981',
      title: 'Database Synchronized',
      text: 'Student records verified successfully.',
      time: '10 mins ago',
    },
  ];

  return (
    <header
      className="h-16 px-7 flex items-center justify-between shrink-0 relative"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        zIndex: 40,
      }}
    >
      {/* Title */}
      <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
        {title}
      </h2>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <div
          className="hidden md:flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-full select-none"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Calendar className="w-3.5 h-3.5" style={{ color: '#f9ca3a' }} />
          <span>{formatCurrentDate()}</span>
        </div>

        {/* Bell Button & Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: '#f9ca3a', boxShadow: '0 0 6px rgba(249,202,58,0.8)' }}
            />
            <Bell className="w-4 h-4 text-white" />
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2.5 w-80 rounded-2xl p-4 space-y-3.5 cg-fade-in shadow-2xl"
              style={{
                background: 'rgba(20, 12, 35, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
                color: '#fff',
              }}
            >
              <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#f9ca3a]/10 text-[#f9ca3a] border border-[#f9ca3a]/25">
                  2 New
                </span>
              </div>
              <div className="space-y-3">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="flex gap-3 text-xs leading-normal">
                    <div className="p-2 rounded-xl shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <notif.icon className="w-3.5 h-3.5" style={{ color: notif.iconColor }} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">{notif.title}</p>
                      <p style={{ color: 'rgba(255,255,255,0.45)' }}>{notif.text}</p>
                      <span className="text-[10px] block font-semibold text-neutral-500 pt-0.5">{notif.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* User Button & Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 text-left focus:outline-none rounded-xl p-1 transition-all"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: '#f9ca3a' }}>
                {user?.role === 'admin' ? 'System Admin' : 'Student'}
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm uppercase select-none"
              style={{ background: 'linear-gradient(135deg, #f9ca3a, #f5a623)', color: '#1a0900' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
          </button>

          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2.5 w-60 rounded-2xl p-2 space-y-1 cg-fade-in shadow-2xl"
              style={{
                background: 'rgba(20, 12, 35, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="px-4 py-3 pb-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold text-neutral-400">Signed in as</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{user?.name}</p>
                <p className="text-[10px] text-neutral-500 truncate mt-0.5">{user?.email}</p>
              </div>

              <div className="py-1">
                {user?.role !== 'admin' && (
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-neutral-300 hover:text-white transition-all"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                  >
                    <UserIcon className="w-4 h-4 text-neutral-400" />
                    <span>My Profile</span>
                  </button>
                )}

                {user?.role === 'admin' && (
                  <button
                    onClick={() => { setShowProfileMenu(false); navigate('/master/dashboard'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-neutral-300 hover:text-white transition-all"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                  >
                    <UserIcon className="w-4 h-4 text-neutral-400" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl transition-all"
                  style={{ color: '#fca5a5' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
