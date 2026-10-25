import React from 'react';
import { 
  X, 
  LogOut, 
  Sparkles, 
  Sliders, 
  Heart, 
  Clock, 
  ListMusic, 
  ShieldCheck, 
  User as UserIcon,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTaste?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenAuth?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenTaste,
  onNavigateTab,
  onOpenAuth
}) => {
  const { user, userData, signOut } = useAuth();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    localStorage.removeItem('ytify_is_guest');
    await signOut();
    onClose();
  };

  const handleGoToTaste = () => {
    onClose();
    if (onOpenTaste) onOpenTaste();
  };

  const handleGoToSettings = () => {
    onClose();
    if (onNavigateTab) onNavigateTab('settings');
  };

  const handleGoToAuth = () => {
    onClose();
    if (onOpenAuth) onOpenAuth();
  };

  const playlistsCount = (userData.playlists || []).length;
  const likedCount = (userData.likedSongs || []).length;
  const historyCount = (userData.history || []).length;
  const artistsCount = (userData.preferences?.artists || []).length;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm liquid-glass-dock rounded-3xl p-6 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden cursor-default"
      >
        {/* Subtle Ambient Refraction Behind Avatar */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#15803d]/20 via-transparent to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full liquid-glass-pill flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer z-30"
          title="Close profile"
        >
          <X size={18} />
        </button>

        {/* Profile Card Header */}
        <div className="relative z-10 flex flex-col items-center text-center pt-2 mb-5">
          {user && user.photoURL ? (
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_25px_rgba(34,197,94,0.4)]">
                <img 
                  src={user.photoURL} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center border-2 border-[#0a0a14] shadow" title="Google Verified">
                <ShieldCheck size={13} strokeWidth={3} />
              </div>
            </div>
          ) : (
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-[0_0_25px_rgba(34,197,94,0.4)] flex items-center justify-center bg-gradient-to-tr from-emerald-600 via-teal-500 to-green-500">
                <span className="text-3xl font-black text-white tracking-tight">G</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center border-2 border-[#0a0a14] shadow" title="Guest Session">
                <Sparkles size={13} strokeWidth={2.5} />
              </div>
            </div>
          )}

          <h2 className="text-xl font-black text-white tracking-tight">
            {user ? user.name : 'Guest Listener'}
          </h2>
          <p className="text-xs text-white/50 mt-0.5 truncate max-w-[240px]">
            {user?.email ? user.email : 'High-Fidelity Audio Streamer • Ytify'}
          </p>

          <div className="mt-2.5">
            {user && user.photoURL ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Google Account Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Guest Session</span>
              </span>
            )}
          </div>
        </div>

        {/* Listening Activity Stats Reel */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl liquid-glass-card border border-white/10 mb-5 text-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1 mb-0.5">
              <Heart size={12} fill="currentColor" />
              <span>{likedCount}</span>
            </span>
            <span className="text-[10px] text-white/40 uppercase font-semibold">Liked</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-0.5">
              <Clock size={12} />
              <span>{historyCount}</span>
            </span>
            <span className="text-[10px] text-white/40 uppercase font-semibold">Played</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1 mb-0.5">
              <ListMusic size={12} />
              <span>{playlistsCount}</span>
            </span>
            <span className="text-[10px] text-white/40 uppercase font-semibold">Playlists</span>
          </div>
        </div>

        {/* Navigation & Action Options */}
        <div className="space-y-2 mb-4">
          <div
            onClick={handleGoToTaste}
            className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card hover:bg-white/10 cursor-pointer transition-all active:scale-98 group border border-white/10"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991b1b] to-[#15803d] flex items-center justify-center text-white flex-shrink-0 shadow">
                <Sparkles size={16} />
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Music Recommendations
                </p>
                <p className="text-[10px] text-white/50 truncate">
                  {artistsCount > 0 ? `${artistsCount} favorite artists tuned` : 'Pick favorite artists to tune feed'}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/30 group-hover:text-white transition-colors" />
          </div>

          <div
            onClick={handleGoToSettings}
            className="flex items-center justify-between p-3 rounded-2xl liquid-glass-card hover:bg-white/10 cursor-pointer transition-all active:scale-98 group border border-white/10"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                <Sliders size={16} />
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Dolby Atmos & Audio
                </p>
                <p className="text-[10px] text-white/50 truncate">
                  Spatial audio tuning & EQ options
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-white/30 group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Bottom Primary Action (Sign In if guest, Sign Out if signed in) */}
        <div>
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-2xl bg-red-950/40 hover:bg-red-900/50 text-rose-300 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow"
            >
              <LogOut size={15} />
              <span>Sign Out of Account</span>
            </button>
          ) : (
            <button
              onClick={handleGoToAuth}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#991b1b] to-[#15803d] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <UserIcon size={15} />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
