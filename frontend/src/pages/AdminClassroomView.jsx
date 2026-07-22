import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Classroom3D from '../components/Classroom3D';
import Modal from '../components/Modal';
import api from '../services/api';
import { socket } from '../services/socket';
import { School, ArrowLeft, User, Hash, Mail, Trash2, AlertTriangle, Info, Search, Check, RefreshCw } from 'lucide-react';

const AdminClassroomView = () => {
  const { classroomCode } = useParams();
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const highlightSeatId = queryParams.get('highlightSeat');

  const [classroom, setClassroom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // New States for Booking and Reassign
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isReassignMode, setIsReassignMode] = useState(false);
  const [overrideWarning, setOverrideWarning] = useState(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  const fetchClassroomAndSeats = async () => {
    try {
      const classRes = await api.get(`/api/classrooms/${classroomCode}`);
      if (classRes.data.success) setClassroom(classRes.data.classroom);
      const seatsRes = await api.get(`/api/classrooms/${classroomCode}/seats`);
      if (seatsRes.data.success) setSeats(seatsRes.data.seats);
    } catch (error) {
      console.error('Error fetching admin classroom view:', error);
      setActionError('Failed to load classroom layout.');
    } finally { setLoading(false); }
  };

  const fetchClassroomStudents = async () => {
    if (!classroom?._id) return;
    try {
      const res = await api.get(`/api/master/classrooms/${classroom._id}/students`);
      if (res.data.success) {
        setClassroomStudents(res.data.students);
      }
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  };

  useEffect(() => { setLoading(true); fetchClassroomAndSeats(); }, [classroomCode]);

  useEffect(() => {
    if (!loading && highlightSeatId && seats.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`seat-${highlightSeatId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [loading, highlightSeatId, seats]);

  useEffect(() => {
    if (!classroom?._id) return;
    const roomId = classroom._id;
    socket.emit('join:classroom', { classroomId: roomId });
    const handleRealTimeUpdates = () => {
      api.get(`/api/classrooms/${roomId}/seats`).then((res) => { if (res.data.success) setSeats(res.data.seats); }).catch(console.error);
    };
    socket.on('seat:booked', handleRealTimeUpdates);
    socket.on('seat:cancelled', handleRealTimeUpdates);
    socket.on('seat:changed', handleRealTimeUpdates);
    return () => {
      socket.emit('leave:classroom', { classroomId: roomId });
      socket.off('seat:booked', handleRealTimeUpdates);
      socket.off('seat:cancelled', handleRealTimeUpdates);
      socket.off('seat:changed', handleRealTimeUpdates);
    };
  }, [classroom?._id]);

  const handleSeatClick = (seat) => {
    setActionError(''); setActionSuccess('');
    setOverrideWarning(null);
    setSelectedStudentId('');
    setStudentSearchTerm('');
    setSendEmailNotification(true);
    setSelectedSeat(seat);
    
    if (seat.isBooked) {
      setIsReassignMode(false);
      setIsDetailModalOpen(true);
    } else {
      setIsBookModalOpen(true);
      fetchClassroomStudents();
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedSeat) return;
    setActionError(''); setIsCancelling(true);
    try {
      const res = await api.delete(`/api/master/bookings/${selectedSeat._id}?sendEmail=${sendEmailNotification}`);
      if (res.data.success) {
        setActionSuccess(`Booking for Seat ${selectedSeat.seatNumber} successfully cancelled.`);
        setIsDetailModalOpen(false); setSelectedSeat(null); fetchClassroomAndSeats();
      }
    } catch (error) { setActionError(error.response?.data?.message || 'Failed to cancel booking.'); }
    finally { setIsCancelling(false); }
  };

  const handleBookSeat = async (cancelPrevious = false) => {
    if (!selectedSeat || !selectedStudentId) return;
    setActionError(''); setActionSuccess('');
    setIsCancelling(true);
    try {
      const res = await api.post('/api/master/bookings', {
        studentId: selectedStudentId,
        seatId: selectedSeat._id,
        cancelPrevious,
        sendEmail: sendEmailNotification
      });
      if (res.data.success) {
        setActionSuccess(`Seat ${selectedSeat.seatNumber} successfully booked for student.`);
        setIsBookModalOpen(false);
        setOverrideWarning(null);
        setSelectedSeat(null);
        fetchClassroomAndSeats();
      }
    } catch (error) {
      const data = error.response?.data;
      if (data && data.code === 'ALREADY_BOOKED') {
        setOverrideWarning({
          studentId: selectedStudentId,
          seatNumber: data.existingBooking.seatNumber
        });
      } else {
        setActionError(data?.message || 'Failed to book seat.');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReassignSeat = async (cancelPrevious = false) => {
    if (!selectedSeat || !selectedStudentId) return;
    setActionError(''); setActionSuccess('');
    setIsCancelling(true);
    try {
      const res = await api.patch(`/api/master/bookings/${selectedSeat._id}/reassign`, {
        studentId: selectedStudentId,
        cancelPrevious,
        sendEmail: sendEmailNotification
      });
      if (res.data.success) {
        setActionSuccess(`Seat ${selectedSeat.seatNumber} reassigned successfully.`);
        setIsDetailModalOpen(false);
        setIsReassignMode(false);
        setOverrideWarning(null);
        setSelectedSeat(null);
        fetchClassroomAndSeats();
      }
    } catch (error) {
      const data = error.response?.data;
      if (data && data.code === 'ALREADY_BOOKED') {
        setOverrideWarning({
          studentId: selectedStudentId,
          seatNumber: data.existingBooking.seatNumber
        });
      } else {
        setActionError(data?.message || 'Failed to reassign seat.');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleStartReassign = () => {
    setIsReassignMode(true);
    fetchClassroomStudents();
  };

  const filteredStudents = classroomStudents.filter(s => {
    const term = studentSearchTerm.toLowerCase();
    // Exclude the currently booked student if reassigning
    if (isReassignMode && selectedSeat?.bookedBy?._id === s._id) return false;
    return s.name.toLowerCase().includes(term) || s.enrollmentNo.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Loading Classroom Grid..." />
        <div className="flex-1 p-8 space-y-6 max-w-6xl">
          <div className="h-6 w-32 cg-skeleton" />
          <div className="h-[450px] cg-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title={`${classroom?.name || 'Classroom'} — Live Grid`} />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl space-y-6">
        {/* Back */}
        <Link to="/master/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold transition-all"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f9ca3a'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Statistics
        </Link>

        {actionSuccess && (
          <div className="p-4 rounded-2xl flex gap-3 text-sm font-semibold cg-fade-in max-w-2xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#10b981' }} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-2xl flex items-center gap-3 mb-6"
          style={{ background: 'rgba(249,202,58,0.06)', border: '1px solid rgba(249,202,58,0.15)' }}>
          <Info className="w-5 h-5 shrink-0" style={{ color: '#f9ca3a' }} />
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Live seating grid of <strong className="text-white">{classroom?.name}</strong>. Click any seat to manage assignments, book empty seats, or reassign booked ones.
          </p>
        </div>

        <Classroom3D
          seats={seats}
          selectedSeat={null}
          myBookedSeatId={null}
          highlightedSeatId={highlightSeatId}
          onSeatClick={handleSeatClick}
          isLoading={false}
        />
      </main>

      {/* Booked Seat Detail / Reassign Modal */}
      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => { setIsDetailModalOpen(false); setIsReassignMode(false); setOverrideWarning(null); }} 
        title={isReassignMode ? `Reassign Seat ${selectedSeat?.seatNumber}` : `Seat ${selectedSeat?.seatNumber} — Details`}
      >
        {selectedSeat && (
          <div className="space-y-5">
            {!isReassignMode ? (
              <>
                {/* Student Info */}
                <div className="space-y-0">
                  {[
                    { icon: User, label: 'Student Name', value: selectedSeat.bookedBy?.name || 'Unknown' },
                    { icon: Hash, label: 'Enrollment No', value: selectedSeat.bookedBy?.enrollmentNo || 'N/A' },
                    { icon: Mail, label: 'Email Address', value: selectedSeat.bookedBy?.email || 'N/A' },
                    { icon: School, label: 'Classroom', value: classroom?.name },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <row.icon className="w-4 h-4" />{row.label}
                      </span>
                      <span className="text-sm font-bold text-white max-w-[200px] truncate" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Warnings & Action Buttons */}
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl flex gap-2.5 text-xs font-semibold"
                    style={{ background: 'rgba(249,202,58,0.07)', border: '1px solid rgba(249,202,58,0.18)', color: '#f9ca3a' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Revoking this booking will free up the seat immediately and notify the student in real time.
                    </p>
                  </div>

                  {/* Email Notification Toggle */}
                  <div className="flex items-center gap-2.5 px-1 py-0.5 text-neutral-300">
                    <input
                      type="checkbox"
                      id="details-send-email"
                      checked={sendEmailNotification}
                      onChange={(e) => setSendEmailNotification(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer"
                    />
                    <label htmlFor="details-send-email" className="text-xs font-semibold select-none cursor-pointer hover:text-white transition-colors">
                      Send email confirmation to student
                    </label>
                  </div>

                  {actionError && (
                    <div className="p-3 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                      {actionError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleStartReassign}
                      className="flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)', color: '#f9ca3a' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,202,58,0.18)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,202,58,0.1)'; }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Reassign Seat</span>
                    </button>

                    <button 
                      onClick={handleCancelBooking} 
                      disabled={isCancelling}
                      className="flex-1 cg-btn-danger flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs"
                    >
                      {isCancelling ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Trash2 className="w-4 h-4" /><span>Unbook Seat</span></>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Reassign Student Form
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Search New Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Search student by name or enrollment..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-amber-400 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded-xl bg-neutral-950/50 p-1.5 space-y-1 custom-scrollbar">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => {
                        const isSelected = selectedStudentId === student._id;
                        const hasSeat = !!student.booking;
                        return (
                          <button
                            key={student._id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(student._id);
                              if (hasSeat) {
                                setOverrideWarning({
                                  studentId: student._id,
                                  seatNumber: student.booking.seatNumber
                                });
                              } else {
                                setOverrideWarning(null);
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-all ${
                              isSelected 
                                ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300' 
                                : 'hover:bg-neutral-800/40 border border-transparent text-neutral-300'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold leading-tight">{student.name}</p>
                              <p className="text-[10px] text-neutral-500 mt-0.5">{student.enrollmentNo} • {student.email}</p>
                            </div>
                            {hasSeat ? (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                                Seat {student.booking.seatNumber}
                              </span>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                Available
                              </span>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-xs text-neutral-500 text-center py-4">No matching students found.</p>
                    )}
                  </div>
                </div>

                {overrideWarning && (
                  <div className="p-3.5 rounded-xl flex gap-2.5 text-xs font-bold leading-normal bg-red-950/20 border border-red-900/40 text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      This student currently holds <strong className="text-white">Seat {overrideWarning.seatNumber}</strong>. 
                      Reassigning will automatically <strong className="text-white">cancel</strong> their old seat reservation.
                    </p>
                  </div>
                )}

                {/* Email Notification Toggle */}
                <div className="flex items-center gap-2.5 px-1 py-0.5 text-neutral-300">
                  <input
                    type="checkbox"
                    id="reassign-send-email"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer"
                  />
                  <label htmlFor="reassign-send-email" className="text-xs font-semibold select-none cursor-pointer hover:text-white transition-colors">
                    Send email confirmation to student
                  </label>
                </div>

                {actionError && (
                  <div className="p-3 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    {actionError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setIsReassignMode(false); setOverrideWarning(null); setSelectedStudentId(''); }}
                    className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-400 hover:text-white transition-all"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => handleReassignSeat(!!overrideWarning)}
                    disabled={isCancelling || !selectedStudentId}
                    className="flex-1 cg-btn-gold py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    {isCancelling ? (
                      <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-4 h-4" /><span>Confirm Reassign</span></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Book Empty Seat Modal */}
      <Modal isOpen={isBookModalOpen} onClose={() => { setIsBookModalOpen(false); setOverrideWarning(null); setSelectedStudentId(''); }} title={`Book Seat ${selectedSeat?.seatNumber}`}>
        {selectedSeat && (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Select Student to Assign</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search student by name or enrollment..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-amber-400 outline-none transition-all"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded-xl bg-neutral-950/50 p-1.5 space-y-1 custom-scrollbar">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
                    const isSelected = selectedStudentId === student._id;
                    const hasSeat = !!student.booking;
                    return (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(student._id);
                          if (hasSeat) {
                            setOverrideWarning({
                              studentId: student._id,
                              seatNumber: student.booking.seatNumber
                            });
                          } else {
                            setOverrideWarning(null);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between transition-all ${
                          isSelected 
                            ? 'bg-amber-400/10 border border-amber-400/30 text-amber-300' 
                            : 'hover:bg-neutral-800/40 border border-transparent text-neutral-300'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold leading-tight">{student.name}</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">{student.enrollmentNo} • {student.email}</p>
                        </div>
                        {hasSeat ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                            Seat {student.booking.seatNumber}
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            Available
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-4">No matching students found.</p>
                )}
              </div>
            </div>

            {overrideWarning && (
              <div className="p-3.5 rounded-xl flex gap-2.5 text-xs font-bold leading-normal bg-red-950/20 border border-red-900/40 text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  This student currently holds <strong className="text-white">Seat {overrideWarning.seatNumber}</strong>. 
                  Booking this seat will automatically <strong className="text-white">cancel</strong> their previous reservation.
                </p>
              </div>
            )}

            {/* Email Notification Toggle */}
            <div className="flex items-center gap-2.5 px-1 py-0.5 text-neutral-300">
              <input
                type="checkbox"
                id="book-send-email"
                checked={sendEmailNotification}
                onChange={(e) => setSendEmailNotification(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer"
              />
              <label htmlFor="book-send-email" className="text-xs font-semibold select-none cursor-pointer hover:text-white transition-colors">
                Send email confirmation to student
              </label>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl text-xs font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {actionError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsBookModalOpen(false); setOverrideWarning(null); setSelectedStudentId(''); }}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-400 hover:text-white transition-all"
              >
                Cancel
              </button>

              <button
                onClick={() => handleBookSeat(!!overrideWarning)}
                disabled={isCancelling || !selectedStudentId}
                className="flex-1 cg-btn-gold py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Check className="w-4 h-4" /><span>Confirm Booking</span></>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminClassroomView;
