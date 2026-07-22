import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { socket } from '../services/socket';
import { ClipboardList, Search, School, Armchair, Calendar, MapPin, Camera, X, Power, Trash2, Edit, Plus } from 'lucide-react';
import Modal from '../components/Modal';

const HijackBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  // Force Book State
  const [isForceBookModalOpen, setIsForceBookModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [seats, setSeats] = useState([]);
  
  const [fbStudentId, setFbStudentId] = useState('');
  const [fbClassroomId, setFbClassroomId] = useState('');
  const [fbSeatId, setFbSeatId] = useState('');
  const [fbLoading, setFbLoading] = useState(false);

  // Reassign State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [raClassroomId, setRaClassroomId] = useState('');
  const [raSeatId, setRaSeatId] = useState('');
  const [raLoading, setRaLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/api/master/bookings');
      if (res.data.success) setBookings(res.data.bookings);
    } catch (error) { console.error('Error fetching bookings:', error); }
    finally { setLoading(false); }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/master/settings');
      if (res.data.success) {
        setBookingOpen(res.data.settings.bookingOpen);
      }
    } catch (err) { console.error('Error fetching settings:', err); }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/master/students');
      if (res.data.success) setStudents(res.data.students);
    } catch (err) { console.error('Error fetching students', err); }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await api.get('/api/classrooms');
      if (res.data.success) setClassrooms(res.data.classrooms);
    } catch (err) { console.error('Error fetching classrooms', err); }
  };

  const fetchSeats = async (classroomId) => {
    try {
      const res = await api.get(`/api/classrooms/${classroomId}/seats`);
      if (res.data.success) setSeats(res.data.seats);
    } catch (err) { console.error('Error fetching seats', err); }
  };

  const toggleBookingStatus = async () => {
    setToggling(true);
    try {
      const res = await api.post('/api/master/settings', { bookingOpen: !bookingOpen });
      if (res.data.success) {
        setBookingOpen(!bookingOpen);
      }
    } catch (err) { console.error('Error toggling booking status:', err); }
    finally { setToggling(false); }
  };

  const handleSettingsUpdate = (updates) => {
    if (updates.bookingOpen !== undefined) setBookingOpen(updates.bookingOpen);
  };

  useEffect(() => {
    fetchBookings();
    fetchSettings();
    fetchStudents();
    fetchClassrooms();
    socket.on('classroom:update', fetchBookings);
    socket.on('settings:update', handleSettingsUpdate);
    return () => { 
      socket.off('classroom:update', fetchBookings); 
      socket.off('settings:update', handleSettingsUpdate);
    };
  }, []);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("CRITICAL WARNING: Are you sure you want to FORCE CANCEL this student's booking?")) return;
    try {
      const res = await api.delete(`/api/master/bookings/${bookingId}`);
      if (res.data.success) {
        fetchBookings();
      }
    } catch (err) { alert(err.response?.data?.message || 'Failed to cancel booking'); }
  };

  // Force Book Methods
  const openForceBook = () => {
    setFbStudentId('');
    setFbClassroomId('');
    setFbSeatId('');
    setSeats([]);
    setIsForceBookModalOpen(true);
  };

  const onFbClassroomChange = (e) => {
    const cid = e.target.value;
    setFbClassroomId(cid);
    setFbSeatId('');
    if (cid) fetchSeats(cid);
    else setSeats([]);
  };

  const submitForceBook = async (e) => {
    e.preventDefault();
    setFbLoading(true);
    try {
      const res = await api.post('/api/master/bookings', {
        studentId: fbStudentId,
        seatId: fbSeatId,
        cancelPrevious: true
      });
      if (res.data.success) {
        setIsForceBookModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to force book seat');
    } finally {
      setFbLoading(false);
    }
  };

  // Reassign Methods
  const openReassign = (booking) => {
    setSelectedBooking(booking);
    setRaClassroomId(booking.classroomId?._id || '');
    setRaSeatId('');
    if (booking.classroomId?._id) {
      fetchSeats(booking.classroomId._id);
    } else {
      setSeats([]);
    }
    setIsReassignModalOpen(true);
  };

  const onRaClassroomChange = (e) => {
    const cid = e.target.value;
    setRaClassroomId(cid);
    setRaSeatId('');
    if (cid) fetchSeats(cid);
    else setSeats([]);
  };

  const submitReassign = async (e) => {
    e.preventDefault();
    setRaLoading(true);
    try {
      const res = await api.patch(`/api/master/bookings/${selectedBooking._id}/reassign`, {
        newSeatId: raSeatId
      });
      if (res.data.success) {
        setIsReassignModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign seat');
    } finally {
      setRaLoading(false);
    }
  };


  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filteredBookings = bookings.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (b.studentId?.name?.toLowerCase().includes(q) || b.studentId?.enrollmentNo?.toLowerCase().includes(q) ||
      b.seatNumber?.toLowerCase().includes(q) || b.classroomId?.name?.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Seat Database Override" />
        <div className="flex-1 p-8 space-y-6 max-w-6xl">
          <div className="h-10 w-64 cg-skeleton" />
          <div className="h-96 cg-skeleton" />
        </div>
      </div>
    );
  }

  const thStyle = { color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' };
  const tdStyle = { padding: '14px 20px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' };

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Seat Database Override" />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl space-y-6 relative z-10">
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, enrollment, seat..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 14, padding: '10px 16px 10px 40px', width: '100%', outline: 'none', fontSize: '0.875rem', fontWeight: 600 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f9ca3a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,202,58,0.12)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={openForceBook}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20"
            >
              <Plus className="w-3.5 h-3.5" /> Force Book Seat
            </button>
            <button 
              onClick={toggleBookingStatus}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                bookingOpen 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${toggling ? 'animate-pulse' : ''}`} />
              {bookingOpen ? 'Booking is Open' : 'Booking is Closed'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          {filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <thead>
                  <tr>
                    {['Student', 'Enrollment', 'Classroom', 'Seat', 'Date', 'Evidence', 'Overrides'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase"
                            style={{ background: 'linear-gradient(135deg, #f9ca3a, #f5a623)', color: '#1a0900' }}>
                            {booking.studentId?.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-white font-bold leading-tight" style={{ whiteSpace: 'nowrap' }}>{booking.studentId?.name || 'Unknown'}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{booking.studentId?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}><span className="font-mono text-xs">{booking.studentId?.enrollmentNo || 'N/A'}</span></td>
                      <td style={tdStyle}>
                        <span className="flex items-center gap-1.5" style={{ whiteSpace: 'nowrap' }}>
                          <School className="w-4 h-4 shrink-0" style={{ color: '#f9ca3a' }} />
                          {booking.classroomId?.name}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', whiteSpace: 'nowrap' }}>
                          <Armchair className="w-3.5 h-3.5" />Seat {booking.seatNumber}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          {formatDate(booking.bookedAt)}
                        </span>
                      </td>
                      
                      {/* Evidence Column */}
                      <td style={tdStyle}>
                        <button 
                          onClick={() => { setSelectedBooking(booking); setIsEvidenceModalOpen(true); }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.25)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.15)'; }}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>

                      {/* Admin Overrides */}
                      <td style={tdStyle}>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openReassign(booking)}
                            className="p-2 rounded-xl transition-all"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
                            title="Reassign Seat"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleCancelBooking(booking._id)}
                            className="p-2 rounded-xl transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                            title="Force Cancel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <ClipboardList className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.25)' }} />
              </div>
              <div>
                <h4 className="text-white font-bold">No Bookings Found</h4>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {searchTerm ? 'No bookings match your search.' : 'No active student bookings in the system.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Force Book Modal */}
      <Modal isOpen={isForceBookModalOpen} onClose={() => setIsForceBookModalOpen(false)} title="Force Book Seat">
        <form onSubmit={submitForceBook} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Select Student</label>
            <select 
              required
              value={fbStudentId}
              onChange={(e) => setFbStudentId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-400"
            >
              <option value="">-- Choose a Student --</option>
              {students.filter(s => s.role === 'student').map(s => (
                <option key={s._id} value={s._id}>{s.name} ({s.enrollmentNo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Select Classroom</label>
            <select 
              required
              value={fbClassroomId}
              onChange={onFbClassroomChange}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-400"
            >
              <option value="">-- Choose a Classroom --</option>
              {classrooms.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-white/70 mb-1">Select Seat</label>
            <select 
              required
              value={fbSeatId}
              onChange={(e) => setFbSeatId(e.target.value)}
              disabled={!fbClassroomId}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-400 disabled:opacity-50"
            >
              <option value="">-- Choose a Seat --</option>
              {seats.filter(s => !s.isBooked).map(s => (
                <option key={s._id} value={s._id}>Seat {s.seatNumber}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={fbLoading}
            className="w-full py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
          >
            {fbLoading ? 'Booking...' : 'Force Book Now'}
          </button>
        </form>
      </Modal>

      {/* Reassign Modal */}
      <Modal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} title="Reassign Seat">
        {selectedBooking && (
          <form onSubmit={submitReassign} className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-bold">{selectedBooking.studentId?.name}</p>
              <p className="text-xs text-white/50">Current: {selectedBooking.classroomId?.name} - Seat {selectedBooking.seatNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Select Classroom</label>
              <select 
                required
                value={raClassroomId}
                onChange={onRaClassroomChange}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-400"
              >
                <option value="">-- Choose a Classroom --</option>
                {classrooms.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-white/70 mb-1">Select New Seat</label>
              <select 
                required
                value={raSeatId}
                onChange={(e) => setRaSeatId(e.target.value)}
                disabled={!raClassroomId}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-400 disabled:opacity-50"
              >
                <option value="">-- Choose a Seat --</option>
                {seats.filter(s => !s.isBooked || s._id === selectedBooking.seatId).map(s => (
                  <option key={s._id} value={s._id}>Seat {s.seatNumber}</option>
                ))}
              </select>
            </div>
            <button 
              type="submit" 
              disabled={raLoading}
              className="w-full py-3 rounded-xl font-bold uppercase tracking-widest transition-all text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
            >
              {raLoading ? 'Reassigning...' : 'Reassign Seat'}
            </button>
          </form>
        )}
      </Modal>

      {/* Evidence Modal */}
      <Modal isOpen={isEvidenceModalOpen} onClose={() => setIsEvidenceModalOpen(false)} title="Booking Evidence">
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-white font-bold">{selectedBooking.studentId?.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{selectedBooking.studentId?.enrollmentNo}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)', color: '#f9ca3a' }}>
                  <Armchair className="w-3.5 h-3.5" /> Seat {selectedBooking.seatNumber}
                </span>
                <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{selectedBooking.classroomId?.name}</p>
              </div>
            </div>

            {/* Photo */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>Identity Verification Photo</p>
              {selectedBooking.photoUrl ? (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={selectedBooking.photoUrl} alt="Student Verification" className="w-full h-auto object-cover" />
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No photo was captured for this legacy booking.</p>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>Geolocation Details</p>
              <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {selectedBooking.latitude && selectedBooking.longitude ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Coordinates:</span>
                      <span className="text-xs font-mono text-white">{selectedBooking.latitude.toFixed(6)}, {selectedBooking.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>IP Address:</span>
                      <span className="text-xs font-mono text-white">{selectedBooking.ipAddress || 'Unknown'}</span>
                    </div>
                    <a 
                      href={`https://www.google.com/maps?q=${selectedBooking.latitude},${selectedBooking.longitude}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-center py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Location data missing for this booking.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default HijackBookings;
