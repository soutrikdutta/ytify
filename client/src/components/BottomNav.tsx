import React from 'react';
import { Home, Compass, Library, Search, Settings } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const activeIdx = Math.max(0, tabs.findIndex(t => t.id === currentTab));
  const pillWidthPercent = 100 / tabs.length;

  return (
    <nav className="relative w-full h-[58px] liquid-glass-dock rounded-full p-1.5 flex items-center justify-between select-none shadow-[0_16px_40px_rgba(0,0,0,0.9)] border border-white/15 overflow-hidden">
      {/* 120FPS GPU-Accelerated Fluid Sliding Active Capsule */}
      <div 
        className="absolute top-1.5 bottom-1.5 rounded-full liquid-segment-active border border-emerald-500/35 shadow-[0_2px_14px_rgba(21,128,61,0.35)] pointer-events-none will-change-transform"
        style={{
          width: `calc(${pillWidthPercent}% - 3px)`,
          transform: `translate3d(${activeIdx * 100}%, 0, 0)`,
          transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative z-10 flex flex-col items-center justify-center flex-1 h-full rounded-full cursor-pointer active:scale-95 transition-transform duration-200"
          >
            <Icon 
              size={18} 
              strokeWidth={isActive ? 2.5 : 2} 
              className={`transition-all duration-300 ${
                isActive 
                  ? 'scale-110 text-white filter drop-shadow-[0_2px_6px_rgba(34,197,94,0.5)]' 
                  : 'text-white/45 hover:text-white/80'
              }`}
            />
            <span className={`text-[9px] tracking-tight transition-all duration-300 mt-0.5 ${
              isActive 
                ? 'font-bold text-white' 
                : 'font-medium text-white/45'
            }`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
