
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get, set, update, increment, remove, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { Game } from '../types';
import { ToastType } from '../components/Toast';

interface GamePlayerProps {
  onNotify: (msg: string, type: ToastType) => void;
}

const GamePlayer: React.FC<GamePlayerProps> = ({ onNotify }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<'info' | 'loading' | 'playing'>('info');
  const [loadingGame, setLoadingGame] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      window.location.hash = '#/';
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const fetchGame = () => {
      if (!gameId) return;
      const gameRef = ref(db, `games/${gameId}`);
      const unsubscribeGame = onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          const gameData = snapshot.val();
          setGame({ ...gameData, id: gameId });
        } else {
          handleHardExit();
        }
        setLoadingGame(false);
      });
      return unsubscribeGame;
    };

    const unsubGame = fetchGame();

    let unsubscribeFav: (() => void) | undefined;
    let unsubscribeReaction: (() => void) | undefined;
    
    if (auth.currentUser && gameId) {
      const favRef = ref(db, `favorites/${auth.currentUser.uid}/${gameId}`);
      unsubscribeFav = onValue(favRef, (snapshot) => {
        setIsFavorite(snapshot.exists());
      });

      const reactionRef = ref(db, `userReactions/${auth.currentUser.uid}/${gameId}`);
      unsubscribeReaction = onValue(reactionRef, (snapshot) => {
        setUserReaction(snapshot.val());
      });
    }

    return () => {
      if (unsubGame) unsubGame();
      if (unsubscribeFav) unsubscribeFav();
      if (unsubscribeReaction) unsubscribeReaction();
      if (viewMode === 'playing') {
        const duration = Math.floor((Date.now() - startTime.current) / 1000);
        if (auth.currentUser && duration > 5) {
          const userRef = ref(db, `users/${auth.currentUser.uid}`);
          update(userRef, { totalPlayTime: increment(duration) });
        }
      }
    };
  }, [gameId, viewMode]);

  const handleHardExit = () => {
    window.location.hash = '#/';
  };

  const toggleFavorite = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!auth.currentUser || !gameId) {
      navigate('/auth');
      return;
    }

    const favRef = ref(db, `favorites/${auth.currentUser.uid}/${gameId}`);
    try {
      if (isFavorite) {
        await remove(favRef);
        onNotify(`${game?.name} removed from favorites`, 'info');
      } else {
        await set(favRef, {
          gameId,
          timestamp: Date.now()
        });
        onNotify(`${game?.name} added to favorites!`, 'success');
      }
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleReaction = async (type: 'like' | 'dislike') => {
    if (!auth.currentUser || !gameId) {
      navigate('/auth');
      return;
    }

    const reactionRef = ref(db, `userReactions/${auth.currentUser.uid}/${gameId}`);
    const gameRef = ref(db, `games/${gameId}`);

    try {
      if (userReaction === type) {
        // Toggle off
        await remove(reactionRef);
        await update(gameRef, { [type === 'like' ? 'likes' : 'dislikes']: increment(-1) });
      } else if (userReaction === null) {
        // Simple add
        await set(reactionRef, type);
        await update(gameRef, { [type === 'like' ? 'likes' : 'dislikes']: increment(1) });
      } else {
        // Switch reaction
        const oldType = userReaction;
        await set(reactionRef, type);
        await update(gameRef, { 
          [oldType === 'like' ? 'likes' : 'dislikes']: increment(-1),
          [type === 'like' ? 'likes' : 'dislikes']: increment(1)
        });
      }
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleStartGame = async () => {
    if (!game) return;
    setViewMode('loading');
    
    setTimeout(async () => {
      startTime.current = Date.now();
      setViewMode('playing');

      if (auth.currentUser) {
        const userUid = auth.currentUser.uid;
        update(ref(db, `users/${userUid}`), { totalGamesPlayed: increment(1) });
        update(ref(db, `games/${gameId}`), { playCount: increment(1) });
        set(ref(db, `recentlyPlayed/${userUid}/${gameId}`), { gameId, timestamp: Date.now() });
      }
    }, 2400); 
  };

  if (loadingGame) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 px-8">
        <div className="w-full max-w-xs space-y-6">
           <div className="aspect-square w-48 mx-auto rounded-[3rem] skeleton-base shadow-2xl"></div>
           <div className="space-y-3">
             <div className="h-8 w-full skeleton-base rounded-2xl"></div>
             <div className="h-4 w-2/3 skeleton-base rounded-full mx-auto opacity-50"></div>
           </div>
        </div>
      </div>
    );
  }

  if (!game) return null;

  if (viewMode === 'info') {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[60] flex flex-col overflow-hidden page-transition">
        <div className="shrink-0 p-6 z-30 flex items-center justify-between">
          <button 
            onClick={handleHardExit}
            className="w-10 h-10 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-50 active:scale-90 transition-all shadow-2xl pointer-events-auto"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          
          <button 
            onClick={toggleFavorite}
            className={`w-10 h-10 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-2xl ${isFavorite ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' : 'bg-slate-900/90 border-white/10 text-slate-50'}`}
          >
            <i className={`fa-${isFavorite ? 'solid' : 'regular'} fa-heart`}></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 flex flex-col items-center scrollbar-hide pb-10">
          <div className="relative w-full max-w-[240px] aspect-square mb-8 mt-2 shrink-0">
            <div className="absolute -inset-6 bg-indigo-500 rounded-full blur-[80px] opacity-10"></div>
            <img 
              src={game.iconUrl} 
              className="w-full h-full object-cover rounded-[2.5rem] shadow-2xl relative border-4 border-slate-900"
              alt={game.name}
            />
          </div>

          <div className="text-center space-y-3 mb-8 shrink-0">
            <h2 className="text-3xl font-black text-slate-50 tracking-tighter leading-tight px-4">{game.name}</h2>
            <div className="flex items-center justify-center flex-wrap gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white px-3 py-1 rounded-full">{game.category}</span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 px-3 py-1 rounded-full">Universe Certified</span>
              {game.isNew && (
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">New</span>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-6 mt-4">
              <button 
                onClick={() => handleReaction('like')}
                className={`flex flex-col items-center group transition-all active:scale-90 ${userReaction === 'like' ? 'text-emerald-500' : 'text-slate-500'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 border-2 transition-all ${userReaction === 'like' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                  <i className="fa-solid fa-thumbs-up text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{game.likes || 0} Likes</span>
              </button>

              <button 
                onClick={() => handleReaction('dislike')}
                className={`flex flex-col items-center group transition-all active:scale-90 ${userReaction === 'dislike' ? 'text-rose-500' : 'text-slate-500'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 border-2 transition-all ${userReaction === 'dislike' ? 'bg-rose-500/20 border-rose-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                  <i className="fa-solid fa-thumbs-down text-xl"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{game.dislikes || 0} Dislikes</span>
              </button>
            </div>
          </div>

          <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 space-y-4 mb-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-center">
              <i className="fa-solid fa-circle-info mr-2 text-indigo-500"></i>
              Mission Briefing
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed text-center italic opacity-90">
              "{game.description}"
            </p>
          </div>
        </div>

        <div className="shrink-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-12 border-t border-slate-900/50">
          <button 
            onClick={handleStartGame}
            className="w-full max-w-md mx-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[1.8rem] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.5)] active:scale-95 transition-all text-lg flex items-center justify-center space-x-4 border-b-4 border-indigo-800"
          >
            <i className="fa-solid fa-play text-xl"></i>
            <span className="tracking-tight">INITIALIZE SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[70] flex flex-col items-center justify-center space-y-12 px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <div className="relative">
          <div className="w-32 h-32 border-4 border-indigo-500/5 rounded-full"></div>
          <div className="absolute inset-0 w-32 h-32 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative group">
               <div className="absolute -inset-4 bg-indigo-500/20 rounded-2xl blur-xl group-hover:opacity-100 opacity-70 transition-opacity"></div>
               <img src={game.iconUrl} className="w-20 h-20 rounded-3xl object-cover shadow-2xl relative border-2 border-white/10" alt="Icon" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-6 relative z-10 w-full max-w-xs">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-slate-50 tracking-tighter">Linking Realities</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 animate-pulse">Syncing Game Data...</p>
          </div>
          <div className="w-full h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 rounded-full w-0 animate-[progress_2.4s_ease-in-out_forwards] shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          </div>
          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-600">
             <span>Protocol: WebXR</span>
             <span className="animate-pulse">Active <i className="fa-solid fa-circle text-[6px] ml-1 text-emerald-500"></i></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-[80] flex flex-col h-full w-full overflow-hidden">
      <div className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-lg">
        <button 
          onClick={handleHardExit}
          className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-90 transition-all hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500"
          title="Exit Session"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex items-center space-x-3 flex-1 px-4 min-w-0 justify-center">
          <img src={game.iconUrl} className="w-8 h-8 rounded-lg shadow-md border border-slate-700" alt={game.name} />
          <h2 className="font-bold text-sm truncate text-slate-50 max-w-[150px]">{game.name}</h2>
          <div className="flex items-center space-x-2 ml-4">
            <button 
              onClick={() => handleReaction('like')}
              className={`transition-all active:scale-125 ${userReaction === 'like' ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              <i className="fa-solid fa-thumbs-up text-xs"></i>
              <span className="ml-1 text-[8px] font-black">{game.likes || 0}</span>
            </button>
            <button 
              onClick={() => handleReaction('dislike')}
              className={`transition-all active:scale-125 ${userReaction === 'dislike' ? 'text-rose-400' : 'text-slate-500'}`}
            >
              <i className="fa-solid fa-thumbs-down text-xs"></i>
              <span className="ml-1 text-[8px] font-black">{game.dislikes || 0}</span>
            </button>
          </div>
        </div>
        <button 
           onClick={() => {
             const doc = window.document;
             const docEl = doc.documentElement;
             if (!doc.fullscreenElement) {
               docEl.requestFullscreen().catch(() => {});
             } else {
               doc.exitFullscreen().catch(() => {});
             }
           }}
           className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-90 transition-all"
        >
           <i className="fa-solid fa-expand text-sm"></i>
        </button>
      </div>
      <div className="flex-1 bg-black relative">
        <iframe src={game.gameUrl} className="absolute inset-0 w-full h-full border-none" title={game.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
      </div>
    </div>
  );
};

export default GamePlayer;
