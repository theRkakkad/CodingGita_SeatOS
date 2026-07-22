import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import api from '../services/api';
import { socket } from '../services/socket';
import {
  Armchair, CheckCircle, Users, Grid, CalendarDays, User,
  ArrowRight, MapPin, HelpCircle, Sparkles,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [stats, setStats] = useState({ total: 0, booked: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const seatRes = await api.get('/api/student/my-seat');
      setBooking(seatRes.data.success && seatRes.data.hasBooking ? seatRes.data.booking : null);
      
      const classRes = await api.get('/api/classrooms');
      if (classRes.data.success) {
        let total = 0, booked = 0, available = 0;
        classRes.data.classrooms.forEach((c) => { total += c.totalSeats; booked += c.bookedSeats; available += c.availableSeats; });
        setStats({ total, booked, available });
      }

      const statusRes = await api.get('/api/seats/booking-status');
      if (statusRes.data.success) {
        setBookingOpen(statusRes.data.bookingOpen);
      }
    } catch (error) { console.error('Error fetching dashboard data:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchDashboardData();
    socket.on('classroom:update', fetchDashboardData);
    const handleSettingsUpdate = (data) => {
      if (data.bookingOpen !== undefined) setBookingOpen(data.bookingOpen);
    };
    socket.on('settings:update', handleSettingsUpdate);
    return () => {
      socket.off('classroom:update', fetchDashboardData);
      socket.off('settings:update', handleSettingsUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Student Dashboard" />
        <div className="flex-1 p-8 space-y-8 max-w-5xl">
          <div className="h-44 cg-skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 cg-skeleton" />)}
          </div>
          <div className="h-64 cg-skeleton" />
        </div>
      </div>
    );
  }

  const bookedPct = Number(((stats.booked / (stats.total || 1)) * 100).toFixed(1));

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Student Dashboard" />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-5xl">

        {/* ── Welcome Hero ── */}
        <section className="rounded-3xl p-8 relative overflow-hidden cg-fade-in"
          style={{
            background: 'linear-gradient(135deg, #12071f 0%, #2d0f80 50%, #5d21d1 100%)',
            border: '1px solid rgba(249,202,58,0.15)',
          }}>
          {/* Decorative orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #f9ca3a, transparent)' }} />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#f9ca3a' }}>
                  Portal Workspace
                </span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Welcome back, <span style={{ color: '#f9ca3a' }}>{user?.name?.split(' ')[0]}</span>!
              </h2>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium pt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="flex items-center gap-1.5"><User className="w-4 h-4" />No: {user?.enrollmentNo}</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />Academic Term: 2026-27</span>
              </div>
            </div>

            {booking ? (
              <button onClick={() => navigate('/my-seat')} className="cg-btn-gold py-3.5 px-7 rounded-2xl group shrink-0">
                <span>View My Seat</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : bookingOpen ? (
              <button onClick={() => navigate('/book-seat')} className="cg-btn-gold py-3.5 px-7 rounded-2xl group shrink-0">
                <span>Book a Seat</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button disabled className="py-3.5 px-7 rounded-2xl shrink-0 font-bold text-sm bg-neutral-800/40 text-neutral-500 border border-neutral-800/80 cursor-not-allowed">
                <span>Booking Closed</span>
              </button>
            )}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="space-y-3">
          <p className="section-label">Campus Seat Availability</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <DashboardCard title="Total System Seats" value={stats.total} icon={Grid} color="slate" subtext="Combined capacity of all classrooms" />
            <DashboardCard title="Booked Seats" value={stats.booked} icon={CheckCircle} color="red" subtext={`${bookedPct}% of total capacity filled`} />
            <DashboardCard title="Available Seats" value={stats.available} icon={Armchair} color="green" subtext="Open seats ready to reserve" />
          </div>
        </section>

        {/* ── Booking Summary ── */}
        <section className="rounded-3xl p-7 cg-card cg-fade-in">
          <div className="flex items-center justify-between pb-4 mb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-base font-bold text-white">Booking Summary</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'rgba(249,202,58,0.1)', color: '#f9ca3a', border: '1px solid rgba(249,202,58,0.2)' }}>
              Live Ticket
            </span>
          </div>

          {booking ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Seat info */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl space-y-4"
                  style={{ background: 'rgba(249,202,58,0.07)', border: '1px solid rgba(249,202,58,0.15)' }}>
                  {[
                    { icon: MapPin, label: 'Classroom', value: booking.classroom?.name },
                    { icon: Armchair, label: 'Seat Number', value: `Seat ${booking.seatNumber}` },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 ${i > 0 ? 'pt-3' : ''}`}
                      style={i > 0 ? { borderTop: '1px solid rgba(249,202,58,0.12)' } : {}}>
                      <div className="p-2.5 rounded-xl" style={{ background: 'rgba(249,202,58,0.12)' }}>
                        <item.icon className="w-5 h-5" style={{ color: '#f9ca3a' }} />
                      </div>
                      <div>
                        <p className="section-label">{item.label}</p>
                        <h4 className="text-base font-bold text-white mt-0.5">{item.value}</h4>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/my-seat')} className="cg-btn-gold w-full py-3 rounded-xl text-sm">
                  Manage My Booking
                </button>
              </div>

              {/* Info bullets */}
              <div className="flex flex-col justify-center space-y-4 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {[
                  `Your seat is verified for this academic session in ${booking.classroom?.name}.`,
                  'You may switch to any available seat in Classroom 1 or 2 at any time.',
                ].map((text, i) => (
                  <div key={i} className="flex gap-3">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="p-5 rounded-full" style={{ background: 'rgba(249,202,58,0.08)', border: '1px solid rgba(249,202,58,0.18)' }}>
                <HelpCircle className="w-10 h-10" style={{ color: '#f9ca3a' }} />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-white font-bold text-lg">
                  {bookingOpen ? 'No Seat Booked Yet' : 'Booking is Closed'}
                </h4>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {bookingOpen 
                    ? "You haven't reserved a seat in any lecture hall. Book now to secure your spot."
                    : "The seat booking portal is currently closed by the administrator. You cannot reserve new seats at this time."}
                </p>
              </div>
              {bookingOpen && (
                <button onClick={() => navigate('/book-seat')} className="cg-btn-gold py-3 px-7 rounded-xl text-sm">
                  Find & Reserve a Seat
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
