import React from 'react';
import { Music2, LayoutDashboard, LogOut, Radio, Zap, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const NAV_TABS = [
  {
    id: 'student', label: 'ขอเพลง', Icon: Radio,
    activeStyle: { background: 'rgba(59,130,246,0.50)', border: '1px solid rgba(59,130,246,0.35)', boxShadow: '0 2px 20px rgba(59,130,246,0.30)', color: '#fff' },
  },
  {
    id: 'manager', label: 'จัดการ', Icon: LayoutDashboard,
    activeStyle: { background: 'rgba(139,92,246,0.46)', border: '1px solid rgba(139,92,246,0.35)', boxShadow: '0 2px 20px rgba(139,92,246,0.28)', color: '#fff' },
  },
];

const Navbar = ({ viewMode, setViewMode, isAuthenticated, onLogout }) => {
  const { toggleTheme, isLight } = useTheme();
  return (

  <nav className="fixed top-0 left-0 right-0 z-50 w-full animate-fade-in-down" role="navigation" aria-label="Main Navigation">
    <div style={{
      background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(10,10,10,0.80)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      borderBottom: isLight ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.08)',
      boxShadow: isLight
        ? '0 12px 32px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
        : '0 16px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div className="flex items-center justify-between px-4 sm:px-8 mx-auto w-full max-w-[1600px] h-[72px]">

        {/* ── Logo ── */}
        <div className="flex items-center justify-start gap-3 flex-1 min-w-0 pr-2">
          <div
            className="relative flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-[13px] flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #3b82f6 0%, #8b5cf6 50%, #f43f5e 100%)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.65), 0 1px 3px rgba(0,0,0,0.5)',
            }}
            aria-hidden
          >
            <Music2 size={18} className="text-white relative z-10" strokeWidth={2.5} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg,rgba(255,255,255,0.24) 0%,transparent 55%)' }} />
          </div>

          <div className="leading-tight hidden md:block truncate">
            <div className="flex items-center gap-1.5">
              <span className={`text-[15px] font-black tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>PhayuWittaya</span>
              <span className="text-[15px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">DJ</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Zap size={10} className="text-amber-500" aria-hidden />
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.4)' }}>
                Official System
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-heartbeat"
                title="System Online"
                aria-label="System Online"
              />
            </div>
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div
          className="flex items-center justify-center gap-1 p-1 rounded-[16px] flex-none"
          style={{
            background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
            border: isLight ? '1px solid rgba(0,0,0,0.03)' : '1px solid rgba(255,255,255,0.04)'
          }}
          role="tablist"
          aria-label="View switcher"
        >
          {NAV_TABS.map((tab) => {
            const { id, label, Icon, activeStyle } = tab;
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-label={label}
                onClick={() => setViewMode(id)}
                className={`nav-tab focus-visible:ring-2 focus-visible:ring-violet-500/80 focus-visible:outline-none transition-all duration-300 px-4 py-2 rounded-[12px] flex items-center justify-center ${isActive ? 'scale-105 shadow-lg' : 'hover:scale-102 opacity-70 hover:opacity-100'}`}
                style={isActive ? {
                  ...activeStyle,
                  background: id === 'student' 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #f43f5e 100%)',
                  boxShadow: id === 'student'
                    ? '0 0 25px rgba(59,130,246,0.45), 0 0 10px rgba(45,212,191,0.25)'
                    : '0 0 25px rgba(139,92,246,0.45), 0 0 10px rgba(244,63,94,0.25)',
                } : {}}
              >
                <Icon size={16} strokeWidth={2.5} aria-hidden />
                <span className="hidden sm:inline-block font-black tracking-wide ml-2">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Theme & Logout ── */}
        <div className="flex items-center justify-end gap-3 flex-1 min-w-0 pl-2">
          
          <button
            onClick={toggleTheme}
            aria-label="สลับธีม (เปลี่ยนโหมดสว่าง/มืด)"
            title="สลับธีม (เปลี่ยนโหมดสว่าง/มืด)"
            className={`flex items-center justify-center flex-shrink-0 w-[38px] h-[38px] rounded-[12px] transition-all border hover:scale-105 active:scale-95 ${
              isLight 
                ? 'bg-white shadow-sm border-gray-200 text-gray-600 hover:bg-gray-50' 
                : 'bg-white/10 border-white/20 text-white shadow-lg hover:bg-white/20'
            }`}
          >
            {isLight ? (
               <Moon size={18} className="text-blue-600 drop-shadow-sm" />
            ) : (
               <Sun size={19} className="text-amber-400 drop-shadow-md" />
            )}
          </button>

          {isAuthenticated && viewMode === 'manager' && (
            <button
              onClick={onLogout}
              aria-label="ออกจากระบบ"
              className="flex items-center justify-center flex-shrink-0 gap-2 px-3 py-2 rounded-[10px] text-[12px] font-semibold min-h-[38px] touch-target bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
            >
              <LogOut size={16} aria-hidden />
              <span className="hidden lg:inline">ออกจากระบบ</span>
            </button>
          )}
        </div>

      </div>
    </div>
  </nav>
  );
};

export default Navbar;
