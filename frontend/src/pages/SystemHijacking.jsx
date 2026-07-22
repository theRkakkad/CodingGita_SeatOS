import React, { useEffect, useState } from 'react';
import { Terminal, ShieldAlert, Cpu, Network, Database, Lock, Unlock, Fingerprint } from 'lucide-react';

const SystemHijacking = () => {
  const [logs, setLogs] = useState([]);
  
  useEffect(() => {
    const bootSequence = [
      'INITIATING ROOT OVERRIDE PROTOCOL...',
      'BYPASSING SECURITY MAINFRAME...',
      'DECRYPTING ADMIN CREDENTIALS...',
      'ESTABLISHING SECURE TUNNEL...',
      'ACCESSING CORE DATABASE...',
      'SYSTEM HIJACK COMPLETE. WELCOME COMMANDER.'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < bootSequence.length) {
        setLogs(prev => [...prev, bootSequence[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-emerald-500 font-mono p-8 overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col h-full gap-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-emerald-900 pb-4">
          <div className="flex items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
            <div>
              <h1 className="text-3xl font-black tracking-[0.2em] text-red-500 uppercase">System Hijacked</h1>
              <p className="text-xs text-emerald-600 tracking-widest mt-1">ROOT ACCESS GRANTED // LEVEL 9 CLEARANCE</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-emerald-400">
              <Fingerprint className="w-5 h-5" />
              <span className="text-sm font-bold tracking-widest">BIOMETRIC LOCK: OVERRIDDEN</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1">SESSION ACTIVE</p>
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          
          {/* Terminal Window */}
          <div className="lg:col-span-2 border border-emerald-900 bg-black/50 p-6 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.1)] flex flex-col">
            <div className="flex items-center gap-2 border-b border-emerald-900 pb-2 mb-4">
              <Terminal className="w-4 h-4" />
              <span className="text-xs tracking-widest uppercase">Root Terminal</span>
            </div>
            <div className="flex-1 space-y-2">
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-4 opacity-80 animate-fade-in">
                  <span className="text-emerald-800">[{new Date().toISOString().split('T')[1].substring(0, 8)}]</span>
                  <span className={idx === logs.length - 1 ? 'text-white font-bold' : ''}>{log}</span>
                </div>
              ))}
              {logs.length === 6 && (
                <div className="mt-8 flex gap-2 items-center text-emerald-400">
                  <span>root@seatsync:~#</span>
                  <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Side Panels */}
          <div className="space-y-8">
            
            {/* Status Panel */}
            <div className="border border-emerald-900 bg-black/50 p-6 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-2 border-b border-emerald-900 pb-2 mb-4">
                <Cpu className="w-4 h-4" />
                <span className="text-xs tracking-widest uppercase">System Core</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 text-sm">Mainframe</span>
                  <span className="text-red-500 text-sm font-bold animate-pulse">COMPROMISED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 text-sm">Firewall</span>
                  <span className="text-emerald-400 text-sm">BYPASSED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 text-sm">Database</span>
                  <span className="text-emerald-400 text-sm">UNLOCKED</span>
                </div>
              </div>
            </div>

            {/* Network Panel */}
            <div className="border border-emerald-900 bg-black/50 p-6 rounded-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-2 border-b border-emerald-900 pb-2 mb-4">
                <Network className="w-4 h-4" />
                <span className="text-xs tracking-widest uppercase">Active Nodes</span>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-600">NODE_{i} [192.168.1.{100+i}]</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default SystemHijacking;
