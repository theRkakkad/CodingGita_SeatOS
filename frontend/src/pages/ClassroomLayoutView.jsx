import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SeatLayout from '../components/SeatLayout';
import Classroom3D from '../components/Classroom3D';
import Modal from '../components/Modal';
import WebcamModal from '../components/WebcamModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socket } from '../services/socket';
import { Armchair, ArrowLeft, Check, CheckCircle2, User, Hash, Info, AlertTriangle, Box, LayoutGrid } from 'lucide-react';

const ClassroomLayoutView = () => {
  const { classroomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [myBooking, setMyBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailSeat, setDetailSeat] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('3D');

  const fetchClassroomAndSeats = async () => {
    try {
      const classRes = await api.get(`/api/classrooms/${classroomId}`);
      if (classRes.data.success) setClassroom(classRes.data.classroom);
      const seatsRes = await api.get(`/api/classrooms/${classroomId}/seats`);
      if (seatsRes.data.success) setSeats(seatsRes.data.seats);
      const mySeatRes = await api.get('/api/student/my-seat');
      if (mySeatRes.data.success && mySeatRes.data.hasBooking) setMyBooking(mySeatRes.data.booking);
      else setMyBooking(null);

      const statusRes = await api.get('/api/seats/booking-status');
      if (statusRes.data.success) setBookingOpen(statusRes.data.bookingOpen);
    } catch (error) {
      console.error('Error loading classroom view:', error);
      setErrorMsg('Failed to load classroom layout.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    // SECURITY ENFORCEMENT: Lock student to their assigned classroom
    if (user && user.role === 'student' && user.assignedClassroom) {
      const assignedId = typeof user.assignedClassroom === 'object'
        ? user.assignedClassroom._id
        : user.assignedClassroom;
      
      if (classroomId !== assignedId) {
        navigate(`/book-seat/${assignedId}`, { replace: true });
        return;
      }
    }

    setLoading(true);
    fetchClassroomAndSeats();
    socket.emit('join:classroom', { classroomId });
    const handleRealTimeSeatEvent = () => {
      api.get(`/api/classrooms/${classroomId}/seats`).then((res) => { if (res.data.success) setSeats(res.data.seats); }).catch(console.error);
      api.get('/api/student/my-seat').then((res) => { if (res.data.success) setMyBooking(res.data.hasBooking ? res.data.booking : null); }).catch(console.error);
    };
    socket.on('seat:booked', handleRealTimeSeatEvent);
    socket.on('seat:cancelled', handleRealTimeSeatEvent);
    socket.on('seat:changed', handleRealTimeSeatEvent);
    socket.on('settings:update', (data) => {
      if (data.bookingOpen !== undefined) setBookingOpen(data.bookingOpen);
    });
    return () => {
      socket.emit('leave:classroom', { classroomId });
      socket.off('seat:booked', handleRealTimeSeatEvent);
      socket.off('seat:cancelled', handleRealTimeSeatEvent);
      socket.off('seat:changed', handleRealTimeSeatEvent);
      socket.off('settings:update');
    };
  }, [classroomId, user, navigate]);

  const handleSeatClick = (seat) => {
    setErrorMsg(''); setSuccessMsg('');
    if (seat.isBooked) {
      if (myBooking && seat._id === myBooking.seat?._id) { navigate('/my-seat'); return; }
      setDetailSeat(seat); setIsDetailModalOpen(true); return;
    }
    if (!bookingOpen) {
      setErrorMsg('Seat booking is currently closed.');
      return;
    }
    if (selectedSeat && selectedSeat._id === seat._id) setSelectedSeat(null);
    else setSelectedSeat(seat);
  };

  const handleConfirmBookingClick = () => {
    setIsWebcamModalOpen(true);
  };

  const submitBooking = async (photo, latitude, longitude) => {
    if (!selectedSeat) return;
    setErrorMsg(''); setSuccessMsg(''); setIsSubmitting(true);
    setIsWebcamModalOpen(false);
    try {
      if (myBooking) {
        const res = await api.put('/api/seats/change', { newSeatId: selectedSeat._id, photo, latitude, longitude });
        if (res.data.success) { setSuccessMsg(res.data.message); setSelectedSeat(null); fetchClassroomAndSeats(); }
      } else {
        const res = await api.post('/api/seats/book', { seatId: selectedSeat._id, photo, latitude, longitude });
        if (res.data.success) { setSuccessMsg(res.data.message); setSelectedSeat(null); fetchClassroomAndSeats(); }
      }
    } catch (err) { setErrorMsg(err.response?.data?.message || 'Booking failed. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Loading Seating..." />
        <div className="flex-1 p-8 max-w-6xl">
          <div className="h-8 w-40 cg-skeleton mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[480px] cg-skeleton" />
            <div className="h-96 cg-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title={classroom?.name || 'Classroom Seats'} />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl">
        {/* Back */}
        <div className="mb-6">
          <Link to="/book-seat"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-all"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f9ca3a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Classroom Selection
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Seat Layout Viewport */}
          <div className="lg:col-span-2 space-y-4">
            <Classroom3D
              seats={seats}
              selectedSeat={selectedSeat}
              myBookedSeatId={myBooking?.seat?._id}
              onSeatClick={handleSeatClick}
              isLoading={false}
            />
          </div>

          {/* Panel */}
          <div className="space-y-5">
            {/* Reservation Panel */}
            <div className="rounded-2xl p-6 cg-card cg-fade-in">
              <h3 className="text-base font-bold text-white flex items-center gap-2 pb-4 mb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Armchair className="w-5 h-5" style={{ color: '#f9ca3a' }} />
                Seat Reservation
              </h3>

              {!bookingOpen && (
                <div className="mb-5 p-4 rounded-xl flex gap-3 text-sm font-semibold leading-relaxed"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
                  <div>
                    <span className="block font-bold">Booking Closed</span>
                    <span className="text-xs opacity-85">The seat booking portal is temporarily closed by the administrator.</span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3.5 rounded-xl flex gap-3 text-sm font-semibold"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#10b981' }} />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-xl flex gap-3 text-sm font-semibold"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {selectedSeat ? (
                <div className="space-y-5">
                  {/* Seat badge */}
                  <div className="text-center p-4 rounded-2xl"
                    style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)' }}>
                    <p className="section-label mb-1">Selected Seat</p>
                    <h4 className="text-4xl font-black" style={{ color: '#f9ca3a', fontFamily: 'Poppins, sans-serif' }}>
                      {selectedSeat.seatNumber}
                    </h4>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5 text-sm font-semibold">
                    {[
                      { label: 'Student', value: user?.name },
                      { label: 'Enrollment', value: user?.enrollmentNo },
                      { label: 'Classroom', value: classroom?.name },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                        <span className="text-white font-bold">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {myBooking && (
                    <div className="p-3 rounded-xl flex gap-2 text-xs font-semibold"
                      style={{ background: 'rgba(249,202,58,0.07)', border: '1px solid rgba(249,202,58,0.2)', color: '#f9ca3a' }}>
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Confirming will release seat <strong>{myBooking.seatNumber}</strong> and assign you this new seat.</p>
                    </div>
                  )}

                  <button onClick={handleConfirmBookingClick} disabled={isSubmitting || !bookingOpen}
                    className={`w-full py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 ${
                      !bookingOpen 
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50' 
                        : 'cg-btn-gold'
                    }`}>
                    {isSubmitting
                      ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : <><Check className="w-4 h-4" /><span>{myBooking ? 'Confirm Seat Change' : 'Confirm Booking'}</span></>
                    }
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <Armchair className="w-12 h-12 mx-auto opacity-20 text-white" />
                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>No Seat Selected</p>
                  <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Click any green seat in the grid to select it and confirm your booking.
                  </p>
                </div>
              )}
            </div>

            {/* Policy */}
            <div className="p-5 rounded-2xl text-xs space-y-2"
              style={{ background: 'rgba(249,202,58,0.05)', border: '1px solid rgba(249,202,58,0.12)' }}>
              <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                <Info className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                Booking Policy
              </span>
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>1. Only one seat per student across the campus.</p>
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>2. Double-booking is strictly prohibited at the database level.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Webcam Modal for Booking Confirmation */}
      <WebcamModal
        isOpen={isWebcamModalOpen}
        onClose={() => setIsWebcamModalOpen(false)}
        onConfirm={submitBooking}
      />

      {/* Booked Seat Info Modal */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Booked Seat Details">
        {detailSeat && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center p-5 rounded-2xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl select-none mb-2"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontFamily: 'Poppins, sans-serif' }}>
                {detailSeat.seatNumber}
              </div>
              <p className="section-label">Booked Seat</p>
            </div>
            <div className="space-y-3 text-sm font-semibold">
              {[
                { icon: User, label: 'Student Name', value: detailSeat.bookedBy?.name || 'Unknown' },
                { icon: Hash, label: 'Enrollment No', value: detailSeat.bookedBy?.enrollmentNo || 'N/A' },
                { icon: Armchair, label: 'Classroom', value: classroom?.name },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <row.icon className="w-4 h-4" />{row.label}
                  </span>
                  <span className="text-white">{row.value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setIsDetailModalOpen(false)} className="cg-btn-gold w-full py-3 rounded-xl text-sm">
              Close
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassroomLayoutView;
