import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { socket } from '../services/socket';
import { School, Armchair, CheckCircle, ArrowRight, Grid3X3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ClassroomSelect = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.role === 'student' && user.assignedClassroom) {
      const classroomId = typeof user.assignedClassroom === 'object'
        ? user.assignedClassroom._id
        : user.assignedClassroom;
      navigate(`/book-seat/${classroomId}`, { replace: true });
    }
  }, [user, navigate]);

  const fetchClassrooms = async () => {
    try {
      const res = await api.get('/api/classrooms');
      if (res.data.success) setClassrooms(res.data.classrooms);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
    socket.on('classroom:update', fetchClassrooms);
    return () => { socket.off('classroom:update', fetchClassrooms); };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Select Classroom" />
        <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          {[...Array(2)].map((_, i) => <div key={i} className="h-72 cg-skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Select Classroom" />

      <main className="flex-1 p-8 space-y-8 overflow-y-auto max-w-5xl">
        {/* Header */}
        <div className="cg-fade-in">
          <h3 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: 'Poppins, Inter, sans-serif' }}>
            Available Lecture Halls
          </h3>
          <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Select a classroom below to view its visual seat layout and reserve your seat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {classrooms.map((classroom, idx) => {
            const bookedPct = Number(((classroom.bookedSeats / classroom.totalSeats) * 100).toFixed(0));
            const isFull = classroom.availableSeats === 0;

            return (
              <div
                key={classroom._id}
                className="rounded-3xl overflow-hidden flex flex-col cg-fade-in"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  animationDelay: `${idx * 0.1}s`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                  e.currentTarget.style.border = '1px solid rgba(249,202,58,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                  e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                }}
              >
                {/* Header */}
                <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-2xl"
                      style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)' }}
                    >
                      <School className="w-6 h-6" style={{ color: '#f9ca3a' }} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {classroom.name}
                      </h4>
                      <span className="section-label mt-0.5 block">Lecture Hall</span>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    <span>{classroom.rows} × {classroom.seatsPerRow}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl space-y-1.5"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div className="flex items-center gap-1.5">
                        <Armchair className="w-4 h-4" style={{ color: '#10b981' }} />
                        <span className="section-label" style={{ color: 'rgba(16,185,129,0.8)' }}>Available</span>
                      </div>
                      <p className="text-2xl font-black" style={{ color: '#10b981' }}>{classroom.availableSeats}</p>
                    </div>
                    <div className="p-4 rounded-2xl space-y-1.5"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                        <span className="section-label" style={{ color: 'rgba(239,68,68,0.8)' }}>Booked</span>
                      </div>
                      <p className="text-2xl font-black" style={{ color: '#ef4444' }}>{classroom.bookedSeats}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>OCCUPANCY</span>
                      <span>{bookedPct}% ({classroom.bookedSeats}/{classroom.totalSeats})</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${bookedPct}%`,
                          background: bookedPct > 80
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                            : 'linear-gradient(90deg, #f9ca3a, #f5a623)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <button
                    onClick={() => navigate(`/book-seat/${classroom._id}`)}
                    className="cg-btn-gold w-full py-3.5 rounded-2xl group"
                    disabled={isFull}
                  >
                    <span>{isFull ? 'Classroom Full' : 'View Seats'}</span>
                    {!isFull && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ClassroomSelect;
