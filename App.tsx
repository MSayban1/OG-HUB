import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { ref, onValue } from 'firebase/database';

// Components
import BottomNav from './components/BottomNav';
import SplashScreen from './screens/SplashScreen';
import Home from './screens/Home';
import Explore from './screens/Explore';
import Favorites from './screens/Favorites';
import AuthScreen from './screens/AuthScreen';
import Dashboard from './screens/Dashboard';
import GamePlayer from './screens/GamePlayer';
import AdminPanel from './screens/AdminPanel';
import SettingsScreen from './screens/SettingsScreen';
import SupportScreen from './screens/SupportScreen';
import ChatScreen from './screens/ChatScreen';
import Navbar from './components/Navbar';
import Toast, { ToastType } from './components/Toast';
import AboutModal from './components/AboutModal';
import ServerSelectionModal from './components/ServerSelectionModal';
import { BlockedUser } from './types';
import { LOGO_URL } from './constants';

// --- Production Error Boundary ---
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error?: Error; }

// Fix: Use the imported Component class directly to ensure proper TypeScript recognition of the 'props' property
class GlobalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Initialize state as a class property
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Global Error:", error, errorInfo);
  }

  render() {
    // Access state via 'this'
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-black text-rose-500 mb-4 uppercase">System Failure</h2>
          <p className="text-slate-400 text-sm mb-8">The Hub encountered an unexpected error. This has been logged for tactical review.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 px-8 py-3 rounded-xl font-black text-xs uppercase text-white shadow-lg"
          >
            Restart Hub
          </button>
        </div>
      );
    }
    // Fix: Correctly access children from the 'props' property of the Component instance
    return this.props.children;
  }
}

const BlockOverlay: React.FC<{ data: BlockedUser; onLogout: () => void }> = ({ data, onLogout }) => {
  const [timeLeft, setTimeLeft] = useState(Math.ceil((data.blockedUntil - Date.now()) / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.ceil((data.blockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        window.location.reload();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [data.blockedUntil]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center p-6 text-center animate-fadeIn">
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="relative inline-block">
          <img src={LOGO_URL} className="w-24 h-24 mx-auto grayscale opacity-50 mb-4" alt="OG HUB" />
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-rose-600/20 border-4 border-slate-950">
            <i className="fa-solid fa-lock text-xl"></i>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black text-slate-50 tracking-tighter uppercase">Protocol Suspension</h2>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 space-y-4">
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.3em]">Guardian Bot Enforcement</p>
            <p className="text-slate-400 text-sm italic">"{data.reason}"</p>
            <div className="pt-4 flex flex-col items-center">
              <span className="text-4xl font-black text-rose-500 font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="text-slate-500 hover:text-slate-300 font-black text-xs uppercase tracking-widest py-4 px-8">Disconnect Terminal</button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: ToastType } | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showServerSelect, setShowServerSelect] = useState(false);
  const [blockData, setBlockData] = useState<BlockedUser | null>(null);
  const location = useLocation();

  const showNotification = useCallback((message: string, type: ToastType) => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      // 1. Apply Accent Colors
      const savedTheme = localStorage.getItem('oghub_theme_colors');
      if (savedTheme) {
        try {
          const colors = JSON.parse(savedTheme);
          Object.keys(colors).forEach(key => document.documentElement.style.setProperty(`--theme-${key}`, colors[key]));
        } catch (e) { console.error(e); }
      }

      // 2. Apply Appearance Mode (Light/Dark/System)
      const mode = localStorage.getItem('oghub_appearance_mode') || 'system';
      const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;

      const shouldBeDark = mode === 'dark' || (mode === 'system' && isDarkSystem);

      if (shouldBeDark) {
        document.documentElement.classList.remove('light-mode');
      } else {
        document.documentElement.classList.add('light-mode');
      }
    };

    applyTheme();

    // Listen for system theme changes if in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const mode = localStorage.getItem('oghub_appearance_mode') || 'system';
      if (mode === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        localStorage.setItem('oghub_has_session', 'true');
        setIsAdmin(!!firebaseUser.email?.toLowerCase().endsWith('@oghub.com'));
      } else {
        setIsAdmin(false);
        setBlockData(null);
        localStorage.removeItem('oghub_has_session');
      }
      // Safety timeout for initialization to prevent permanent blank screen
      setTimeout(() => setInitializing(false), 500);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) { setBlockData(null); return; }
    const blockRef = ref(db, `userBlocks/${user.uid}`);
    const unsubscribe = onValue(blockRef, (snapshot) => {
      const data = snapshot.val() as BlockedUser | null;
      if (data && data.blockedUntil > Date.now()) setBlockData(data);
      else setBlockData(null);
    });
    return () => unsubscribe();
  }, [user]);

  if (initializing) return <SplashScreen />;

  const handleLogout = () => signOut(auth);

  const isInChat = location.pathname.startsWith('/chat/');
  const hideBottomNav = location.pathname.startsWith('/play/') ||
    location.pathname === '/auth' ||
    location.pathname === '/settings' ||
    location.pathname === '/support' ||
    location.pathname.startsWith('/admin') ||
    isInChat;

  const hideNavbar = isInChat || location.pathname.startsWith('/play/');

  return (
    <GlobalErrorBoundary>
      <div className={`min-h-screen ${!hideBottomNav ? 'pb-20' : ''} bg-slate-950 text-slate-50 flex flex-col transition-colors duration-300`}>
        {blockData && <BlockOverlay data={blockData} onLogout={handleLogout} />}
        {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
        <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
        <ServerSelectionModal isOpen={showServerSelect} onClose={() => setShowServerSelect(false)} />

        {!hideNavbar && (
          <Navbar
            isAdmin={isAdmin}
            user={user}
            onBrandClick={() => setShowAbout(true)}
            onChatClick={() => setShowServerSelect(true)}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${isInChat ? 'p-0' : 'px-4 py-6'}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/settings" element={<SettingsScreen onNotify={showNotification} onShowAbout={() => setShowAbout(true)} />} />
            <Route path="/support" element={user ? <SupportScreen onNotify={showNotification} /> : <Navigate to="/auth" />} />
            <Route path="/favorites" element={user ? <Favorites /> : <Navigate to="/auth" />} />
            <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <AuthScreen onNotify={showNotification} />} />
            <Route path="/dashboard" element={user ? <Dashboard onNotify={showNotification} /> : <Navigate to="/auth" />} />
            <Route path="/chat/:roomId" element={user ? <ChatScreen onNotify={showNotification} /> : <Navigate to="/auth" />} />
            <Route path="/play/:gameId" element={<GamePlayer onNotify={showNotification} />} />
            <Route path="/admin/*" element={isAdmin ? <AdminPanel onNotify={showNotification} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    </GlobalErrorBoundary>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;
