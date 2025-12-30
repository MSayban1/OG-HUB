
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { Game, HomeBanner } from '../types';

const Home: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gamesRef = ref(db, 'games');
    const unsubscribeGames = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      const gamesList = data ? Object.keys(data).map(key => ({ ...data[key], id: key })).filter(g => g.enabled) : [];
      setAllGames(gamesList);
      setFeaturedGames(gamesList.filter(g => g.isFeatured));
      setLoading(false);
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setLoading(false);
    });

    const bannersRef = ref(db, 'banners');
    const unsubscribeBanners = onValue(bannersRef, (snapshot) => {
      const data = snapshot.val();
      setBanners(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
    });

    return () => {
      unsubscribeGames();
      unsubscribeBanners();
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const filteredFeatured = featuredGames.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredAll = allGames.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const GameCardSkeleton = () => (
    <div className="bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-xl p-4 space-y-3">
      <div className="aspect-square rounded-[2.2rem] skeleton-base"></div>
      <div className="space-y-2 px-1">
        <div className="h-4 w-3/4 skeleton-base rounded-full"></div>
        <div className="h-3 w-1/2 skeleton-base rounded-full opacity-50"></div>
      </div>
    </div>
  );

  const GameGrid = ({ gamesList, title, icon, showIfEmpty = true }: { gamesList: Game[], title: string, icon: string, showIfEmpty?: boolean }) => {
    if (!showIfEmpty && gamesList.length === 0) return null;

    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-contrast flex items-center">
            <i className={`fa-solid ${icon} text-theme-400 mr-2 text-sm`}></i>
            {title}
          </h3>
        </div>

        {gamesList.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gamesList.map((game) => (
              <Link
                key={game.id}
                to={`/play/${game.id}`}
                className="group relative bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 transition-all active:scale-95 hover:border-theme-500/50 shadow-xl"
              >
                <div className="aspect-[1/1] overflow-hidden relative">
                  <img
                    src={game.iconUrl}
                    alt={game.name}
                    loading="lazy"
                    className="w-full h-full object-cover p-4 rounded-[3rem] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                    {game.isFeatured && (
                      <span className="bg-theme-600 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg border border-theme-400/20 flex items-center featured-pulse">
                        <i className="fa-solid fa-star mr-1 text-[6px]"></i> Featured
                      </span>
                    )}
                    {game.isNew && <span className="bg-emerald-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg border border-emerald-400/20">New</span>}
                    {game.isTrending && <span className="bg-orange-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg border border-orange-400/20 flex items-center"><i className="fa-solid fa-fire mr-1"></i> Trending</span>}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                </div>
                <div className="p-4 pt-0">
                  <h4 className="font-black text-sm truncate text-contrast mb-1 group-hover:text-theme-400 transition-colors">{game.name}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">{game.category}</p>
                    </div>
                    <div className="flex items-center text-[8px] text-theme-400/70">
                      <i className="fa-solid fa-play mr-1"></i>
                      <span>{game.playCount || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-600">
              <i className="fa-solid fa-ghost text-2xl"></i>
            </div>
            <h4 className="text-contrast font-bold mb-2">No Missions Found</h4>
            <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">Check back later for new universe updates!</p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <section className="relative h-48 rounded-[2rem] overflow-hidden shadow-2xl shadow-theme-500/10 bg-slate-900 border border-slate-800">
        {banners.length > 0 ? (
          <div className="w-full h-full relative transition-all duration-700 ease-in-out">
            <img src={banners[currentBannerIndex].url} className="w-full h-full object-cover opacity-80" alt="Slider" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5">
              {banners.map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'w-6 bg-theme-500' : 'w-1.5 bg-slate-600'}`}></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-slate-900 flex flex-col justify-end p-6">
            <h2 className="text-2xl font-black text-contrast leading-tight">Level Up Your Fun</h2>
            <p className="text-slate-400 text-sm">Play premium web missions instantly.</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"></div>
      </section>

      <section className="px-1">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-slate-500 group-focus-within:text-theme-400 transition-colors"></i>
          </div>
          <input
            type="text"
            placeholder="Search all missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-contrast text-sm rounded-2xl pl-11 pr-4 py-4 outline-none transition-all focus:ring-2 focus:ring-theme-500/50"
          />
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <GameCardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <GameGrid gamesList={filteredFeatured} title="Featured Universe" icon="fa-star" showIfEmpty={featuredGames.length > 0} />
          <GameGrid gamesList={filteredAll} title="All Missions" icon="fa-gamepad" />
        </>
      )}
    </div>
  );
};

export default Home;
