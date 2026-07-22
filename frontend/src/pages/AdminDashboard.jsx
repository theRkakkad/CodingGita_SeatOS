import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import api from '../services/api';
import { socket } from '../services/socket';
import { Users, CheckCircle, Armchair, TrendingUp, School, ArrowRight, Zap, Check, X, Mail, Download } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const navigate = useNavigate();

  const fetchAdminStats = async () => {
    try {
      const res = await api.get('/api/master/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch (error) { console.error('Error loading admin statistics:', error); }
    finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/master/settings');
      if (res.data.success) {
        setBookingOpen(res.data.settings.bookingOpen);
        setEmailEnabled(res.data.settings.emailEnabled !== false);
      }
    } catch (error) {
      console.error('Error loading admin settings:', error);
    }
  };

  const toggleBooking = async (status) => {
    try {
      const res = await api.post('/api/master/settings', { bookingOpen: status });
      if (res.data.success) {
        setBookingOpen(status);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const toggleEmail = async (status) => {
    try {
      const res = await api.post('/api/master/settings', { emailEnabled: status });
      if (res.data.success) {
        setEmailEnabled(status);
      }
    } catch (error) {
      console.error('Error updating email setting:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/api/admin/export/bookings', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bookings_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchSettings();
    socket.on('classroom:update', fetchAdminStats);
    socket.on('settings:update', (data) => {
      if (data.bookingOpen !== undefined) setBookingOpen(data.bookingOpen);
    });
    return () => {
      socket.off('classroom:update', fetchAdminStats);
      socket.off('settings:update');
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Admin Dashboard" />
        <div className="flex-1 p-8 space-y-8 max-w-6xl">
          <div className="h-36 cg-skeleton" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 cg-skeleton" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-72 cg-skeleton" />
            <div className="h-72 cg-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Admin Dashboard" />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-6xl">

        {/* ── Hero ── */}
        <section className="rounded-3xl p-8 relative overflow-hidden cg-fade-in"
          style={{
            background: 'linear-gradient(135deg, #12071f 0%, #2d0f80 50%, #5d21d1 100%)',
            border: '1px solid rgba(249,202,58,0.15)',
          }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, #f9ca3a, transparent)' }} />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
          </div>
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f9ca3a' }}>System Overview</span>
              </div>
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                CodingGita Classroom Admin
              </h2>
              <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Manage seat allocations and monitor real-time occupancy
              </p>
            </div>
            <img src="/codinggita-logo.svg" alt="CodingGita"
              className="h-8 w-auto opacity-50 hidden md:block" />
          </div>
        </section>

        {/* ── Stats Grid ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label mb-0">System Statistics</p>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#5d21d1] hover:bg-[#4b19aa] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <DashboardCard title="Registered Students" value={stats?.totalStudents ?? '—'} icon={Users} color="slate" />
            <DashboardCard title="Total Booked Seats" value={stats?.totalBookedSeats ?? '—'} icon={CheckCircle} color="red" />
            <DashboardCard title="Available Seats" value={stats?.totalAvailableSeats ?? '—'} icon={Armchair} color="green" />
            <DashboardCard title="Booking Rate" value={`${stats?.overallBookingPercentage ?? 0}%`} icon={TrendingUp} color="gold" />
          </div>
        </section>

        {/* ── System Management ── */}
        <section className="space-y-3">
          <p className="section-label">System Controls</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {/* Seat Booking Settings Card */}
            <div className="rounded-3xl overflow-hidden flex flex-col cg-fade-in"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              
              {/* Card Header */}
              <div className="p-6 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Seat Booking</h4>
                </div>
                {/* Dynamic Status Badge */}
                {bookingOpen ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    OPEN
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    CLOSED
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 flex items-center gap-4">
                <div className="p-3.5 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(249,202,58,0.07)', border: '1px solid rgba(249,202,58,0.15)' }}>
                  <Armchair className="w-6 h-6" style={{ color: '#f9ca3a' }} />
                </div>
                <div>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Allow students to book and change their seats.
                  </p>
                </div>
              </div>

              {/* Card Footer: Control Buttons */}
              <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {/* OPEN Button */}
                <button
                  type="button"
                  onClick={() => toggleBooking(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    bookingOpen
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                      : 'bg-transparent border border-emerald-600/35 hover:border-emerald-600/60 text-emerald-400/80 hover:text-emerald-400'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>OPEN</span>
                </button>

                {/* CLOSED Button */}
                <button
                  type="button"
                  onClick={() => toggleBooking(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    !bookingOpen
                      ? 'bg-[#c2410c] hover:bg-[#b45309] text-white shadow-lg shadow-amber-900/20'
                      : 'bg-transparent border border-amber-700/35 hover:border-amber-700/60 text-amber-500/80 hover:text-amber-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>CLOSED</span>
                </button>
              </div>
            </div>

            {/* Email Notifications Settings Card */}
            <div className="rounded-3xl overflow-hidden flex flex-col cg-fade-in"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              
              {/* Card Header */}
              <div className="p-6 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Email Notifications</h4>
                </div>
                {/* Dynamic Status Badge */}
                {emailEnabled ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ON
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    OFF
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 flex items-center gap-4">
                <div className="p-3.5 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <Mail className="w-6 h-6" style={{ color: '#a78bfa' }} />
                </div>
                <div>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Toggle mail dispatches globally from the portal.
                  </p>
                </div>
              </div>

              {/* Card Footer: Control Buttons */}
              <div className="p-5 flex gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {/* ON Button */}
                <button
                  type="button"
                  onClick={() => toggleEmail(true)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    emailEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                      : 'bg-transparent border border-emerald-600/35 hover:border-emerald-600/60 text-emerald-400/80 hover:text-emerald-400'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>ON</span>
                </button>

                {/* OFF Button */}
                <button
                  type="button"
                  onClick={() => toggleEmail(false)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    !emailEnabled
                      ? 'bg-[#c2410c] hover:bg-[#b45309] text-white shadow-lg shadow-amber-900/20'
                      : 'bg-transparent border border-amber-700/35 hover:border-amber-700/60 text-amber-500/80 hover:text-amber-500'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>OFF</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Classroom Cards ── */}
        <section className="space-y-3">
          <p className="section-label">Classroom Occupancy</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {stats?.classrooms?.map((cls, idx) => {
              const pct = cls.bookingPercentage || 0;
              const isHigh = pct > 75;

              return (
                <div key={cls._id}
                  className="rounded-3xl overflow-hidden flex flex-col cg-fade-in"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animationDelay: `${idx * 0.1}s` }}>

                  {/* Card Header */}
                  <div className="p-6 flex items-center justify-between"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl"
                        style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)' }}>
                        <School className="w-5 h-5" style={{ color: '#f9ca3a' }} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{cls.name}</h4>
                        <span className="section-label mt-0.5 block">Lecture Hall</span>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: 'rgba(249,202,58,0.1)', color: '#f9ca3a', border: '1px solid rgba(249,202,58,0.2)' }}>
                      {cls.capacity} Seats
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="p-6 flex-1 space-y-5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: 'Booked', value: cls.bookedSeats, color: '#ef4444' },
                        { label: 'Available', value: cls.availableSeats, color: '#10b981' },
                        { label: 'Filled', value: `${pct}%`, color: '#f9ca3a' },
                      ].map((s) => (
                        <div key={s.label} className="p-3 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <span className="section-label block mb-1">{s.label}</span>
                          <p className="text-xl font-black" style={{ color: s.color, fontFamily: 'Poppins, sans-serif' }}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <span>OCCUPANCY</span>
                        <span style={{ color: isHigh ? '#ef4444' : '#f9ca3a' }}>{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: isHigh
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : 'linear-gradient(90deg, #f9ca3a, #f5a623)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button
                      onClick={() => navigate(`/master/classroom/${cls.code}`)}
                      className="cg-btn-gold w-full py-3 rounded-2xl group text-sm"
                    >
                      <span>View Seating Grid</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
