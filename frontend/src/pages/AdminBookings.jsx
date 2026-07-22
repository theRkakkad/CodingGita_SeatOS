import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Modal from '../components/Modal';
import api from '../services/api';
import { socket } from '../services/socket';
import { ClipboardList, Search, School, Armchair, Calendar, Trash2, AlertTriangle, Eye, MapPin, Monitor } from 'lucide-react';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/api/master/bookings');
      if (res.data.success) setBookings(res.data.bookings);
    } catch (error) { console.error('Error fetching bookings:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBookings();
    socket.on('classroom:update', fetchBookings);
    return () => { socket.off('classroom:update', fetchBookings); };
  }, []);

  const handleOpenCancelModal = (booking) => { 
    setSelectedBooking(booking); 
    setIsCancelModalOpen(true); 
    setErrorMsg(''); 
    setSendEmailNotification(true); 
  };

  const handleOpenAuditModal = (booking) => {
    setSelectedBooking(booking);
    setIsAuditModalOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setErrorMsg(''); setIsCancelling(true);
    try {
      const res = await api.delete(`/api/master/bookings/${selectedBooking._id}?sendEmail=${sendEmailNotification}`);
      if (res.data.success) {
        setSuccessMsg(`Booking for ${selectedBooking.studentId?.name} cancelled.`);
        setIsCancelModalOpen(false); setSelectedBooking(null); fetchBookings();
      }
    } catch (error) { setErrorMsg(error.response?.data?.message || 'Failed to cancel booking.'); }
    finally { setIsCancelling(false); }
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
        <Navbar title="Seat Bookings" />
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
      <Navbar title="Active Bookings" />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl space-y-6">
        {successMsg && (
          <div className="p-4 rounded-2xl flex gap-3 text-sm font-semibold cg-fade-in"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#10b981' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, enrollment, seat, classroom..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 14, padding: '10px 16px 10px 40px', width: '100%', outline: 'none', fontSize: '0.875rem', fontWeight: 600 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f9ca3a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,202,58,0.12)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          <div className="text-xs font-bold uppercase tracking-widest px-3.5 py-2 rounded-xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
            Total: {filteredBookings.length}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          {filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <thead>
                  <tr>
                    {['Student', 'Enrollment No', 'Classroom', 'Seat', 'Date & Time', 'Action'].map((h) => (
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
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenAuditModal(booking)}
                            className="p-2 rounded-xl transition-all"
                            style={{ color: '#6ee7b7' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                            title="View Audit Info">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenCancelModal(booking)}
                            className="p-2 rounded-xl transition-all"
                            style={{ color: '#fca5a5' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                            title="Revoke Booking">
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

      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Revoke Student Booking">
        {selectedBooking && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl flex gap-3.5 text-sm font-semibold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p>Cancel booking for <strong className="text-white">{selectedBooking.studentId?.name}</strong> — Seat <strong className="text-white">{selectedBooking.seatNumber}</strong> in <strong className="text-white">{selectedBooking.classroomId?.name}</strong>?</p>
            </div>

            {/* Email Notification Toggle */}
            <div className="flex items-center gap-2.5 px-1 py-0.5 text-neutral-300">
              <input
                type="checkbox"
                id="cancel-send-email"
                checked={sendEmailNotification}
                onChange={(e) => setSendEmailNotification(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer"
              />
              <label htmlFor="cancel-send-email" className="text-xs font-semibold select-none cursor-pointer hover:text-white transition-colors">
                Send email confirmation to student
              </label>
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
                No, Keep
              </button>
              <button onClick={handleCancelBooking} disabled={isCancelling} className="cg-btn-danger py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-1.5">
                {isCancelling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /><span>Yes, Revoke</span></>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isAuditModalOpen} onClose={() => setIsAuditModalOpen(false)} title="Booking Audit Record">
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 space-y-4">
                <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Student Details</p>
                  <p className="text-sm text-white font-bold">{selectedBooking.studentId?.name}</p>
                  <p className="text-xs text-neutral-400">{selectedBooking.studentId?.email}</p>
                </div>
                
                <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Security Checks</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Monitor className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                      <span className="text-neutral-400">IP:</span>
                      <span className="text-white font-mono">{selectedBooking.ipAddress || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                      <span className="text-neutral-400">Geo:</span>
                      <span className="text-white font-mono">{selectedBooking.latitude}, {selectedBooking.longitude}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                      <span className="text-neutral-400">Face Match:</span>
                      <span className={selectedBooking.faceMatchStatus ? "text-green-400" : "text-red-400"}>
                        {selectedBooking.faceMatchStatus ? 'Passed' : 'Failed'} ({selectedBooking.faceConfidenceScore ? (selectedBooking.faceConfidenceScore * 100).toFixed(1) + '%' : 'N/A'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-48 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Live Capture</p>
                {selectedBooking.photoUrl ? (
                  <img src={selectedBooking.photoUrl} alt="Captured at booking" className="w-full h-auto rounded-xl object-cover border border-neutral-700/50" />
                ) : (
                  <div className="w-full aspect-[3/4] rounded-xl flex items-center justify-center bg-neutral-900 border border-neutral-800">
                    <span className="text-xs text-neutral-500">No Photo</span>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setIsAuditModalOpen(false)} className="w-full py-3 rounded-xl text-sm font-bold bg-neutral-800 text-white hover:bg-neutral-700 transition-colors">
              Close Audit
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminBookings;
