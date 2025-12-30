
import React from 'react';
import { APP_NAME } from '../constants';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative animate-page-transition">
        <div className="p-8 pb-4 flex items-center justify-between">
          <h4 className="text-2xl font-black text-contrast tracking-tighter">Mission Control</h4>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="px-8 pb-10 space-y-8 overflow-y-auto max-h-[80vh] scrollbar-hide">
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              {APP_NAME} is a premiere gaming universe designed for high-octane performance and seamless web-based play. Our mission is to bridge the gap between players and creators through a curated, high-fidelity hub.
            </p>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-slate-950/50 rounded-[2rem] border border-slate-800/50 space-y-4 text-center group hover:border-theme-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-500">Corporate Visionary</p>
              <img
                src="https://i.postimg.cc/4msS2Fdw/Polish-20251023-163825471.png"
                alt="Saban Productions"
                className="h-16 mx-auto object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform"
              />
              <h5 className="font-black text-contrast text-sm uppercase tracking-widest">Saban Productions</h5>
            </div>

            <div className="p-6 bg-slate-950/50 rounded-[2rem] border border-slate-800/50 space-y-4 text-center group hover:border-theme-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-widest text-theme-500">Development Authority</p>
              <img
                src="https://i.postimg.cc/bSXKvyqY/saban-games.png"
                alt="Saban Games"
                className="h-16 mx-auto object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform"
              />
              <h5 className="font-black text-contrast text-sm uppercase tracking-widest">Saban Games</h5>
            </div>
          </div>

          <div className="pt-4 text-center border-t border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Powered by Saban Apps Ecosystem</p>
            <p className="text-[8px] font-bold text-slate-700 mt-2">© 2024 Saban Productions. All Rights Reserved.</p>
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AboutModal;
