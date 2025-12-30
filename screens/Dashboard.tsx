
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, sendEmailVerification, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { ref, onValue, get, update } from 'firebase/database';
import { auth, db } from '../firebase';
import { UserProfile, Game, RecentlyPlayed, Favorite } from '../types';
import { ToastType } from '../components/Toast';

interface DashboardProps {
  onNotify: (msg: string, type: ToastType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNotify }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = ref(db, `users/${auth.currentUser.uid}`);
    const unsubscribeProfile = onValue(userRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfile({
          ...data,
          emailVerified: auth.currentUser?.emailVerified || false
        });
        setNewUsername(data.username || '');
      }
    });

    const recentRef = ref(db, `recentlyPlayed/${auth.currentUser.uid}`);
    const unsubscribeRecent = onValue(recentRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sorted = Object.values(data) as RecentlyPlayed[];
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        
        const gamePromises = sorted.slice(0, 4).map(async (r) => {
          const gRef = ref(db, `games/${r.gameId}`);
          const gSnap = await get(gRef);
          return gSnap.exists() ? { ...gSnap.val(), id: r.gameId } as Game : null;
        });

        const games = await Promise.all(gamePromises);
        setRecentGames(games.filter((g): g is Game => g !== null && !!g.name));
      } else {
        setRecentGames([]);
      }
    });

    const favoritesRef = ref(db, `favorites/${auth.currentUser.uid}`);
    const unsubscribeFavorites = onValue(favoritesRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const favItems = Object.values(data) as Favorite[];
        favItems.sort((a, b) => b.timestamp - a.timestamp);

        const gamePromises = favItems.map(async (f) => {
          const gRef = ref(db, `games/${f.gameId}`);
          const gSnap = await get(gRef);
          return gSnap.exists() ? { ...gSnap.val(), id: f.gameId } as Game : null;
        });

        const games = await Promise.all(gamePromises);
        setFavoriteGames(games.filter((g): g is Game => g !== null && !!g.name));
      } else {
        setFavoriteGames([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeRecent();
      unsubscribeFavorites();
    };
  }, []);

  const handleResendEmail = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      onNotify("Verification email sent! Check your inbox.", 'success');
    } catch (error: any) {
      onNotify(error.message, 'error');
    } finally {
      setResending(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    try {
      await sendPasswordResetEmail(auth.currentUser.auth, auth.currentUser.email);
      onNotify("Password reset link sent to your email!", "success");
    } catch (err: any) {
      onNotify(err.message, "error");
    }
  };

  const handleUpdateUsername = async () => {
    if (!auth.currentUser || !newUsername.trim()) return;
    if (newUsername.trim() === profile?.username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      await updateProfile(auth.currentUser, { displayName: newUsername.trim() });
      await update(ref(db, `users/${auth.currentUser.uid}`), { username: newUsername.trim() });
      setIsEditingUsername(false);
      onNotify("Username updated successfully!", "success");
    } catch (err: any) {
      onNotify(err.message, "error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 1024 * 1024 * 2) { // 2MB limit for base64 storage
      onNotify("Image size must be less than 2MB", "error");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await update(ref(db, `users/${auth.currentUser!.uid}`), { profilePicture: base64String });
        onNotify("Profile picture updated!", "success");
      } catch (err: any) {
        onNotify(err.message, "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRefreshStatus = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    onNotify("Account status updated.", 'info');
    window.location.reload();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('oghub_has_session');
      await signOut(auth);
      onNotify("Logged out successfully.", 'info');
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading Universe...</div>;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 flex space-x-2">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"
            title="Logout"
          >
            <i className="fa-solid fa-power-off text-sm"></i>
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 group">
             <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 cursor-pointer overflow-hidden relative"
             >
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {profile?.profilePicture ? (
                    <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-user text-4xl text-indigo-400"></i>
                  )}
                </div>
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <i className="fa-solid fa-camera text-white text-lg"></i>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <i className="fa-solid fa-circle-notch animate-spin text-white"></i>
                  </div>
                )}
             </div>
             <input 
               type="file" 
               className="hidden" 
               ref={fileInputRef} 
               accept="image/*" 
               onChange={handleFileChange} 
             />
             {profile?.emailVerified && (
               <div className="absolute bottom-0 right-0 bg-blue-500 w-8 h-8 rounded-full border-4 border-slate-900 flex items-center justify-center text-white z-10" title="Verified">
                 <i className="fa-solid fa-check text-[10px]"></i>
               </div>
             )}
          </div>
          
          <div className="flex flex-col items-center space-y-2 mb-4">
            {isEditingUsername ? (
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateUsername}
                  className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center active:scale-95"
                >
                  <i className="fa-solid fa-check text-xs"></i>
                </button>
                <button 
                  onClick={() => setIsEditingUsername(false)}
                  className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center active:scale-95"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-black text-slate-50">{profile?.username || 'Gamer'}</h2>
                <button 
                  onClick={() => setIsEditingUsername(true)}
                  className="text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  <i className="fa-solid fa-pen-to-square text-sm"></i>
                </button>
              </div>
            )}
            <p className="text-slate-500 text-sm">{profile?.email}</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-slate-700">
              ID: {profile?.uid?.slice(0, 8)}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${profile?.emailVerified ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
              {profile?.emailVerified ? 'Verified' : 'Unverified'}
            </span>
            <button 
              onClick={handlePasswordReset}
              className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              <i className="fa-solid fa-key mr-1.5"></i> Reset Password
            </button>
          </div>
        </div>
      </section>

      {/* NEW HELP & SUPPORT SECTION */}
      <section 
        onClick={() => navigate('/support')}
        className="bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex items-center justify-between group cursor-pointer active:scale-[0.98] transition-all"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
            <i className="fa-solid fa-headset text-xl"></i>
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-50 uppercase tracking-widest">Help & Support</h4>
            <p className="text-slate-500 text-[10px] font-bold">FAQs & Ticketing Assistance</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"></i>
      </section>

      {!profile?.emailVerified && (
        <section className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-bounce-subtle">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 text-xl">
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <div>
              <h4 className="font-bold text-amber-500 text-sm">Verify your account</h4>
              <p className="text-slate-400 text-xs">Check your inbox to unlock all platform features.</p>
            </div>
          </div>
          <div className="flex space-x-2 w-full md:w-auto">
            <button 
              onClick={handleResendEmail}
              disabled={resending}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all bg-amber-600 hover:bg-amber-700 text-white active:scale-95 disabled:opacity-50`}
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>
            <button 
              onClick={handleRefreshStatus}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
            >
              Check Status
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-3">
             <i className="fa-solid fa-stopwatch"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Play Time</p>
          <p className="text-2xl font-black text-slate-50">{formatTime(profile?.totalPlayTime || 0)}</p>
        </div>
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800">
          <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center mb-3">
             <i className="fa-solid fa-gamepad"></i>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Games Played</p>
          <p className="text-2xl font-black text-slate-50">{profile?.totalGamesPlayed || 0}</p>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-slate-50 flex items-center">
            <i className="fa-solid fa-heart text-rose-500 mr-2 text-sm"></i>
            Favorite Missions
          </h3>
          {favoriteGames.length > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 uppercase tracking-widest">
              {favoriteGames.length} Saved
            </span>
          )}
        </div>

        {favoriteGames.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {favoriteGames.map((game) => (
              <Link 
                key={game.id} 
                to={`/play/${game.id}`}
                className="group relative bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 transition-all active:scale-95 hover:border-rose-500/50 shadow-xl"
              >
                <div className="aspect-[1/1] overflow-hidden relative">
                  <img 
                    src={game.iconUrl} 
                    alt={game.name}
                    className="w-full h-full object-cover p-4 rounded-[3rem] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                  <div className="absolute top-4 right-4 text-rose-500 text-xs">
                    <i className="fa-solid fa-heart"></i>
                  </div>
                </div>
                <div className="p-4 pt-0">
                  <h4 className="font-black text-sm truncate text-slate-50 mb-1 group-hover:text-rose-400 transition-colors">{game.name}</h4>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{game.category}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 text-slate-600">
               <i className="fa-regular fa-heart text-xl"></i>
            </div>
            <p className="text-slate-500 text-sm font-medium">No favorite missions yet.</p>
            <p className="text-slate-600 text-xs mt-1">Tap the heart icon on any game to save it here!</p>
            <Link to="/explore" className="mt-6 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 px-4 py-2 rounded-xl hover:bg-indigo-500/10">
              Find Missions
            </Link>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-bold text-slate-50">Recently Played</h3>
        </div>

        {recentGames.length > 0 ? (
          <div className="space-y-3">
            {recentGames.map((game) => (
              <Link to={`/play/${game.id}`} key={game.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 flex items-center space-x-4 active:scale-[0.98] transition-all">
                <img src={game.iconUrl} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate text-slate-50">{game.name}</h4>
                  <p className="text-xs text-slate-500 uppercase">{game.category}</p>
                </div>
                <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg shadow-indigo-600/20">
                  <i className="fa-solid fa-play ml-0.5"></i>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 text-center">
            <p className="text-slate-500 text-sm">No games played yet. Let's start!</p>
          </div>
        )}
      </section>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
