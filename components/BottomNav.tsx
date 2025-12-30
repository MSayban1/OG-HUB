
import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navItems = [
    { icon: 'fa-home', label: 'Home', path: '/', exact: true },
    { icon: 'fa-gamepad', label: 'Games', path: '/explore', exact: false },
    { icon: 'fa-heart', label: 'Liked', path: '/favorites', exact: false },
    { icon: 'fa-user', label: 'Profile', path: '/dashboard', exact: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/50 flex justify-around items-center h-16 px-2 z-40 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.path}
          end={item.exact}
          className={({ isActive }) => `
            flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 relative
            ${isActive ? 'text-theme-400 scale-110' : 'text-slate-500 hover:text-slate-300'}
          `}
        >
          {({ isActive }) => (
            <>
              <div className={`
                flex items-center justify-center w-10 h-6 rounded-full transition-all duration-300 mb-1
                ${isActive ? 'bg-theme-500/10' : 'bg-transparent'}
              `}>
                <i className={`fa-solid ${item.icon} ${isActive ? 'text-lg' : 'text-base'} transition-all`}></i>
              </div>
              <span className={`
                text-[9px] font-black uppercase tracking-[0.1em] transition-all
                ${isActive ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-0.5'}
              `}>
                {item.label}
              </span>

              {/* Material-style Indicator Bar */}
              {isActive && (
                <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-10 h-[2px] bg-theme-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
