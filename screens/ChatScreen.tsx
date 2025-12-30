
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { ref, onValue, set, get } from 'firebase/database';
import { db_fs, auth, db } from '../firebase';
import { ChatMessage, ChatRoom, BlockedUser } from '../types';
import { ToastType } from '../components/Toast';

interface ChatScreenProps {
  onNotify: (msg: string, type: ToastType) => void;
}

// Basic list of prohibited patterns for the Guardian Bot
const PROHIBITED_PATTERNS = [
  /\bfuck\b/i,
  /\bbitch\b/i,
  /\basshole\b/i,
  /\bdick\b/i,
  /\bnigger\b/i,
  /\bretard\b/i,
  /\bstupid\b/i,
  /\bidiot\b/i,
  /\bgay\b/i,
  /kill your self/i,
  /kys/i
];

const ChatScreen: React.FC<ChatScreenProps> = ({ onNotify }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [roomInfo, setRoomInfo] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = ref(db, `chatRooms/${roomId}`);
    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.enabled) {
        setRoomInfo({ ...data, id: roomId });
      } else {
        setRoomInfo(null);
      }
      setLoadingRoom(false);
    });

    return () => unsubscribeRoom();
  }, [roomId]);

  useEffect(() => {
    if (!auth.currentUser || !roomId) return;

    // Check verification
    const checkVerification = async () => {
      await auth.currentUser?.reload();
      setIsVerified(auth.currentUser?.emailVerified || false);
    };
    checkVerification();

    // Presence Tracking
    const presenceRef = doc(db_fs, 'chats', roomId, 'participants', auth.currentUser.uid);
    setDoc(presenceRef, {
      username: auth.currentUser.displayName || 'Gamer',
      lastActive: serverTimestamp()
    });

    return () => {
      deleteDoc(presenceRef).catch(() => { });
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    // Listen to messages
    const q = query(
      collection(db_fs, 'chats', roomId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    // Listen to active users
    const participantsRef = collection(db_fs, 'chats', roomId, 'participants');
    const unsubscribeUsers = onSnapshot(participantsRef, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data().username);
      setActiveUsers([...new Set(users)]);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeUsers();
    };
  }, [roomId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || !auth.currentUser || sending) return;

    if (!auth.currentUser.emailVerified) {
      onNotify("Verification Required: You must verify your email to participate in the chat.", "error");
      return;
    }

    // --- OG GUARDIAN BOT LOGIC ---
    const text = newMessage.trim();
    const isOffensive = PROHIBITED_PATTERNS.some(pattern => pattern.test(text));

    if (isOffensive) {
      const blockUntil = Date.now() + 600000; // 10 Minutes
      const reason = "Violating harassment and bullying policies.";

      try {
        // Global suspension path - App.tsx handles the UI blockade
        await set(ref(db, `userBlocks/${auth.currentUser.uid}`), {
          blockedUntil: blockUntil,
          reason: reason
        });

        onNotify("Guardian Protocol: Offensive content detected. Account suspended for 10 minutes.", "error");
        setNewMessage('');
      } catch (err) {
        console.error("Guardian error:", err);
      }
      return;
    }
    // --- END BOT LOGIC ---

    setSending(true);
    try {
      await addDoc(collection(db_fs, 'chats', roomId, 'messages'), {
        uid: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'Gamer',
        text: text,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error("Chat error:", err);
      onNotify("Transmission failed.", "error");
    } finally {
      setSending(false);
    }
  };

  if (loadingRoom) return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
      <i className="fa-solid fa-circle-notch animate-spin text-3xl"></i>
    </div>
  );

  if (!roomInfo) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
      <i className="fa-solid fa-triangle-exclamation text-4xl mb-4"></i>
      <p className="font-black uppercase tracking-widest text-slate-50">Server Offline or Invalid</p>
      <button onClick={() => navigate('/')} className="mt-4 text-theme-600 font-bold uppercase text-xs">Return Home</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 flex flex-col h-screen w-screen animate-fadeIn overflow-hidden">
      {/* Theme-Aware Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-contrast hover:text-theme-400 transition-all active:scale-90"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="min-w-0">
            <h4 className="text-lg font-black text-contrast tracking-tighter truncate">{roomInfo.name}</h4>
            <div className="flex items-center space-x-2">
              <span className="flex items-center text-[10px] font-black uppercase text-theme-600 tracking-widest">
                <i className="fa-solid fa-circle text-[6px] mr-1.5 animate-pulse"></i>
                Station Active
              </span>
              <span className="text-slate-700 text-[10px]">•</span>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{activeUsers.length} Online</span>
            </div>
          </div>
        </div>

        <div className="flex -space-x-2">
          {activeUsers.slice(0, 3).map((u, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-theme-600 shadow-sm" title={u}>
              {u.charAt(0).toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-slate-500">
              +{activeUsers.length - 3}
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-slate-950"
      >
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-center mb-6">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
            <i className="fa-solid fa-shield-halved mr-2 text-theme-400"></i>
            OG Guardian Bot is active. Bullying or harassment results in automatic account suspension.
          </p>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.uid === auth.currentUser?.uid;
          // Show username if it's the start of the chat OR the previous message was from a different user
          const showUsername = idx === 0 || messages[idx - 1].uid !== msg.uid;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full animate-page-transition`}>
              {showUsername && (
                <span className={`text-[10px] font-black uppercase mb-1.5 tracking-widest flex items-center ${isMe ? 'mr-3 text-slate-600' : 'ml-3 text-theme-400'}`}>
                  {isMe ? 'You' : msg.username}
                </span>
              )}
              <div className={`max-w-[85%] px-5 py-3 rounded-[1.5rem] relative ${isMe
                  ? 'bg-theme-600 text-white rounded-tr-none shadow-md shadow-theme-500/10'
                  : 'bg-slate-900 text-contrast rounded-tl-none border border-slate-800'
                }`}>
                <p className="text-[14px] font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                <span className={`text-[8px] font-bold mt-1.5 block opacity-50 ${isMe ? 'text-right text-theme-100' : 'text-left text-slate-500'}`}>
                  {msg.timestamp instanceof Timestamp ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 pb-safe">
        {!isVerified && (
          <div className="mb-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center space-x-3">
            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Email Verification Required to Chat.</p>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            disabled={!isVerified || sending}
            placeholder={isVerified ? "Write your message..." : "Verified users only"}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-contrast outline-none focus:ring-2 focus:ring-theme-500/20 transition-all placeholder:text-slate-600 disabled:opacity-50"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !isVerified}
            className="w-14 h-14 rounded-2xl bg-theme-600 text-white flex items-center justify-center shadow-lg shadow-theme-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
          >
            <i className={`fa-solid ${sending ? 'fa-circle-notch animate-spin' : 'fa-paper-plane'} text-lg`}></i>
          </button>
        </form>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
      `}</style>
    </div>
  );
};

export default ChatScreen;
