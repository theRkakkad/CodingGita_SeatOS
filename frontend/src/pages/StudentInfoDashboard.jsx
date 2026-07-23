import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { socket } from '../services/socket';
import { Users, Search, Mail, Armchair, HelpCircle, Power } from 'lucide-react';

const StudentInfoDashboard = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isHijack = location.pathname.includes('systemhijacking');

  const fetchStudents = async () => {
    try {
      const res = await api.get('/api/master/students');
      if (res.data.success) setStudents(res.data.students);
    } catch (error) { console.error('Error fetching students:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStudents();
    socket.on('classroom:update', fetchStudents);
    return () => { 
      socket.off('classroom:update', fetchStudents); 
    };
  }, []);

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (s.name?.toLowerCase().includes(q) || s.enrollmentNo?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen cg-page">
        <Navbar title="Student Information Dashboard" />
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
      <Navbar title="Student Information Dashboard" />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, enrollment, email..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 14, padding: '10px 16px 10px 40px', width: '100%', outline: 'none', fontSize: '0.875rem', fontWeight: 600 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#f9ca3a'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,202,58,0.12)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest px-3.5 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              Total: {filteredStudents.length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <thead>
                  <tr>
                    {['Student Name', 'GR No', 'Email Address', 'Assigned Class', 'Reserved Seat'].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student._id}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs uppercase"
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                            {student.name?.charAt(0) || 'S'}
                          </div>
                          <span className="text-white font-bold" style={{ whiteSpace: 'nowrap' }}>{student.name}</span>
                        </div>
                      </td>
                      <td style={tdStyle}><span className="font-mono text-xs">{student.enrollmentNo || 'N/A'}</span></td>
                      <td style={tdStyle}>
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          {student.email}
                        </span>
                      </td>
                       <td style={tdStyle}>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
                           style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                          {student.assignedClassroom?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {student.booking ? (
                          isHijack ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                              style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)', color: '#f9ca3a', whiteSpace: 'nowrap' }}>
                              <Armchair className="w-3.5 h-3.5" />
                              {student.booking.classroomName} – Seat {student.booking.seatNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', whiteSpace: 'nowrap' }}>
                              <Armchair className="w-3.5 h-3.5" />
                              Booked
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', whiteSpace: 'nowrap' }}>
                            <HelpCircle className="w-3.5 h-3.5" />
                            Not Booked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Users className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.2)' }} />
              </div>
              <div>
                <h4 className="text-white font-bold">No Students Found</h4>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {searchTerm ? 'No students match your search terms.' : 'No registered students in the database.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentInfoDashboard;
