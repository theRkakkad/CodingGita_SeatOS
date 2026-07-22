import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HijackSidebar from './HijackSidebar';

const HijackLayout = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab was switched or minimized - redirect instantly for stealth
        navigate('/studentinfo/dashboard', { replace: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also redirect if window loses focus (optional, but good for extreme stealth)
    const handleBlur = () => {
      navigate('/studentinfo/dashboard', { replace: true });
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0f0f1a' }}>
      <HijackSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default HijackLayout;
