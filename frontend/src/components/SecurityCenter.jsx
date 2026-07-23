import React, { useEffect, useState } from 'react';
import { Shield, Clock, MapPin, Globe, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';
import { UAParser } from 'ua-parser-js';

const SecurityCenter = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/api/auth/my-logins');
        if (res.data.success) {
          setLogs(res.data.logs);
        } else {
          setError(res.data.message);
        }
      } catch (err) {
        setError('Failed to fetch login history.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="mt-8 rounded-3xl overflow-hidden cg-fade-in"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(249,202,58,0.1)' }}>
            <Shield className="w-5 h-5" style={{ color: '#f9ca3a' }} />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">Security Center</h2>
            <p className="text-xs text-white/40 mt-0.5">Monitor your recent login activity</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#f9ca3a] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 text-center py-4 bg-red-500/10 rounded-xl border border-red-500/20">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-white/40 text-center py-4">
            No recent login activity found.
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border"
                style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)' }}>
                
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  {log.success ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">
                        {log.success ? 'Successful Login' : 'Failed Attempt'}
                      </span>
                      <span className="text-xs text-white/30">•</span>
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {log.ipAddress}
                      </span>
                      {log.location && (log.location.city !== 'Unknown' || log.location.country !== 'Unknown') && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {log.location.city !== 'Unknown' ? log.location.city : ''}
                          {log.location.city !== 'Unknown' && log.location.country !== 'Unknown' ? ', ' : ''}
                          {log.location.country !== 'Unknown' ? log.location.country : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right pl-12 sm:pl-0">
                  <div className="text-xs text-white/70 whitespace-normal break-words max-w-[200px]" title={log.userAgent}>
                    {(() => {
                      const parser = new UAParser(log.userAgent);
                      const browser = parser.getBrowser();
                      const os = parser.getOS();
                      if (browser.name && os.name) {
                        return `${browser.name} ${browser.version || ''} on ${os.name} ${os.version || ''}`.trim();
                      }
                      return log.userAgent || 'Unknown Device';
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityCenter;
