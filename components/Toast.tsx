import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 4000, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - (100 / (duration / 10))));
    }, 10);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [duration, onClose]);

  const icons = {
    success: 'fa-circle-check text-emerald-400',
    error: 'fa-circle-exclamation text-rose-400',
    info: 'fa-circle-info text-indigo-400'
  };

  const borders = {
    success: 'border-emerald-500/20 shadow-emerald-500/10',
    error: 'border-rose-500/20 shadow-rose-500/10',
    info: 'border-indigo-500/20 shadow-indigo-500/10'
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-indigo-500'
  };

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm animate-toast-in`}>
      <div className={`relative overflow-hidden bg-slate-900/90 backdrop-blur-xl border ${borders[type]} p-4 rounded-2xl shadow-2xl flex items-center space-x-3`}>
        <div className="shrink-0 text-xl">
          <i className={`fa-solid ${icons[type]}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-50 tracking-tight leading-tight">{message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-white transition-colors p-1">
          <i className="fa-solid fa-xmark text-xs"></i>
        </button>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-slate-800">
          <div className={`h-full ${progressColors[type]} transition-all linear`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <style>{`
        @keyframes toast-in {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-toast-in {
          animation: toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;