import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-slate-800 text-primary-500 rounded-3xl border border-slate-700/50 flex items-center justify-center mx-auto shadow-lg">
          <HelpCircle className="w-10 h-10 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight">Page Not Found</h2>
          <p className="text-slate-400 text-sm font-semibold max-w-xs mx-auto leading-relaxed">
            The page you are looking for does not exist or has been moved to another location.
          </p>
        </div>
        <Link 
          to="/login"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-primary-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
