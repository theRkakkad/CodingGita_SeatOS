import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Turnstile } from '@marsidev/react-turnstile';

const Login = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);

  const {
    googleLogin,
    logout,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const navigate = useNavigate();

  // Redirect user after successful login
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        logout();
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin, navigate, logout]);

  // Handle Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);

    try {
      // Make sure Google returned a credential
      if (!credentialResponse?.credential) {
        setError('Google did not return a valid credential.');
        return;
      }

      // Send Google ID token to backend
      const result = await googleLogin(
        credentialResponse.credential,
        turnstileToken
      );

      if (result?.success) {
        // Only students can access Student Portal
        if (result.user?.role !== 'student') {
          await logout();

          setError(
            'Access denied. Admins must log in through the Admin Portal.'
          );

          return;
        }

        // AuthContext will update isAuthenticated
        // and useEffect will redirect to dashboard
      } else {
        setError(
          result?.message || 'Google login failed.'
        );
      }
    } catch (err) {
      console.error('Google Login Error:', err);

      setError(
        'Something went wrong during Google login.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Login Error
  const handleGoogleError = () => {
    console.error('Google Login Failed');

    setError(
      'Google Login Failed. Please try again.'
    );
  };


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: '#0f0f1a',
      }}
    >
      {/* CodingGita Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20">
        <img
          src="/codinggita-logo.svg"
          alt="CodingGita"
          className="h-8 md:h-10 w-auto"
        />
      </div>

      {/* Background Ambient Blobs */}
      <div className="absolute inset-0 pointer-events-none">

        {/* Purple Blob */}
        <div
          className="absolute top-0 left-0 w-[500px] h-[500px] opacity-25 rounded-full"
          style={{
            background:
              'radial-gradient(circle, #5d21d1, transparent)',
            transform: 'translate(-30%, -30%)',
          }}
        />

        {/* Yellow Blob */}
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-15 rounded-full"
          style={{
            background:
              'radial-gradient(circle, #f9ca3a, transparent)',
            transform: 'translate(30%, 30%)',
          }}
        />

        {/* Center Purple Blob */}
        <div
          className="absolute top-1/2 left-1/2 w-[600px] h-[600px] opacity-5 rounded-full"
          style={{
            background:
              'radial-gradient(circle, #7c3aed, transparent)',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      {/* Login Container */}
      <div className="w-full max-w-[420px] z-10 cg-fade-in mt-12 md:mt-0">

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-black text-white"
            style={{
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Student Portal
          </h1>

          <p
            className="text-sm mt-1.5 font-medium"
            style={{
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Sign in to access classroom seat booking
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Gold Top Bar */}
          <div
            className="h-1"
            style={{
              background:
                'linear-gradient(90deg, #f9ca3a, #f5a623, #f9ca3a)',
            }}
          />

          <div className="p-8">

            {/* Error Message */}
            {error && (
              <div
                className="mb-5 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold cg-fade-in"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border:
                    '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                }}
              >
                <AlertCircle
                  className="w-5 h-5 shrink-0"
                  style={{
                    color: '#ef4444',
                  }}
                />

                <span>{error}</span>
              </div>
            )}

            {/* Google Login */}
            <div className="space-y-5 flex flex-col items-center pt-2">
              
              {!turnstileToken && (
                <div className="mb-4">
                  <Turnstile 
                    siteKey="1x00000000000000000000AA" // Cloudflare dummy key for always passes
                    onSuccess={(token) => setTurnstileToken(token)} 
                    theme="dark"
                  />
                </div>
              )}

              {isLoading ? (
                <div
                  className="text-sm font-semibold py-3"
                  style={{
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Signing in...
                </div>
              ) : (
                <div style={{ opacity: turnstileToken ? 1 : 0.5, pointerEvents: turnstileToken ? 'auto' : 'none' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    size="large"
                    shape="pill"
                    width="350"
                  />
                  {!turnstileToken && (
                    <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Please complete the security check to sign in.
                    </p>
                  )}
                </div>
              )}

              {/* University Email Information */}
              <div
                className="text-center w-full mt-4 text-xs font-semibold"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                Use your @swaminarayanuniversity.ac.in email
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;