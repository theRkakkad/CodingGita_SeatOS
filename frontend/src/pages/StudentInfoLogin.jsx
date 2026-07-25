import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

const StudentInfoLogin = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { infoAdminGoogleLogin, logout, isAuthenticated, isInfoAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) { 
      if (isInfoAdmin) { 
        navigate('/studentinfo/dashboard'); 
      } else { 
        logout(); 
        setError('Access denied. Only Info Admins can log in here.');
      } 
    }
  }, [isAuthenticated, isInfoAdmin, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0f0f1a' }}>
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
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] opacity-5 rounded-full"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', transform: 'translate(-50%,-50%)' }} />
      </div>

      <div className="w-full max-w-[420px] z-10 cg-fade-in mt-12 md:mt-0">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>Student Info Portal</h1>
          <p className="text-sm mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Strict Access. Only authorized accounts allowed.</p>
        </div>

        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
          {/* Gold top bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #f9ca3a, #f5a623, #f9ca3a)' }} />

          <div className="p-8">
            {error && (
              <div className="mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold cg-fade-in"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#ef4444' }} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5 flex flex-col items-center pt-2">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setError(''); setIsLoading(true);
                  const result = await infoAdminGoogleLogin(credentialResponse.credential);
                  setIsLoading(false);
                  if (result.success) {
                    if (result.user.role !== 'info_admin') { 
                      logout(); 
                      setError('Access denied.'); 
                    }
                  } else { setError(result.message); }
                }}
                onError={() => {
                  setError('Google Login Failed');
                }}
                useOneTap
                theme="filled_black"
                size="large"
                shape="pill"
                width="100%"
              />
              
              <div className="text-center w-full mt-4 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Use your @swaminarayanuniversity.ac.in email
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfoLogin;
