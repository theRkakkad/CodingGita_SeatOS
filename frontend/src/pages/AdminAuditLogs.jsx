import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Shield, Search, AlertTriangle, CheckCircle, Clock, MapPin, Monitor } from 'lucide-react';

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/master/login-logs');
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.ipAddress?.includes(searchTerm)
  );

  const thStyle = { color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '14px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' };
  const tdStyle = { padding: '14px 20px', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' };

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="Security Audit Logs" />

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email or IP..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 14, padding: '10px 16px 10px 40px', width: '100%', outline: 'none', fontSize: '0.875rem', fontWeight: 600 }}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Live Monitoring
            </div>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading logs...</div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Timestamp</th>
                    <th style={thStyle}>Identity</th>
                    <th style={thStyle}>Network (IP & Geo)</th>
                    <th style={thStyle}>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log._id} style={{ background: log.success ? '' : 'rgba(239,68,68,0.02)' }}>
                      <td style={tdStyle}>
                        {log.success ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertTriangle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <span className="font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{log.email}</span>
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{log.userId?.name || 'Unknown User'} ({log.userId?.role || 'N/A'})</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs">{log.ipAddress}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            <MapPin className="w-3 h-3" /> {log.location?.city || 'Unknown'}, {log.location?.country || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={log.userAgent}>
                          <Monitor className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{log.userAgent || 'Unknown Device'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 text-center">
              <Shield className="w-12 h-12 mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <h4 className="text-white font-bold">No Audit Logs Found</h4>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminAuditLogs;
