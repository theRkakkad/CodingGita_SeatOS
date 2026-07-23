import Navbar from '../components/Navbar';
import SecurityCenter from '../components/SecurityCenter';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Hash, Shield, BookOpen, Star } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  const fields = [
    { icon: User,  label: 'Full Name',        value: user?.name },
    { icon: Hash,  label: 'Enrollment Number', value: user?.enrollmentNo },
    { icon: Mail,  label: 'Email Address',     value: user?.email },
    { icon: Shield,label: 'Account Role',      value: user?.role, isRole: true },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen cg-page">
      <Navbar title="My Profile" />

      <main className="flex-1 p-8 overflow-y-auto max-w-2xl">
        <div className="rounded-3xl overflow-hidden cg-fade-in"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>

          {/* Hero Banner */}
          <div className="relative h-36 flex items-end px-8 pb-0"
            style={{ background: 'linear-gradient(135deg, #12071f 0%, #3d1380 50%, #5d21d1 100%)' }}>
            {/* Background glow */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 60%, rgba(249,202,58,0.08), transparent 60%)' }} />
            {/* Stars decoration */}
            {[...Array(6)].map((_, i) => (
              <Star key={i} className="absolute w-3 h-3 opacity-20"
                style={{ color: '#f9ca3a', top: `${15 + i * 12}%`, left: `${60 + i * 6}%` }} />
            ))}
          </div>

          {/* Avatar */}
          <div className="px-8 pb-8 relative">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center font-black text-4xl select-none border-4 -mt-12 mb-5 relative z-10"
              style={{
                background: 'linear-gradient(135deg, #f9ca3a, #f5a623)',
                color: '#1a0900',
                borderColor: '#0f0f1a',
                boxShadow: '0 12px 40px rgba(249,202,58,0.4)',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </div>

            {/* Name & subtitle */}
            <div className="mb-7">
              <h3 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{user?.name}</h3>
              <p className="text-sm mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                CodingGita · Classroom Seat Booking Portal Member
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Active Account</span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              {fields.map((field, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="p-2.5 rounded-xl mt-0.5"
                    style={{ background: 'rgba(249,202,58,0.1)', border: '1px solid rgba(249,202,58,0.2)' }}>
                    <field.icon className="w-4 h-4" style={{ color: '#f9ca3a' }} />
                  </div>
                  <div>
                    <p className="section-label mb-1">{field.label}</p>
                    {field.isRole ? (
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block"
                        style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                      >
                        {field.value}
                      </span>
                    ) : (
                      <p className="text-sm font-semibold text-white">{field.value || '—'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <SecurityCenter />

            {/* Portal Badge */}
            <div className="mt-6 p-4 rounded-2xl flex items-center gap-4"
              style={{ background: 'rgba(249,202,58,0.06)', border: '1px solid rgba(249,202,58,0.15)' }}>
              <img src="/codinggita-logo.svg" alt="CodingGita" className="h-6 w-auto opacity-70" />
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Powered by <span style={{ color: '#f9ca3a', fontWeight: 700 }}>CodingGita</span> — Classroom Seat Booking System
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
