import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle } = useAuth();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsAuthorizing(true);
    try {
      await signInWithGoogle();
      setIsAuthorizing(false);
      onClose();
    } catch (err: any) {
      setIsAuthorizing(false);
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'Please add "soutrik-ytify.vercel.app" to Authorized Domains in Firebase Console -> Authentication -> Settings.'
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm liquid-glass-dock rounded-3xl p-7 text-center border border-white/15 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Brand Icon */}
        <div className="relative w-18 h-18 mx-auto mb-4 rounded-full overflow-hidden shadow-[0_0_25px_rgba(21,128,61,0.3)]">
          <img src="/ytify-icon.png" alt="ytify" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-1.5">
          Welcome to <span className="text-[#991b1b]">yt</span><span className="text-[#15803d]">ify</span>
        </h2>
        <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-[260px] mx-auto">
          Sign in with your Google account to sync your playlists, liked music, and playback history.
        </p>

        {/* Error notice if domain authorization is needed */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* ONLY Clean, Authentic Sign in with Google Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isAuthorizing}
          className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-60 mb-4"
        >
          {/* Authentic Google Multi-Color G Logo */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isAuthorizing ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <button
          onClick={onClose}
          className="text-xs text-white/40 hover:text-white transition-colors font-medium py-1"
        >
          Explore as Guest
        </button>
      </div>
    </div>
  );
};
