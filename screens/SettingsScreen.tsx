
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastType } from '../components/Toast';

interface ThemeColor {
  id: string;
  name: string;
  colors: {
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
  };
}

const THEMES: ThemeColor[] = [
  { id: 'indigo', name: 'Original', colors: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3' } },
  { id: 'rose', name: 'Crimson', colors: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239' } },
  { id: 'emerald', name: 'Forest', colors: { 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46' } },
  { id: 'amber', name: 'Gold', colors: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e' } },
  { id: 'sky', name: 'Azure', colors: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985' } },
  { id: 'violet', name: 'Mystic', colors: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6' } },
  { id: 'fuchsia', name: 'Neon', colors: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f' } },
  { id: 'orange', name: 'Flame', colors: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412' } },
  { id: 'cyan', name: 'Cyber', colors: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75' } },
  { id: 'lime', name: 'Toxic', colors: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212' } },
  { id: 'red', name: 'Rage', colors: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b' } },
  { id: 'pink', name: 'Candy', colors: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d' } },
  { id: 'teal', name: 'Ocean', colors: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59' } },
  { id: 'blue', name: 'Cobalt', colors: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' } },
  { id: 'yellow', name: 'Sun', colors: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e' } },
  { id: 'slate', name: 'Stealth', colors: { 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b' } },
];

type AppearanceMode = 'light' | 'dark' | 'system';

interface SettingsScreenProps {
  onNotify: (msg: string, type: ToastType) => void;
  onShowAbout: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onNotify, onShowAbout }) => {
  const navigate = useNavigate();
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    const saved = localStorage.getItem('oghub_theme_id');
    return saved || 'indigo';
  });

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
    return (localStorage.getItem('oghub_appearance_mode') as AppearanceMode) || 'system';
  });

  const applyTheme = (theme: ThemeColor) => {
    setCurrentThemeId(theme.id);
    localStorage.setItem('oghub_theme_id', theme.id);
    localStorage.setItem('oghub_theme_colors', JSON.stringify(theme.colors));

    Object.keys(theme.colors).forEach((key) => {
      document.documentElement.style.setProperty(`--theme-${key}`, (theme.colors as any)[key]);
    });

    onNotify(`Theme changed to ${theme.name}!`, 'success');
  };

  const handleAppearanceChange = (mode: AppearanceMode) => {
    setAppearanceMode(mode);
    localStorage.setItem('oghub_appearance_mode', mode);

    const isDarkSystem = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = mode === 'dark' || (mode === 'system' && isDarkSystem);

    if (shouldBeDark) {
      document.documentElement.classList.remove('light-mode');
    } else {
      document.documentElement.classList.add('light-mode');
    }

    onNotify(`Appearance set to ${mode}`, 'info');
  };

  return (
    <div className="max-w-xl mx-auto animate-fadeIn pb-24">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-theme-400 transition-all active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div>
          <h2 className="text-3xl font-black text-contrast tracking-tighter">Hub Settings</h2>
          <p className="text-theme-400 font-bold text-[10px] uppercase tracking-widest">Personalize your mission control</p>
        </div>
      </div>

      {/* APPEARANCE SECTION */}
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-moon text-sm"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Appearance</h3>
        </div>

        <div className="bg-slate-950/50 p-1.5 rounded-[1.8rem] border border-slate-800 flex items-center justify-between">
          <button
            onClick={() => handleAppearanceChange('light')}
            className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appearanceMode === 'light' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-sun mr-2"></i> Light
          </button>
          <button
            onClick={() => handleAppearanceChange('system')}
            className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appearanceMode === 'system' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-desktop mr-2"></i> System
          </button>
          <button
            onClick={() => handleAppearanceChange('dark')}
            className={`flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${appearanceMode === 'dark' ? 'bg-theme-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <i className="fa-solid fa-moon mr-2"></i> Dark
          </button>
        </div>
      </section>

      {/* THEME COLOR SECTION */}
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-palette text-sm"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Accent Theme</h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme)}
              className={`
                group relative flex flex-col items-center p-3 rounded-2xl border transition-all active:scale-95
                ${currentThemeId === theme.id
                  ? 'bg-slate-800 border-theme-500 shadow-lg'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                }
              `}
            >
              <div
                className="w-8 h-8 rounded-full mb-2 shadow-lg group-hover:scale-110 transition-transform"
                style={{ backgroundColor: theme.colors[500] }}
              >
                {currentThemeId === theme.id && (
                  <div className="w-full h-full flex items-center justify-center text-white text-[10px]">
                    <i className="fa-solid fa-check"></i>
                  </div>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center ${currentThemeId === theme.id ? 'text-theme-400' : 'text-slate-500'}`}>
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* PREFERENCES SECTION */}
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-sliders text-sm"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-contrast">Preferences</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-black text-contrast uppercase tracking-widest">Haptic Feedback</p>
              <p className="text-[10px] text-slate-500 font-bold">Vibrate on interactions</p>
            </div>
            <div className="w-10 h-5 bg-theme-600 rounded-full relative">
              <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-black text-contrast uppercase tracking-widest">Animations</p>
              <p className="text-[10px] text-slate-500 font-bold">Show hub transitions</p>
            </div>
            <div className="w-10 h-5 bg-theme-600 rounded-full relative">
              <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US SECTION */}
      <section className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-theme-500/10 flex items-center justify-center text-theme-400">
            <i className="fa-solid fa-info-circle text-sm"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-contrast">About Us</h3>
        </div>

        <button
          onClick={onShowAbout}
          className="w-full bg-slate-950/50 hover:bg-slate-800/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-theme-500/10 text-theme-500 rounded-xl flex items-center justify-center group-hover:bg-theme-500 group-hover:text-white transition-all">
              <i className="fa-solid fa-rocket"></i>
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-contrast uppercase tracking-widest">About OG HUB</p>
              <p className="text-[10px] text-slate-500 font-bold">Creators & Platform Vision</p>
            </div>
          </div>
          <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-theme-400 group-hover:translate-x-1 transition-all"></i>
        </button>
      </section>

      <div className="mt-8 text-center">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">OG HUB OS v2.4.0</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
