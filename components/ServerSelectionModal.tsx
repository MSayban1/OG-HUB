
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, db_fs } from '../firebase';
import { ChatRoom } from '../types';

interface ServerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ParticipantCount: React.FC<{ roomId: string; enabled: boolean }> = ({ roomId, enabled }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const participantsRef = collection(db_fs, 'chats', roomId, 'participants');
    const unsubscribe = onSnapshot(participantsRef, (snapshot) => {
      setCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [roomId, enabled]);

  if (!enabled) {
    return (
      <div className="flex items-center space-x-1 text-rose-500 opacity-80">
        <i className="fa-solid fa-power-off text-[10px]"></i>
        <span className="text-[10px] font-black tracking-widest uppercase">Deactivated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1 text-emerald-500 group-hover:text-indigo-400 transition-colors">
      <i className="fa-solid fa-user-group text-[10px]"></i>
      <span className="text-[10px] font-black tracking-widest uppercase">{count} Active</span>
    </div>
  );
};

const ServerSelectionModal: React.FC<ServerSelectionModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<(ChatRoom & { enabled?: boolean })[]>([]);

  useEffect(() => {
    const roomsRef = ref(db, 'chatRooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Fetch all rooms, do not filter out disabled ones as per user request
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        // Sort rooms by name or creation
        list.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          // Natural sort for "Server 1", "Server 2", "Server 10"
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setRooms(list);
      } else {
        setRooms([]);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleSelect = (room: ChatRoom & { enabled?: boolean }) => {
    if (room.enabled === false) return;
    navigate(`/chat/${room.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-slate-900 w-full max-w-lg rounded-[3rem] border border-slate-800 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-page-transition flex flex-col h-[75vh]">
        
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <i className="fa-solid fa-server"></i>
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-50 tracking-tighter">Global Servers</h4>
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Select your frequency</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
          {rooms.length > 0 ? (
            rooms.map((room, idx) => {
              const isEnabled = room.enabled !== false;
              return (
                <button 
                  key={room.id}
                  onClick={() => handleSelect(room)}
                  disabled={!isEnabled}
                  className={`w-full bg-slate-950/50 border border-slate-800 p-5 rounded-[2.5rem] flex items-center justify-between group transition-all text-left ${
                    isEnabled 
                    ? 'hover:border-indigo-500/50 hover:bg-slate-800/30' 
                    : 'opacity-50 cursor-not-allowed grayscale-[0.5]'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center transition-colors relative ${isEnabled ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-700'}`}>
                       <span className="text-sm font-black">{idx + 1}</span>
                       <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                    </div>
                    <div className="min-w-0">
                      <h5 className={`font-black text-sm uppercase tracking-tight truncate ${isEnabled ? 'text-slate-50' : 'text-slate-500'}`}>{room.name}</h5>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{room.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <ParticipantCount roomId={room.id} enabled={isEnabled} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50 p-10 text-center">
               <i className="fa-solid fa-satellite-dish text-4xl mb-4"></i>
               <p className="text-xs font-black uppercase tracking-widest">Awaiting server deployment from Command Center.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default ServerSelectionModal;
