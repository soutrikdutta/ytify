import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Headphones, ShieldCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsAuthorizing(true);
    try {
      await signInWithGoogle();
      setIsAuthorizing(false);
    } catch (err: any) {
      setIsAuthorizing(false);
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          'Please ensure soutrik-ytify.vercel.app is authorized in Firebase Console -> Authentication -> Settings.'
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Failed to sign in with Google. Please try again.');
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030307] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 120FPS GPU Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep Ruby Glow */}
        <div 
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-35 filter blur-[120px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #b91c1c 0%, rgba(185, 28, 28, 0.1) 70%, transparent 100%)', animationDuration: '7s' }}
        />
        {/* Emerald Glow */}
        <div 
          className="absolute top-1/3 -right-32 w-[540px] h-[540px] rounded-full opacity-30 filter blur-[130px] animate-pulse"
          style={{ background: 'radial-gradient(circle, #15803d 0%, rgba(21, 128, 61, 0.1) 70%, transparent 100%)', animationDuration: '9s' }}
        />
        {/* Subtle Violet Center Aura */}
        <div 
          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full opacity-25 filter blur-[140px]"
          style={{ background: 'radial-gradient(circle, #431407 0%, #1e1b4b 60%, transparent 100%)' }}
        />
      </div>

      {/* Top Bar Branding */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-[0_0_20px_rgba(21,128,61,0.4)] border border-white/10">
            <img 
              src="/ytify-icon.png" 
              alt="ytify logo" 
              className="w-full h-full object-cover filter contrast-125 brightness-95" 
            />
          </div>
          <span className="font-black text-2xl tracking-tighter flex items-baseline leading-none">
            <span className="text-[#dc2626] drop-shadow-[0_0_12px_rgba(220,38,38,0.4)]">yt</span>
            <span className="text-[#16a34a] drop-shadow-[0_0_12px_rgba(22,163,74,0.4)]">ify</span>
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-glass-pill border border-white/10 text-[11px] text-white/70 font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span>Dolby Atmos Live</span>
        </div>
      </header>

      {/* Hero Showcase Center Content */}
      <main className="relative z-10 w-full max-w-lg mx-auto px-6 py-6 flex flex-col items-center text-center my-auto">
        {/* Hero Glowing Brand Logo Emblem */}
        <div className="relative mb-6 group">
          {/* Ambient Outer Halo */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#dc2626]/40 via-[#16a34a]/40 to-transparent blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
          
          {/* Concentric Glass Ring */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1.5 liquid-glass-dock border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500 ease-out">
            <div className="w-full h-full rounded-[22px] overflow-hidden relative shadow-inner bg-black/40">
              <img 
                src="/ytify-icon.png" 
                alt="ytify emblem" 
                className="w-full h-full object-cover scale-105 filter contrast-115 brightness-95"
              />
              {/* Refraction highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Equalizer Wave Indicator */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 shadow-lg flex items-center gap-1">
            <div className="w-1 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <div className="w-1 h-4 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
            <div className="w-1 h-3 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
          </div>
        </div>

        {/* Brand Headline */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 leading-tight">
          Music Without <span className="bg-gradient-to-r from-red-500 via-rose-400 to-emerald-400 bg-clip-text text-transparent">Limits</span>
        </h1>
        
        <p className="text-sm sm:text-base text-white/65 max-w-sm mb-7 leading-relaxed font-normal">
          Stream over 100 million songs, high-res audio videos, curated mixes, and Dolby Atmos audio directly on Ytify.
        </p>

        {/* Highlighting Feature Pills */}
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm mb-8">
          <div className="p-3 rounded-2xl liquid-glass-pill border border-white/10 flex items-center gap-2.5 text-left bg-white/[0.03]">
            <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <Headphones size={15} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white leading-tight">Dolby Atmos</p>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">3D Spatial sound</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl liquid-glass-pill border border-white/10 flex items-center gap-2.5 text-left bg-white/[0.03]">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Zap size={15} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white leading-tight">Zero Audio Ads</p>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">Nonstop playback</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl liquid-glass-pill border border-white/10 flex items-center gap-2.5 text-left bg-white/[0.03]">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white leading-tight">Smart Mixes</p>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">Tailored for you</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl liquid-glass-pill border border-white/10 flex items-center gap-2.5 text-left bg-white/[0.03]">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={15} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-white leading-tight">Synced Cloud</p>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">Playlists & history</p>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="w-full max-w-sm mb-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* ONLY SIGN IN WITH GOOGLE BUTTON (PLUS DOWNLOAD APK ON WEB) */}
        <div className="w-full max-w-sm flex flex-col gap-2.5">
          <button
            onClick={handleGoogleSignIn}
            disabled={isAuthorizing}
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-base flex items-center justify-center gap-3.5 shadow-[0_10px_30px_rgba(255,255,255,0.18)] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60 relative overflow-hidden group"
          >
            {/* Specular sheen effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

            {/* Authentic Google Multi-Color SVG Logo */}
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
            <span>{isAuthorizing ? 'Signing in with Google...' : 'Sign in with Google'}</span>
          </button>

          {/* Quick Instant Guest Access on Web & Desktop */}
          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full py-3 px-6 rounded-2xl liquid-glass-pill hover:bg-white/10 text-white/70 hover:text-white font-medium text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer border border-white/10"
          >
            <Sparkles size={14} className="text-emerald-400" />
            <span>Continue as Guest • Listen Instantly</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 text-center text-[11px] text-white/40">
        <p>Ytify is built for pure, high-fidelity music streaming and Dolby Atmos sound.</p>
      </footer>
    </div>
  );
};
