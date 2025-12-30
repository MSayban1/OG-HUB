
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { Game } from '../types';
import { CATEGORIES } from '../constants';

const Explore: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gamesRef = ref(db, 'games');
    const unsubscribeGames = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      setGames(data ? Object.keys(data).map(key => ({ ...data[key], id: key })).filter(g => g.enabled) : []);
      setLoading(false);
    });

    return () => unsubscribeGames();
  }, []);

  const filteredGames = games.filter(g => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'featured' ? g.isFeatured : g.category === selectedCategory);
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <section className="px-1 pt-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <i className="fa-solid fa-magnifying-glass text-slate-500 group-focus-within:text-theme-400 transition-colors"></i>
          </div>
          <input
            type="text"
            placeholder="Search the entire universe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-contrast text-sm rounded-2xl pl-11 pr-4 py-4 outline-none transition-all focus:ring-2 focus:ring-theme-500/50 focus:border-theme-500/50 shadow-xl"
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 ml-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Categories</h3>
        </div>
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${selectedCategory === 'all' ? 'bg-theme-600 text-white border-theme-500 shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
          >
            All Games
          </button>
          <button
            onClick={() => setSelectedCategory('featured')}
            className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all border ${selectedCategory === 'featured' ? 'bg-theme-600 text-white border-theme-500 shadow-lg' : 'bg-slate-900 text-amber-500 border-slate-800'}`}
          >
            <i className="fa-solid fa-star"></i>
            <span>Featured</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all border ${selectedCategory === cat.id ? 'bg-theme-600 text-white border-theme-500 shadow-lg' : 'bg-slate-900 text-slate-500 border-slate-800'}`}
            >
              <i className={`fa-solid ${cat.icon}`}></i>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black text-contrast">
            {searchQuery ? `Search Results (${filteredGames.length})` : selectedCategory !== 'all' ? `${selectedCategory.toUpperCase()} Games` : 'Full Universe'}
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <GameCardSkeleton key={i} />)}
          </div>
        ) : filteredGames.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <Link
                key={game.id}
                to={`/play/${game.id}`}
                className="group relative bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 transition-all active:scale-95 hover:border-theme-500/50 shadow-xl"
              >
                <div className="aspect-[1/1] overflow-hidden relative">
                  <img
                    src={game.iconUrl}
                    alt={game.name}
                    className="w-full h-full object-cover p-4 rounded-[3rem] group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                    {game.isFeatured && (
                      <span className="bg-theme-600 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg border border-theme-400/20 flex items-center">
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
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center text-[8px] text-emerald-400/70">
                          <i className="fa-solid fa-thumbs-up mr-1"></i>
                          <span>{game.likes || 0}</span>
                        </div>
                        <div className="flex items-center text-[8px] text-rose-400/70">
                          <i className="fa-solid fa-thumbs-down mr-1"></i>
                          <span>{game.dislikes || 0}</span>
                        </div>
                      </div>
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
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <i className="fa-solid fa-ghost text-2xl text-slate-600"></i>
            </div>
            <h4 className="text-contrast font-bold mb-2">No missions available</h4>
            <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">We couldn't find any games matching these filters. Try adjusting your search!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Explore;
