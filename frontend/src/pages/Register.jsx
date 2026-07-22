import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Hash, AlertCircle, ArrowRight } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !enrollmentNo || !email || !password) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setIsLoading(true);
    const result = await register(name, enrollmentNo, email, password);
    setIsLoading(false);
    if (result.success) navigate('/dashboard'); else setError(result.message);
  };

  const fields = [
    { label: 'Full Name', type: 'text', value: name, set: setName, icon: User, placeholder: 'Enter your full name' },
    { label: 'Enrollment Number', type: 'text', value: enrollmentNo, set: setEnrollmentNo, icon: Hash, placeholder: 'Enter your enrollment number (e.g. 24CSE001)' },
    { label: 'Email Address', type: 'email', value: email, set: setEmail, icon: Mail, placeholder: 'Enter your Gmail' },
    { label: 'Password', type: 'password', value: password, set: setPassword, icon: Lock, placeholder: 'Create a secure password' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: '#0f0f1a' }}>
      {/* Absolute top-left logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20">
        <img src="/codinggita-logo.svg" alt="CodingGita" className="h-8 md:h-10 w-auto" />
      </div>

      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] opacity-25 rounded-full"
          style={{ background: 'radial-gradient(circle, #5d21d1, transparent)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-15 rounded-full"
          style={{ background: 'radial-gradient(circle, #f9ca3a, transparent)', transform: 'translate(30%, 30%)' }} />
      </div>

      <div className="w-full max-w-[420px] z-10 cg-fade-in mt-12 md:mt-0">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Create Account</h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Register to start booking classroom seats</p>
        </div>

        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #f9ca3a, #f5a623, #f9ca3a)' }} />

          <div className="p-8">
            {error && (
              <div className="mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold cg-fade-in"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.label} className="space-y-1.5">
                  <label className="section-label block">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#f9ca3a' }} />
                    <input
                      type={field.type} value={field.value}
                      onChange={(e) => field.set(e.target.value)}
                      className="cg-input" placeholder={field.placeholder} required
                    />
                  </div>
                </div>
              ))}

              <button type="submit" disabled={isLoading} className="cg-btn-gold w-full py-3.5 rounded-2xl mt-2 text-base">
                {isLoading
                  ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <div className="mt-6 pt-5 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-bold" style={{ color: '#f9ca3a' }}>Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
