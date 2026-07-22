import React from 'react';

const colorMap = {
  gold:  { iconBg: 'rgba(249,202,58,0.12)',  iconBdr: 'rgba(249,202,58,0.25)',  icon: '#f9ca3a', val: '#f9ca3a' },
  green: { iconBg: 'rgba(16,185,129,0.12)',  iconBdr: 'rgba(16,185,129,0.25)',  icon: '#10b981', val: '#10b981' },
  red:   { iconBg: 'rgba(239,68,68,0.12)',   iconBdr: 'rgba(239,68,68,0.25)',   icon: '#ef4444', val: '#ef4444' },
  primary:{ iconBg:'rgba(124,58,237,0.12)',  iconBdr: 'rgba(124,58,237,0.25)',  icon: '#7c3aed', val: '#a78bfa' },
  slate: { iconBg: 'rgba(255,255,255,0.08)', iconBdr: 'rgba(255,255,255,0.15)', icon: '#e2e8f0', val: '#fff' },
  yellow:{ iconBg: 'rgba(249,202,58,0.12)',  iconBdr: 'rgba(249,202,58,0.25)',  icon: '#f9ca3a', val: '#f9ca3a' },
};

const DashboardCard = ({ title, value, icon: Icon, color = 'gold', subtext }) => {
  const c = colorMap[color] || colorMap.gold;

  return (
    <div
      className="p-6 rounded-2xl flex items-center justify-between cg-fade-in"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="space-y-0.5">
        <span className="section-label block">{title}</span>
        <h3 className="text-2xl font-black tracking-tight mt-1.5" style={{ color: c.val, fontFamily: 'Inter, sans-serif' }}>
          {value}
        </h3>
        {subtext && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtext}</p>
        )}
      </div>
      <div
        className="p-3.5 rounded-xl flex items-center justify-center"
        style={{ background: c.iconBg, border: `1px solid ${c.iconBdr}` }}
      >
        <Icon className="w-6 h-6" style={{ color: c.icon }} />
      </div>
    </div>
  );
};

export default DashboardCard;
