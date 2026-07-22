import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SeatLayout from '../components/SeatLayout';
import Classroom3D from '../components/Classroom3D';
import Modal from '../components/Modal';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { Ticket, User, Hash, School, Armchair, Calendar, AlertTriangle, Trash2, RefreshCw, Info, Box, LayoutGrid } from 'lucide-react';

const MySeat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [classroomSeats, setClassroomSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [viewMode, setViewMode] = useState('3D');

  const fetchMySeatData = async () => {
    try {
      const res = await api.get('/api/student/my-seat');
      if (res.data.success && res.data.hasBooking) {
        setBooking(res.data.booking);
        const seatsRes = await api.get(`/api/classrooms/${res.data.booking.classroom._id}/seats`);
        if (seatsRes.data.success) setClassroomSeats(seatsRes.data.seats);
      } else {
        setBooking(null); setClassroomSeats([]);
      }
      const statusRes = await api.get('/api/seats/booking-status');
      if (statusRes.data.success) setBookingOpen(statusRes.data.bookingOpen);
    } catch (error) { console.error('Error fetching student booking details:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMySeatData(); }, []);

  useEffect(() => {
    const handleSettingsUpdate = (data) => {
      if (data.bookingOpen !== undefined) setBookingOpen(data.bookingOpen);
    };
    socket.on('settings:update', handleSettingsUpdate);
    return () => {
      socket.off('settings:update', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    socket.emit('join:student', { studentId: user._id });
    
    const handleBookingUpdated = (data) => {
      console.log('Real-time student booking update received:', data);
      fetchMySeatData();
    };

    socket.on('student:booking-updated', handleBookingUpdated);
    socket.on('classroom:update', fetchMySeatData);

    return () => {
      socket.emit('leave:student', { studentId: user._id });
      socket.off('student:booking-updated', handleBookingUpdated);
      socket.off('classroom:update', fetchMySeatData);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!booking?.classroom?._id) return;
    const classroomId = booking.classroom._id;
    socket.emit('join:classroom', { classroomId });
    const handleRealTimeSeats = () => {
      api.get(`/api/classrooms/${classroomId}/seats`).then((res) => { if (res.data.success) setClassroomSeats(res.data.seats); }).catch(console.error);
    };
    socket.on('seat:booked', handleRealTimeSeats);
    socket.on('seat:cancelled', handleRealTimeSeats);
    socket.on('seat:changed', handleRealTimeSeats);
    return () => {
      socket.emit('leave:classroom', { classroomId });
      socket.off('seat:booked', handleRealTimeSeats);
      socket.off('seat:cancelled', handleRealTimeSeats);
      socket.off('seat:changed', handleRealTimeSeats);
    };
  }, [booking?.classroom?._id]);

  const handleCancelBooking = async () => {
    setErrorMsg(''); setIsCancelling(true);
    try {
      const res = await api.delete('/api/seats/cancel');
      if (res.data.success) { setSuccessMsg('Booking successfully cancelled.'); setIsCancelModalOpen(false); setBooking(null); setClassroomSeats([]); }
    } catch (error) { setErrorMsg(error.response?.data?.message || 'Failed to cancel booking.'); }
    finally { setIsCancelling(false); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="My Booking" />
        <div className="flex-1 p-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-[500px] cg-skeleton" />
            <div className="lg:col-span-2 h-[500px] cg-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="My Seat Booking" />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl">
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl flex gap-3 text-sm font-semibold max-w-lg cg-fade-in"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#10b981' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {booking ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Ticket Card */}
            <div className="rounded-3xl overflow-hidden flex flex-col cg-fade-in"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* Ticket header */}
              <div className="p-6 flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg, rgba(93,33,209,0.6), rgba(124,58,237,0.4))', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(249,202,58,0.15)', border: '1px solid rgba(249,202,58,0.25)' }}>
                  <Ticket className="w-6 h-6" style={{ color: '#f9ca3a' }} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white leading-none" style={{ fontFamily: 'Poppins, sans-serif' }}>Seat Ticket</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1 block" style={{ color: '#f9ca3a' }}>CodingGita Verified ✓</span>
                </div>
              </div>

              {/* Seat Number Badge */}
              <div className="px-6 pt-6 pb-3 text-center">
                <div
                  className="inline-flex items-center justify-center w-24 h-24 rounded-3xl font-black text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, #f9ca3a, #f5a623)',
                    color: '#1a0900',
                    boxShadow: '0 8px 32px rgba(249,202,58,0.4)',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {booking.seatNumber}
                </div>
                <p className="section-label mt-2">Reserved Seat</p>
              </div>

              {/* Details */}
              <div className="px-6 pb-4 space-y-0 flex-1">
                {[
                  { icon: User, label: 'Student', value: user?.name },
                  { icon: Hash, label: 'Enrollment No', value: user?.enrollmentNo },
                  { icon: School, label: 'Classroom', value: booking.classroom?.name },
                  { icon: Calendar, label: 'Booked At', value: formatDate(booking.bookedAt) },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3.5"
                    style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    <item.icon className="w-4 h-4 shrink-0" style={{ color: '#f9ca3a' }} />
                    <div>
                      <p className="section-label mb-0.5">{item.label}</p>
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!bookingOpen && (
                <div className="mx-6 mb-3 p-3.5 rounded-xl flex gap-2 text-xs font-semibold"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                  <p>Seat booking is closed. Modifications and cancellations are locked.</p>
                </div>
              )}

              {/* Actions removed as requested */}
            </div>

            {/* Seat Map */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 rounded-2xl flex items-center gap-3 cg-fade-in"
                style={{ background: 'rgba(249,202,58,0.07)', border: '1px solid rgba(249,202,58,0.15)' }}>
                <Info className="w-5 h-5 shrink-0" style={{ color: '#f9ca3a' }} />
                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Your seat <strong className="text-amber-300">{booking.seatNumber}</strong> in{' '}
                  <strong className="text-white">{booking.classroom?.name}</strong> is highlighted in{' '}
                  <strong style={{ color: '#f9ca3a' }}>gold</strong>. Other booked seats are in red.
                </p>
              </div>

              <Classroom3D
                seats={classroomSeats}
                myBookedSeatId={booking.seat?._id}
                onSeatClick={() => {}}
                isLoading={false}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 rounded-3xl max-w-xl mx-auto p-8 text-center space-y-5 cg-fade-in cg-card">
            <div className="p-5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Armchair className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">No Booking Found</h3>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                You do not currently have a seat reserved in any lecture hall. Let's reserve one.
              </p>
            </div>
            <button onClick={() => navigate('/book-seat')} className="cg-btn-gold py-3 px-7 rounded-xl text-sm">
              Book Seat Now
            </button>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Seat Booking">
        <div className="space-y-5">
          <div className="p-4 rounded-2xl flex gap-3.5 text-sm font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p className="leading-relaxed">Are you sure you want to cancel your seat booking? Releasing the seat will make it available for other students immediately.</p>
          </div>
          {errorMsg && (
            <div className="p-3.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setIsCancelModalOpen(false)} className="py-3 px-4 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              No, Keep Booking
            </button>
            <button onClick={handleCancelBooking} disabled={isCancelling} className="cg-btn-danger py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5">
              {isCancelling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /><span>Yes, Cancel</span></>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MySeat;
