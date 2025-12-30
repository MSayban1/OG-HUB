
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, get } from 'firebase/database';
import { auth, db } from '../firebase';
import { Game, Favorite } from '../types';

const Favorites: React.FC = () => {
  const [favoriteGames, setFavoriteGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const favoritesRef = ref(db, `favorites/${auth.currentUser.uid}`);
    const unsubscribeFavorites = onValue(favoritesRef, async (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const favItems = Object.values(data) as Favorite[];
        favItems.sort((a, b) => b.timestamp - a.timestamp);

        const gamePromises = favItems.map(async (f) => {
          const gRef = ref(db, `games/${f.gameId}`);
          const gSnap = await get(gRef);
          if (gSnap.exists()) {
            return { ...gSnap.val(), id: f.gameId } as Game;
          }
          return null;
        });

        const games = await Promise.all(gamePromises);
        setFavoriteGames(games.filter((g): g is Game => g !== null && !!g.name));
      } else {
        setFavoriteGames([]);
      }
      setLoading(false);
    });

    return () => unsubscribeFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Scanning your favorites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <header className="px-1 pt-2">
        <h2 className="text-3xl font-black text-slate-50">My Favorites</h2>
        <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest">Your personal collection</p>
      </header>

      {favoriteGames.length > 0 ? (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                
                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                  {game.isFeatured && (
                    <span className="bg-indigo-600 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg border border-indigo-400/20 flex items-center">
                      <i className="fa-solid fa-star mr-1 text-[6px]"></i> Featured
                    </span>
                  )}
                  {game.isTrending && (
                    <span className="bg-orange-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg shadow-orange-500/30 tracking-widest border border-orange-400/20 flex items-center">
                      <i className="fa-solid fa-fire mr-1"></i> Trending
                    </span>
                  )}
                </div>

                <div className="absolute top-4 right-4 text-rose-500 drop-shadow-lg z-10">
                  <i className="fa-solid fa-heart text-lg"></i>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
              </div>
              <div className="p-4 pt-0">
                <h4 className="font-black text-sm truncate text-slate-50 mb-1 group-hover:text-rose-400 transition-colors">{game.name}</h4>
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{game.category}</p>
                  <div className="flex items-center text-[8px] text-indigo-400/70">
                    <i className="fa-solid fa-play mr-1"></i>
                    <span>{game.playCount || 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 text-slate-600 relative">
            <i className="fa-regular fa-heart text-3xl"></i>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white border-4 border-slate-900">
              <i className="fa-solid fa-plus text-[10px]"></i>
            </div>
          </div>
          <h4 className="text-slate-50 font-black text-xl mb-2">No missions liked yet</h4>
          <p className="text-slate-500 text-xs max-w-[240px] leading-relaxed mb-8 font-medium">
            Browse the universe and heart your favorite games to build your personal library here!
          </p>
          <Link 
            to="/explore"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            Start Exploring
          </Link>
        </div>
      )}
    </div>
  );
};

export default Favorites;
