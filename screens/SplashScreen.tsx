import React, { useState, useEffect } from 'react';
import { LOGO_URL, APP_NAME, TAGLINE } from '../constants';

const SplashScreen: React.FC = () => {
  const [status, setStatus] = useState("Initializing Universe");

  useEffect(() => {
    const hasSession = localStorage.getItem('oghub_has_session');
    if (hasSession) {
      setStatus("Restoring your session...");
    } else {
      setStatus("Connecting to the hub...");
    }

    const timer = setTimeout(() => {
      setStatus("Preparing your missions...");
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100]">
      <div className="relative mb-6">
        <div className="absolute -inset-8 bg-theme-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <img
          src={LOGO_URL}
          alt={APP_NAME}
          className="w-32 h-32 object-contain relative animate-bounce"
        />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tighter text-contrast mb-2">
        {APP_NAME}
      </h1>
      <p className="text-theme-400 font-medium tracking-wide text-sm opacity-80">
        {TAGLINE}
      </p>

      <div className="absolute bottom-12 flex flex-col items-center">
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-theme-500 w-1/3 animate-[loading_2s_infinite_linear]"></div>
        </div>
        <p className="mt-4 text-[10px] text-slate-500 uppercase tracking-widest font-black transition-all duration-500">
          {status}
        </p>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;