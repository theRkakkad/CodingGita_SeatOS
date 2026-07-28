import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { socket } from '../services/socket';
import { ClipboardList, Search, School, Armchair, Calendar, MapPin, Camera, X } from 'lucide-react';
import Modal from '../components/Modal';

const StudentInfoBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
                    {['Student', 'Enrollment No', 'Classroom', 'Seat', 'Date & Time'].map((h) => (
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
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', whiteSpace: 'nowrap' }}>
                          <Armchair className="w-3.5 h-3.5" />Seat {booking.seatNumber}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          {formatDate(booking.bookedAt)}
                        </span>
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

    </div>
  );
};

export default StudentInfoBookings;
