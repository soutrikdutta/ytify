import React from 'react';
import { Home, Compass, Library, Search, Settings } from 'lucide-react';
import { YtifyBrand } from './Brand';

interface TopBarProps {
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  user: any;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenProfile,
  onOpenAuth,
  user,
  currentTab = 'home',
  onTabChange
}) => {
  const isGuest = user?.isGuest || user?.name === 'Guest Listener' || !user;
  const userName = user?.name ? user.name.split(' ')[0] : 'Guest';
  const initial = isGuest ? 'G' : userName.charAt(0).toUpperCase();
  const userPhoto = user?.photoURL;

  const navTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="sticky top-2 md:top-3 z-40 w-full px-3 md:px-8 select-none pointer-events-none flex justify-center">
      {/* Capsule Header: Compact on Mobile, Expansive & Full-Featured on Desktop */}
      <header className="pointer-events-auto w-full max-w-md md:max-w-7xl flex items-center justify-between py-2.5 px-4 md:px-6 rounded-full md:rounded-2xl liquid-glass-dock border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300">
        {/* Left: Ytify Brand Logo */}
        <YtifyBrand size="md" />

        {/* Center: Desktop Navigation Tabs (Hidden on Mobile, Visible on Desktop) */}
        {onTabChange && (
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/10 shadow-inner">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_2px_12px_rgba(16,185,129,0.35)]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: User Profile Capsule */}
        <div
          onClick={user ? onOpenProfile : (onOpenProfile || onOpenAuth)}
          className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full liquid-glass-pill hover:border-emerald-500/40 cursor-pointer active:scale-95 transition-all shadow-sm border border-white/15 bg-white/[0.04]"
          title={user ? `Signed in as ${user.name}` : 'View Profile'}
        >
          <span className="text-[11px] font-bold text-emerald-400 tracking-wide select-none">
            {userName}
          </span>
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-emerald-500/50 shadow-inner flex-shrink-0 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-400">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={userName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <span className="text-[11px] font-black text-white leading-none">
                {initial}
              </span>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};
