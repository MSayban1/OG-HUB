
import React, { useState, useEffect } from 'react';
import { ref, onValue, push, remove, update, set } from 'firebase/database';
import { db } from '../firebase';
import { Game, UserProfile, HomeBanner, SupportTicket, ChatRoom } from '../types';
import { CATEGORIES } from '../constants';
import { ToastType } from '../components/Toast';

interface AdminPanelProps {
  onNotify: (msg: string, type: ToastType) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onNotify }) => {
  const [tab, setTab] = useState<'games' | 'users' | 'banners' | 'add' | 'tickets' | 'servers'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [tickets, setTickets] = useState<(SupportTicket & { firebaseId: string })[]>([]);
  const [chatRooms, setChatRooms] = useState<(ChatRoom & { enabled?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconUrl: '',
    category: 'action',
    gameUrl: '',
    enabled: true,
    isFeatured: false,
    isNew: false,
    isTrending: false
  });

  const [serverFormData, setServerFormData] = useState({
    name: '',
    description: ''
  });

  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    const fetchAdminData = () => {
      onValue(ref(db, 'games'), (snapshot) => {
        const data = snapshot.val();
        setGames(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
      });

      onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const userList = Object.entries(data).map(([key, val]: [string, any]) => ({
            ...val,
            uid: val.uid || key
          })) as UserProfile[];
          setUsers(userList);
        } else {
          setUsers([]);
        }
        setLoading(false);
      });

      onValue(ref(db, 'banners'), (snapshot) => {
        const data = snapshot.val();
        setBanners(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
      });

      onValue(ref(db, 'tickets'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const ticketList = Object.keys(data).map(key => ({ ...data[key], firebaseId: key }));
          ticketList.sort((a, b) => b.timestamp - a.timestamp);
          setTickets(ticketList);
        } else {
          setTickets([]);
        }
      });

      onValue(ref(db, 'chatRooms'), (snapshot) => {
        const data = snapshot.val();
        setChatRooms(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
      });
    };

    fetchAdminData();
  }, []);

  const handleInitializeDefaultServers = async () => {
    if (!window.confirm("Deploy Servers 1-10? Existing servers will not be removed.")) return;

    try {
      const roomsRef = ref(db, 'chatRooms');
      for (let i = 1; i <= 10; i++) {
        const exists = chatRooms.some(r => r.name === `Server ${i}`);
        if (!exists) {
          const newRoomRef = push(roomsRef);
          await set(newRoomRef, {
            name: `Server ${i}`,
            description: `Global communication channel ${i} for active gamers.`,
            enabled: true,
            createdAt: Date.now()
          });
        }
      }
      onNotify('Core servers deployed successfully.', 'success');
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gamesRef = ref(db, 'games');
      await push(gamesRef, {
        ...formData,
        bannerUrl: formData.iconUrl,
        playCount: 0,
        likes: 0,
        dislikes: 0,
        createdAt: Date.now(),
        isExternal: true
      });
      onNotify('Game added successfully!', 'success');
      setTab('games');
      resetFormData();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleUpdateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    try {
      const gameRef = ref(db, `games/${editingGame.id}`);
      await update(gameRef, {
        ...formData,
        bannerUrl: formData.iconUrl // Keep banner in sync with icon for now
      });
      onNotify('Mission updated successfully!', 'success');
      setEditingGame(null);
      resetFormData();
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      iconUrl: '',
      category: 'action',
      gameUrl: '',
      enabled: true,
      isFeatured: false,
      isNew: false,
      isTrending: false
    });
  };

  const openEditModal = (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      description: game.description,
      iconUrl: game.iconUrl,
      category: game.category,
      gameUrl: game.gameUrl,
      enabled: game.enabled,
      isFeatured: !!game.isFeatured,
      isNew: !!game.isNew,
      isTrending: !!game.isTrending
    });
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverFormData.name.trim()) return;
    try {
      const roomsRef = ref(db, 'chatRooms');
      const newRoomRef = push(roomsRef);
      await set(newRoomRef, {
        name: serverFormData.name.trim(),
        description: serverFormData.description.trim() || 'Global communication channel.',
        enabled: true,
        createdAt: Date.now()
      });
      onNotify(`${serverFormData.name} synchronized to the grid!`, 'success');
      setServerFormData({ name: '', description: '' });
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerUrl) return;
    try {
      await push(ref(db, 'banners'), {
        url: bannerUrl,
        timestamp: Date.now()
      });
      setBannerUrl('');
      onNotify('Home banner added!', 'success');
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  const toggleGameStatus = (id: string, current: boolean) => {
    update(ref(db, `games/${id}`), { enabled: !current });
    onNotify('Status updated', 'success');
  };

  const toggleFeaturedStatus = (id: string, current: boolean) => {
    update(ref(db, `games/${id}`), { isFeatured: !current });
    onNotify(current ? 'Removed from Featured' : 'Added to Featured', 'success');
  };

  const toggleServerStatus = (id: string, current: boolean) => {
    update(ref(db, `chatRooms/${id}`), { enabled: !current });
    onNotify(`Server ${current ? 'deactivated' : 'activated'}`, 'success');
  };

  const deleteServer = (id: string) => {
    if (window.confirm('Delete this server frequency?')) {
      remove(ref(db, `chatRooms/${id}`));
      onNotify('Server decommissioned', 'info');
    }
  };

  const deleteGame = (id: string) => {
    if (window.confirm('Delete this game mission?')) {
      remove(ref(db, `games/${id}`));
      onNotify('Game deleted', 'info');
    }
  };

  const deleteTicket = (firebaseId: string) => {
    if (window.confirm('Archive this ticket?')) {
      remove(ref(db, `tickets/${firebaseId}`));
      onNotify('Ticket archived', 'info');
    }
  };

  const toggleTicketStatus = async (firebaseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open';
    try {
      await update(ref(db, `tickets/${firebaseId}`), { status: newStatus });
      onNotify(`Ticket marked as ${newStatus}`, 'success');
    } catch (err: any) {
      onNotify(err.message, 'error');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 uppercase font-black text-xs tracking-widest animate-pulse">Accessing Console...</div>;

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-4 sm:px-0">
        <div>
          <h2 className="text-3xl font-black text-contrast tracking-tighter">Command Center</h2>
          <p className="text-theme-400 font-bold text-[10px] uppercase tracking-[0.2em]">Verified Hub Authority</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-hide">
          <button onClick={() => setTab('games')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap ${tab === 'games' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>Missions</button>
          <button onClick={() => setTab('servers')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap ${tab === 'servers' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>Servers</button>
          <button onClick={() => setTab('banners')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap ${tab === 'banners' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>Banners</button>
          <button onClick={() => setTab('tickets')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap relative ${tab === 'tickets' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>
            Intelligence
            {tickets.filter(t => t.status === 'open').length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-slate-900">{tickets.filter(t => t.status === 'open').length}</span>}
          </button>
          <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap ${tab === 'users' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>Gamers</button>
          <button onClick={() => setTab('add')} className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all whitespace-nowrap ${tab === 'add' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500'}`}>+ Deploy</button>
        </div>
      </div>

      <div className="px-4 sm:px-0">
        {tab === 'games' && (
          <div className="grid gap-4">
            {games.length > 0 ? games.map(game => (
              <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center space-x-5 shadow-xl group">
                <div className="relative">
                  <img src={game.iconUrl} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-800" alt={game.name} />
                  {game.isFeatured && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-theme-600 rounded-full flex items-center justify-center text-white text-[10px] border-2 border-slate-900 shadow-lg">
                      <i className="fa-solid fa-star"></i>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-contrast text-sm truncate">{game.name}</h4>
                  <div className="flex gap-2 items-center">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{game.category}</p>
                    {game.isNew && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">New</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleFeaturedStatus(game.id, !!game.isFeatured)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${game.isFeatured ? 'bg-theme-500/20 border-theme-500 text-theme-400' : 'bg-slate-800 border-slate-700 text-slate-600'}`}
                    title="Toggle Featured"
                  >
                    <i className="fa-solid fa-star"></i>
                  </button>
                  <button
                    onClick={() => openEditModal(game)}
                    className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:bg-theme-600 hover:text-white transition-all shadow-inner"
                    title="Edit Mission"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button onClick={() => toggleGameStatus(game.id, game.enabled)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${game.enabled ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>{game.enabled ? 'Active' : 'Offline'}</button>
                  <button onClick={() => deleteGame(game.id)} className="w-10 h-10 rounded-xl bg-slate-800 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-trash-can"></i></button>
                </div>
              </div>
            )) : <p className="text-center text-slate-600 py-12 font-bold italic">The hub is currently empty.</p>}
          </div>
        )}

        {tab === 'servers' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-theme-500/10 rounded-full flex items-center justify-center text-theme-400 mb-2">
                <i className="fa-solid fa-server text-2xl"></i>
              </div>
              <h3 className="text-contrast font-black text-xl">Core Grid Sync</h3>
              <p className="text-slate-500 text-xs max-w-sm">Synchronize standard Server 1-10 to the grid. Existing nodes will be preserved.</p>
              <button onClick={handleInitializeDefaultServers} className="bg-theme-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-theme-600/20 border-b-4 border-theme-800">Initialize Core (1-10)</button>
            </div>

            <form onSubmit={handleAddServer} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center"><i className="fa-solid fa-plus-circle mr-2 text-theme-400"></i>Custom Node Deployment</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" required placeholder="Server Name" className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm focus:ring-2 focus:ring-theme-500/50 text-white placeholder:text-slate-700" value={serverFormData.name} onChange={(e) => setServerFormData({ ...serverFormData, name: e.target.value })} />
                <input type="text" placeholder="Mission Briefing..." className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm focus:ring-2 focus:ring-theme-500/50 text-white placeholder:text-slate-700" value={serverFormData.description} onChange={(e) => setServerFormData({ ...serverFormData, description: e.target.value })} />
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-750 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all border border-slate-700">Open Frequency</button>
            </form>

            <div className="grid gap-4">
              {chatRooms.length > 0 ? chatRooms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(room => (
                <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center space-x-5 shadow-xl">
                  <div className={`w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 ${room.enabled ? 'text-theme-400' : 'text-slate-700'}`}>
                    <i className="fa-solid fa-tower-broadcast"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-sm uppercase tracking-tight truncate ${room.enabled ? 'text-contrast' : 'text-slate-500'}`}>{room.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-1 italic">"{room.description}"</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => toggleServerStatus(room.id, !!room.enabled)} className={`w-12 h-6 rounded-full relative transition-colors ${room.enabled ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${room.enabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
                    <button onClick={() => deleteServer(room.id)} className="w-10 h-10 rounded-xl bg-slate-800/50 text-slate-500 hover:bg-red-500 hover:text-white transition-all shadow-inner"><i className="fa-solid fa-trash-can text-xs"></i></button>
                  </div>
                </div>
              )) : <p className="text-center text-slate-600 py-12 font-bold italic">No grid nodes detected.</p>}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Gamer Registry ({users.length})</h4>
            </div>
            <div className="overflow-x-auto w-full scrollbar-hide">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-950/50 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <th className="px-8 py-4">Identity</th>
                    <th className="px-8 py-4">Security Domain</th>
                    <th className="px-8 py-4">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => {
                    const email = u.email || 'No Email';
                    const isSystemAdmin = email.toLowerCase().endsWith('@oghub.com');
                    return (
                      <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="font-black text-sm text-contrast truncate max-w-[150px]">{u.username || 'Anonymous'}</p>
                          <p className="text-[10px] text-slate-500 font-bold truncate max-w-[200px]">{email}</p>
                        </td>
                        <td className="px-8 py-5">
                          {isSystemAdmin ? (
                            <span className="px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-theme-500 text-white shadow-lg shadow-theme-500/20">Admin</span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest bg-slate-800 text-slate-500 border border-slate-700">Public</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{u.totalGamesPlayed || 0} Sessions</span>
                            <span className="text-[8px] text-slate-600 uppercase font-black">{Math.floor((u.totalPlayTime || 0) / 60)} Mins Played</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="grid gap-6">
            {tickets.length > 0 ? tickets.map((ticket) => (
              <div key={ticket.firebaseId} className={`bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden group ${ticket.status === 'resolved' ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                <div className="absolute top-0 right-0 p-6 flex flex-col items-end space-y-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-theme-500/10 text-theme-400 border-theme-500/20'}`}>ID: {ticket.id}</span>
                  <p className="text-[8px] text-slate-600 font-black uppercase">{new Date(ticket.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-start space-x-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                    {ticket.profilePicture ? <img src={ticket.profilePicture} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 text-xl"><i className="fa-solid fa-user-ninja"></i></div>}
                  </div>
                  <div className="flex-1 space-y-4 pt-1 min-w-0">
                    <div>
                      <h4 className="font-black text-contrast text-base truncate">{ticket.username}</h4>
                      <p className="text-[10px] text-slate-500 font-bold truncate">{ticket.email}</p>
                    </div>
                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-4">
                      <p className="text-[9px] font-black uppercase text-theme-400 mb-1">{ticket.problemType}</p>
                      <p className="text-slate-300 text-xs leading-relaxed italic truncate">"{ticket.description}"</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleTicketStatus(ticket.firebaseId, ticket.status)} className="flex-1 bg-slate-800 text-white font-black text-[9px] uppercase py-3 rounded-xl border border-slate-700 active:scale-95 transition-all">{ticket.status === 'resolved' ? 'Re-open' : 'Resolve'}</button>
                      <button onClick={() => deleteTicket(ticket.firebaseId)} className="px-4 bg-slate-950 text-red-500/50 border border-slate-800 rounded-xl py-3"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            )) : <p className="text-center text-slate-600 py-20 font-bold italic">No active intelligence reports.</p>}
          </div>
        )}

        {tab === 'banners' && (
          <div className="space-y-6">
            <form onSubmit={handleAddBanner} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Update Hero Comms</h4>
              <div className="flex gap-2">
                <input type="url" required placeholder="Image URL..." className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm focus:ring-2 focus:ring-theme-500/50 text-white placeholder:text-slate-700" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
                <button type="submit" className="bg-theme-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">Add</button>
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map(b => (
                <div key={b.id} className="relative group rounded-3xl overflow-hidden border border-slate-800 bg-slate-900">
                  <img src={b.url} className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                  <button onClick={() => { if (window.confirm('Delete banner?')) remove(ref(db, `banners/${b.id}`)) }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"><i className="fa-solid fa-trash"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab === 'add' || editingGame) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => { setEditingGame(null); resetFormData(); if (tab === 'add') setTab('games'); }}></div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative w-full max-w-2xl animate-page-transition overflow-y-auto max-h-[90vh] scrollbar-hide">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-contrast tracking-tighter">{editingGame ? 'Update Mission' : 'Deploy New Mission'}</h3>
                  <p className="text-[10px] font-black uppercase text-theme-400 tracking-widest">{editingGame ? `Edit ID: ${editingGame.id}` : 'Catalog Expansion'}</p>
                </div>
                <button onClick={() => { setEditingGame(null); resetFormData(); if (tab === 'add') setTab('games'); }} className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <form onSubmit={editingGame ? handleUpdateGame : handleAddGame} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Game Title</label><input type="text" required placeholder="e.g. Neon Runner" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm text-white focus:ring-2 focus:ring-theme-500/30" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label><select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm text-white appearance-none focus:ring-2 focus:ring-theme-500/30" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Icon URL</label><input type="url" required placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm text-white focus:ring-2 focus:ring-theme-500/30" value={formData.iconUrl} onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Source URL</label><input type="url" required placeholder="https://..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm text-white focus:ring-2 focus:ring-theme-500/30" value={formData.gameUrl} onChange={(e) => setFormData({ ...formData, gameUrl: e.target.value })} /></div>
                  </div>
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Briefing</label><textarea rows={3} required placeholder="Mission description..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 outline-none text-sm text-white resize-none focus:ring-2 focus:ring-theme-500/30" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900 cursor-pointer transition-all hover:bg-slate-800">
                    <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} className="sr-only" />
                    <i className={`fa-solid fa-power-off mb-1 ${formData.enabled ? 'text-emerald-500' : 'text-slate-600'}`}></i>
                    <span className="text-[8px] font-black uppercase text-slate-400">Enabled</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900 cursor-pointer transition-all hover:bg-slate-800">
                    <input type="checkbox" checked={formData.isFeatured} onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} className="sr-only" />
                    <i className={`fa-solid fa-star mb-1 ${formData.isFeatured ? 'text-theme-500' : 'text-slate-600'}`}></i>
                    <span className="text-[8px] font-black uppercase text-slate-400">Featured</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900 cursor-pointer transition-all hover:bg-slate-800">
                    <input type="checkbox" checked={formData.isNew} onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })} className="sr-only" />
                    <i className={`fa-solid fa-certificate mb-1 ${formData.isNew ? 'text-emerald-500' : 'text-slate-600'}`}></i>
                    <span className="text-[8px] font-black uppercase text-slate-400">New</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-800 bg-slate-900 cursor-pointer transition-all hover:bg-slate-800">
                    <input type="checkbox" checked={formData.isTrending} onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })} className="sr-only" />
                    <i className={`fa-solid fa-fire mb-1 ${formData.isTrending ? 'text-orange-500' : 'text-slate-600'}`}></i>
                    <span className="text-[8px] font-black uppercase text-slate-400">Trending</span>
                  </label>
                </div>

                <button type="submit" className="w-full bg-theme-600 text-white font-black py-5 rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-[0.2em] border-b-4 border-theme-800 shadow-xl shadow-theme-600/20">
                  {editingGame ? 'Finalize Updates' : 'Deploy Mission'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
