
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set, push, onValue } from 'firebase/database';
import { auth, db } from '../firebase';
import { SupportTicket } from '../types';
import { ToastType } from '../components/Toast';

const FAQS = [
  { q: "How do I save a game to my favorites?", a: "Simply tap the heart icon on any game's info page to save it to your personal library." },
  { q: "The game isn't loading, what should I do?", a: "Check your internet connection and ensure your browser is updated. You can also try refreshing the page." },
  { q: "Can I play these games on mobile?", a: "Yes! OG HUB is fully optimized for mobile devices and supports touch controls for most games." },
  { q: "How do I change my profile picture?", a: "Go to your Profile tab and tap the current profile image or camera icon to upload a new one." },
  { q: "Is registration required to play?", a: "You can browse many games, but creating an account is required to save progress, track play time, and manage favorites." },
  { q: "Are these games free to play?", a: "Every mission in the OG HUB universe is currently free for our verified members." },
  { q: "How do I update my username?", a: "On your Dashboard, tap the pencil icon next to your name to enter a new identity." },
  { q: "What should I do if I forgot my password?", a: "Go to the Login screen and tap 'Forgot Password' to receive a recovery link via email." },
  { q: "How is my play time calculated?", a: "We track the time from when you initialize a game session until you exit or close the player." },
  { q: "Can I submit my own game?", a: "We are always looking for new missions! Contact our developer support team via the ticketing system for asset review." }
];

const PROBLEM_TYPES = [
  "Technical Issue",
  "Account Access",
  "Payment/Billing",
  "Feature Request",
  "Bug Report",
  "Other"
];

// Added missing SupportScreenProps interface
interface SupportScreenProps {
  onNotify: (msg: string, type: ToastType) => void;
}

const SupportScreen: React.FC<SupportScreenProps> = ({ onNotify }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<{ username: string; email: string; profilePic?: string } | null>(null);
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);

  const [formData, setFormData] = useState({
    problemType: "Technical Issue",
    description: ""
  });

  const ticketNumber = React.useMemo(() => `OG-${Math.floor(1000 + Math.random() * 9000)}`, [showModal]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = ref(db, `users/${auth.currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProfileData({
          username: data.username,
          email: data.email,
          profilePic: data.profilePicture
        });
      }
    });

    // Fetch user's own tickets
    const ticketsRef = ref(db, 'tickets');
    const unsubscribeTickets = onValue(ticketsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ticketList = Object.keys(data)
          .map(key => ({ ...data[key], firebaseId: key } as SupportTicket & { firebaseId: string }))
          .filter(t => t.uid === auth.currentUser?.uid);
        ticketList.sort((a, b) => b.timestamp - a.timestamp);
        setMyTickets(ticketList);
      } else {
        setMyTickets([]);
      }
    });

    return () => unsubscribeTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profileData) return;
    if (formData.description.length < 10) {
      onNotify("Please describe your problem in more detail.", "info");
      return;
    }

    setLoading(true);
    try {
      const ticketsRef = ref(db, 'tickets');
      const newTicketRef = push(ticketsRef);
      await set(newTicketRef, {
        id: ticketNumber,
        uid: auth.currentUser.uid,
        username: profileData.username,
        email: profileData.email,
        profilePicture: profileData.profilePic || null,
        problemType: formData.problemType,
        description: formData.description,
        status: 'open',
        timestamp: Date.now()
      });

      onNotify(`Ticket ${ticketNumber} submitted successfully!`, 'success');
      setShowModal(false);
      setFormData({ problemType: "Technical Issue", description: "" });
    } catch (err: any) {
      onNotify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn pb-24">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-theme-400 transition-all active:scale-90"
          aria-label="Back to Dashboard"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <h2 className="text-3xl font-black text-contrast tracking-tighter">Support Center</h2>
          <p className="text-theme-400 font-bold text-[10px] uppercase tracking-widest">Knowledge Base & Assistance</p>
        </div>
      </div>

      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl mb-8 overflow-hidden relative">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Frequently Asked Questions</h3>
          <div className="w-10 h-10 bg-theme-500/10 rounded-xl flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-book-open"></i>
          </div>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className={`border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${openFaq === idx ? 'bg-slate-950/50' : 'bg-transparent hover:bg-slate-950/20'}`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 flex items-center justify-between"
              >
                <span className={`text-xs font-bold transition-colors ${openFaq === idx ? 'text-theme-400' : 'text-slate-400'}`}>{faq.q}</span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-slate-700 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-theme-500' : ''}`}></i>
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 animate-fadeIn">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="bg-gradient-to-br from-theme-600 to-theme-800 p-8 rounded-[2.5rem] shadow-2xl shadow-theme-600/20 flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white text-3xl mb-4 backdrop-blur-md border border-white/10">
          <i className="fa-solid fa-life-ring animate-pulse"></i>
        </div>
        <h3 className="text-white font-black text-xl mb-2">Still need assistance?</h3>
        <p className="text-theme-100 text-xs mb-6 max-w-xs opacity-80 font-medium">Our tactical support team is ready to help you with any issue in the hub.</p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-white text-theme-600 font-black text-[10px] uppercase tracking-[0.2em] px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
        >
          Open Support Ticket
        </button>
      </div>

      {/* TICKET HISTORY SECTION */}
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">My Support History</h3>
          <div className="w-10 h-10 bg-theme-500/10 rounded-xl flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
        </div>

        {myTickets.length > 0 ? (
          <div className="space-y-4">
            {myTickets.map((ticket) => (
              <div key={ticket.id} className="bg-slate-950/50 border border-slate-800 rounded-3xl p-5 relative overflow-hidden group">
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-theme-500">{ticket.id}</span>
                    <h4 className="text-contrast text-xs font-black uppercase tracking-tight">{ticket.problemType}</h4>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${ticket.status === 'resolved'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                    {ticket.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 italic mb-3">"{ticket.description}"</p>
                <div className="flex items-center justify-between text-[8px] font-bold text-slate-600 uppercase tracking-widest border-t border-slate-800/50 pt-3">
                  <span>Reported on {new Date(ticket.timestamp).toLocaleDateString()}</span>
                  <i className="fa-solid fa-circle-info opacity-0 group-hover:opacity-100 transition-opacity text-slate-700"></i>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No previous reports found</p>
          </div>
        )}
      </section>

      {/* TICKETING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !loading && setShowModal(false)}></div>
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative animate-page-transition">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black text-contrast tracking-tighter">Tactical Support</h4>
                <p className="text-[10px] font-black uppercase text-theme-400">Incident Report: {ticketNumber}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Username</label>
                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-[11px] text-slate-400 font-bold opacity-60">
                    {profileData?.username}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Ticket ID</label>
                  <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-[11px] text-theme-500 font-black opacity-60">
                    {ticketNumber}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Problem Category</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-contrast outline-none focus:ring-1 focus:ring-theme-500"
                  value={formData.problemType}
                  onChange={(e) => setFormData({ ...formData, problemType: e.target.value })}
                >
                  {PROBLEM_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Description of issue</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us exactly what happened..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-xs text-contrast outline-none focus:ring-1 focus:ring-theme-500 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-theme-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-theme-600/20 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : "Submit Incident Report"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportScreen;
