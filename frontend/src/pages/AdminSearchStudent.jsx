import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Search, Hash, School, Armchair, ArrowRight, HelpCircle, User } from 'lucide-react';

const AdminSearchStudent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await api.get(`/api/master/students/search?q=${query}`);
      if (res.data.success) setResults(res.data.results);
    } catch (error) { console.error('Error searching students:', error); }
    finally { setLoading(false); }
  };

  const handleViewSeat = (booking) => {
    if (!booking) return;
    navigate(`/master/classroom/${booking.classroomCode}?highlightSeat=${booking.seatId}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Search Student" />

      <main className="flex-1 p-8 overflow-y-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="cg-fade-in">
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Locate a Student</h3>
          <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Search by student name or enrollment number to find their registered seat in real time.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3 cg-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name or enrollment number..."
              style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 18, padding: '14px 16px 14px 48px', width: '100%', outline: 'none', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f9ca3a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,202,58,0.12)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          <button type="submit" className="cg-btn-gold px-7 rounded-2xl text-sm shrink-0">
            <Search className="w-4 h-4" /><span>Search</span>
          </button>
        </form>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#f9ca3a', borderTopColor: 'transparent' }} />
              <p className="section-label">Searching database...</p>
            </div>
          ) : searched ? (
            results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((student, idx) => (
                  <div key={student._id}
                    className="rounded-3xl p-6 flex flex-col justify-between space-y-5 cg-fade-in"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', animationDelay: `${idx * 0.08}s`, transition: 'border-color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(249,202,58,0.25)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  >
                    {/* User info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base uppercase"
                          style={{ background: 'linear-gradient(135deg, #f9ca3a, #f5a623)', color: '#1a0900' }}>
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white leading-tight">{student.name}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-widest block mt-0.5"
                            style={{ color: 'rgba(255,255,255,0.35)' }}>{student.email}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs font-bold pt-3"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Enrollment:</span>
                          <span className="text-white font-mono">{student.enrollmentNo}</span>
                        </div>

                        {student.booking ? (
                          <>
                            <div className="flex items-center gap-2">
                              <School className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Classroom:</span>
                              <span className="text-white">{student.booking.classroomName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Armchair className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Seat:</span>
                              <span className="font-black" style={{ color: '#f9ca3a' }}>Seat {student.booking.seatNumber}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <HelpCircle className="w-4 h-4" /><span>No Seat Booked</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {student.booking && (
                      <button onClick={() => handleViewSeat(student.booking)}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition-all group"
                        style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)', color: '#f9ca3a' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(249,202,58,0.18)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(249,202,58,0.1)'; }}
                      >
                        <span>View Seat on Map</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <User className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div>
                  <h4 className="text-white font-bold">No Matching Students</h4>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    No students found matching "<strong className="text-white">{query}</strong>".
                  </p>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 rounded-3xl"
              style={{ border: '2px dashed rgba(255,255,255,0.08)' }}>
              <Search className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Enter a query above to start searching
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminSearchStudent;
