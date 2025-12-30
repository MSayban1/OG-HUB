
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { LOGO_URL, APP_NAME } from '../constants';

interface NavbarProps {
  isAdmin: boolean;
  user: User | null;
  onBrandClick: () => void;
  onChatClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isAdmin, user, onBrandClick, onChatClick }) => {
  const location = useLocation();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const isAdminPath = location.pathname.startsWith('/admin');
  const isSettingsPath = location.pathname === '/settings';

  useEffect(() => {
    if (!user) {
      setProfilePic(null);
      return;
    }

    const userRef = ref(db, `users/${user.uid}/profilePicture`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      setProfilePic(snapshot.val());
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <header className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-50 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Link to="/" className="flex items-center active:scale-95 transition-transform">
          <img src={LOGO_URL} alt={APP_NAME} className="w-8 h-8 object-contain" />
        </Link>
        <span
          onClick={onBrandClick}
          className="text-xl font-black tracking-tight text-theme-500 cursor-pointer hover:opacity-80 transition-all active:scale-95 select-none"
        >
          {APP_NAME}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {user && (
          <button
            onClick={onChatClick}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all border bg-slate-900 text-slate-400 border-slate-800 hover:text-theme-400 hover:border-theme-500/30 relative"
            title="Global Chat"
          >
            <i className="fa-solid fa-comments text-sm"></i>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-theme-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(var(--theme-rgb-500),0.8)]"></span>
          </button>
        )}

        {isAdmin && (
          <Link
            to="/admin"
            className={`
              relative flex items-center space-x-2 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg group
              ${isAdminPath
                ? 'bg-theme-600 text-white border border-theme-400'
                : 'bg-slate-900 text-theme-400 border border-theme-500/30 hover:bg-theme-600 hover:text-white'
              }
            `}
          >
            {!isAdminPath && (
              <span className="absolute inset-0 rounded-xl bg-theme-500/20 animate-ping opacity-75 pointer-events-none"></span>
            )}
            <i className="fa-solid fa-screwdriver-wrench text-xs"></i>
            <span className="hidden xs:inline">Admin</span>
          </Link>
        )}

        <Link
          to="/settings"
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center transition-all border
            ${isSettingsPath
              ? 'bg-theme-600 text-white border-theme-400'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-theme-400 hover:border-theme-500/30'
            }
          `}
          title="Settings"
        >
          <i className={`fa-solid fa-gear ${isSettingsPath ? 'animate-spin-slow' : ''}`}></i>
        </Link>

        {!user ? (
          <Link to="/auth" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white px-3 py-2 transition-colors">
            Login
          </Link>
        ) : (
          <Link to="/dashboard" className="group flex items-center">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-theme-500/50 transition-colors shadow-inner overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user text-sm text-slate-500 group-hover:text-theme-400 transition-colors"></i>
              )}
            </div>
          </Link>
        )}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @media (min-width: 400px) {
          .xs\:inline { display: inline; }
        }
        .xs\:inline { display: none; }
      `}</style>
    </header>
  );
};

export default Navbar;
