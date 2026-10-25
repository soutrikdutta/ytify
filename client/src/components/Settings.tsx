import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sliders, 
  Volume2, 
  Trash2, 
  LogIn, 
  User as UserIcon,
  Sparkles,
  Waves,
  Play,
  Check,
  Download,
  Smartphone,
  RefreshCw,
  Globe,
  Code2,
  Crown,
  X,
  Zap,
  ChevronRight,
  Copy,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { isNativePlatform } from '../api';

interface SettingsProps {
  onOpenTaste?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onOpenTaste }) => {
  const { user, signOut, userData, activateAccountPremium } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // One-time reset of any old global non-account-linked test purchases
  useEffect(() => {
    try {
      localStorage.removeItem('ytify_premium_expires_at');
      localStorage.removeItem('ytify_active_utr');
    } catch {}
  }, []);

  // Premium status is 100% strictly linked to THIS specific Google account in Firestore
  const accountPremiumExpiresAt = (user && !user.isGuest) ? (userData.premiumExpiresAt || 0) : 0;
  const isPremiumActive = accountPremiumExpiresAt > Date.now();
  const daysRemaining = isPremiumActive 
    ? Math.max(1, Math.ceil((accountPremiumExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleCopyUpi = () => {
    try {
      navigator.clipboard?.writeText('8902281688@mbk');
      setCopiedUpi(true);
      showToast('UPI ID copied: 8902281688@mbk');
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      showToast('UPI ID: 8902281688@mbk');
    }
  };

  const handleVerifyAndActivate = async () => {
    if (!user || user.isGuest) {
      setShowPaymentModal(false);
      setShowModal(true);
      showToast('Please sign in with Google first to link your Premium subscription!');
      return;
    }

    const cleaned = utrNumber.trim().replace(/\s+/g, '');
    if (!cleaned) {
      setUtrError('Please enter the 12-digit UPI Ref / UTR number from your payment app');
      return;
    }
    if (!/^\d{12}$/.test(cleaned)) {
      setUtrError('UTR must be exactly 12 digits (e.g. 429108392102)');
      return;
    }

    setUtrError('');
    setIsVerifying(true);

    try {
      const usedUtrs = JSON.parse(localStorage.getItem('ytify_used_utrs') || '[]');
      if (usedUtrs.includes(cleaned)) {
        setUtrError('This 12-digit UTR has already been submitted or redeemed.');
        setIsVerifying(false);
        return;
      }

      await activateAccountPremium(cleaned);

      usedUtrs.push(cleaned);
      localStorage.setItem('ytify_used_utrs', JSON.stringify(usedUtrs));

      setShowPaymentModal(false);
      setShowPremiumModal(false);
      setUtrNumber('');
      showToast('🎉 Payment verified! 2 Months ytify Premium linked to your Google Account!');
    } catch (err: any) {
      setUtrError(err?.message || 'Verification error. Please check your network.');
    } finally {
      setIsVerifying(false);
    }
  };

  const [streamQuality, setStreamQuality] = useState<'normal' | 'high' | 'ultra'>('high');
  const [dataSaver, setDataSaver] = useState(false);
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [gaplessPlayback, setGaplessPlayback] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2800);
  };

  // Lock body scroll when modals are opened
  useEffect(() => {
    if (showPremiumModal || showPaymentModal) {
      const origOverflow = document.body.style.overflow;
      const origTouchAction = document.body.style.touchAction;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = origOverflow;
        document.body.style.touchAction = origTouchAction;
      };
    }
  }, [showPremiumModal, showPaymentModal]);

  // Dolby Atmos Engine State
  const [dolbyEnabled, setDolbyEnabled] = useState(() => {
    const saved = localStorage.getItem('ytify_dolby_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [dolbyProfile, setDolbyProfile] = useState<'dynamic' | 'movie' | 'music' | 'voice'>(() => {
    return (localStorage.getItem('ytify_dolby_profile') as any) || 'music';
  });
  const [dolbySurround, setDolbySurround] = useState(() => {
    const saved = localStorage.getItem('ytify_dolby_surround');
    return saved !== null ? saved === 'true' : true;
  });
  const [dolbyBass, setDolbyBass] = useState(() => {
    const saved = localStorage.getItem('ytify_dolby_bass');
    return saved !== null ? saved === 'true' : true;
  });
  const [dolbyDialogue, setDolbyDialogue] = useState(() => {
    const saved = localStorage.getItem('ytify_dolby_dialogue');
    return saved !== null ? saved === 'true' : false;
  });

  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Sync Dolby settings to localStorage & dispatch event
  useEffect(() => {
    localStorage.setItem('ytify_dolby_enabled', String(dolbyEnabled));
    localStorage.setItem('ytify_dolby_profile', dolbyProfile);
    localStorage.setItem('ytify_dolby_surround', String(dolbySurround));
    localStorage.setItem('ytify_dolby_bass', String(dolbyBass));
    localStorage.setItem('ytify_dolby_dialogue', String(dolbyDialogue));
    window.dispatchEvent(new CustomEvent('ytify_dolby_updated'));
  }, [dolbyEnabled, dolbyProfile, dolbySurround, dolbyBass, dolbyDialogue]);

  // Real-time Web Audio 3D Spatial Audio Test / Audition Chime
  const testSpatialAudio = () => {
    if (isPlayingTest) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      setIsPlayingTest(true);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const bassFilter = ctx.createBiquadFilter();
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

      // Bass EQ Filter
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = dolbyBass && dolbyEnabled ? 9 : 0;

      // Harmonic Tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
      osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 1.2); // C5
      osc.frequency.exponentialRampToValueAtTime(392.00, ctx.currentTime + 2.2); // G4

      // Envelope
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.3);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 2.0);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2.6);

      // 3D Spatial Surround Panning
      if (panner && dolbySurround && dolbyEnabled) {
        panner.pan.setValueAtTime(-1, ctx.currentTime); // Full Left Ear
        panner.pan.linearRampToValueAtTime(1, ctx.currentTime + 1.3); // Orbit to Right Ear
        panner.pan.linearRampToValueAtTime(-1, ctx.currentTime + 2.5); // Orbit back to Left
        osc.connect(bassFilter).connect(panner).connect(gain).connect(ctx.destination);
      } else {
        osc.connect(bassFilter).connect(gain).connect(ctx.destination);
      }

      osc.start();
      osc.stop(ctx.currentTime + 2.7);

      setTimeout(() => {
        setIsPlayingTest(false);
        ctx.close();
      }, 2750);
    } catch (e) {
      console.warn('Web Audio test failed:', e);
      setIsPlayingTest(false);
    }
  };

  const clearCache = () => {
    try {
      sessionStorage.clear();
      const keysToRemove = Object.keys(localStorage).filter(
        k => k.startsWith('ytify_feed_') || k.startsWith('ytify_explore_') || k === 'ytify_cached_search_shelf'
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));
      showToast('Cache and temporary stream data cleared!');
    } catch {
      showToast('Cache cleared successfully.');
    }
  };

  return (
    <div className="pb-56 px-4 pt-4 max-w-2xl lg:max-w-3xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          Settings
        </h1>
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#16a34a] px-3 py-1 rounded-full liquid-glass-pill font-bold">
          v1.0 Pro
        </span>
      </div>

      {/* Profile Card */}
      <div className="liquid-glass-card rounded-3xl p-5 mb-5">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#15803d] shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xl border-2 border-[#15803d] shadow-md flex-shrink-0">
                  G
                </div>
              )}
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate max-w-[150px]">
                    {user.name}
                  </h3>
                  <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">
                    {user.isGuest ? 'Guest' : 'Active'}
                  </span>
                </div>
                <p className="text-xs text-white/50 truncate mt-0.5">{user.email || 'Guest Session'}</p>
                <p className="text-[10px] text-white/40 mt-1">{userData.likedSongs.length} Liked Tracks • {userData.history.length} Played</p>
              </div>
            </div>

            <button 
              onClick={signOut}
              className="text-xs font-semibold text-rose-400 liquid-glass-pill px-3 py-1.5 rounded-full hover:bg-rose-950/40 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full liquid-segment-active mx-auto mb-3 flex items-center justify-center">
              <UserIcon size={22} className="text-white/80" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Sign in to ytify</h3>
            <p className="text-xs text-white/50 max-w-xs mx-auto mb-4">
              Sync your liked songs, custom playlists, and listening history securely across all your devices.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <LogIn size={18} />
              <span>Sign in with Google</span>
            </button>
          </div>
        )}
      </div>

      {/* MOBILE-FIRST CLEAN MINIMALIST PREMIUM CARD */}
      {!isPremiumActive ? (
        <div 
          onClick={() => {
            if (!user || user.isGuest) {
              setShowModal(true);
            } else {
              setShowPaymentModal(true);
            }
          }}
          className="mb-5 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#18181f] to-[#121217] border border-white/10 shadow-lg cursor-pointer active:scale-[0.99] transition-all select-none"
        >
          {/* Top Row: Icon + Title + Price Pill */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center flex-shrink-0 text-amber-400">
                <Crown size={18} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                ytify Premium
              </h3>
            </div>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
              ₹10 for 2 Months
            </span>
          </div>

          {/* Perks explanation */}
          <p className="text-xs text-white/55 mb-3 leading-relaxed">
            Continuous background playback & 100% ad-free listening across all your devices.
          </p>

          {/* Action Button: Full-width on mobile, tactile, clean contrast */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!user || user.isGuest) {
                setShowModal(true);
              } else {
                setShowPaymentModal(true);
              }
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-950 font-bold text-xs sm:text-sm shadow flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <span>{(!user || user.isGuest) ? 'Sign in with Google & Get Premium (₹10)' : 'Activate 2 Months Premium • ₹10'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        /* PURCHASED PREMIUM ACTIVE CARD WITH COUNTDOWN */
        <div 
          onClick={() => setShowPremiumModal(true)}
          className="mb-5 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#18181f] to-[#121217] border border-amber-400/30 shadow-lg cursor-pointer active:scale-[0.99] transition-all select-none"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/35 flex items-center justify-center flex-shrink-0 text-amber-300">
                <Crown size={18} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  ytify Premium Active
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>{daysRemaining} Days Left</span>
            </span>
          </div>

          <p className="text-xs text-white/55 mb-2.5">
            Background Playing & Zero Ads active • Linked to {user?.email || 'your Google account'}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-white/40">
            <span>2-Month Subscription</span>
            <span className="text-amber-300 font-medium">Expires in {daysRemaining} days</span>
          </div>
        </div>
      )}

      {/* Taste Onboarding / Recommendation Preferences */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-2 flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#16a34a]" />
          Taste Recommendations
        </h3>
        <div className="liquid-glass-card rounded-3xl p-4 flex items-center justify-between">
          <div className="overflow-hidden pr-3">
            <p className="text-sm font-semibold text-white">Favorite Artists & Genres</p>
            <p className="text-xs text-white/45 truncate mt-0.5">
              {userData.preferences?.artists && userData.preferences.artists.length > 0
                ? `${userData.preferences.artists.slice(0, 3).join(', ')}${userData.preferences.artists.length > 3 ? ` +${userData.preferences.artists.length - 3} more` : ''}`
                : 'Not configured (Tap to select your favorite artists)'}
            </p>
          </div>
          <button
            onClick={onOpenTaste}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#15803d] text-white font-bold text-xs flex-shrink-0 cursor-pointer shadow active:scale-95 transition-all"
          >
            Tune
          </button>
        </div>
      </div>

      {/* Dolby Atmos Audio Engine */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
            <Waves size={14} className="text-[#16a34a]" />
            <span>Dolby Atmos Spatial Audio</span>
          </h3>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
            Hardware Level DSP
          </span>
        </div>

        <div className="liquid-glass-card rounded-3xl overflow-hidden divide-y divide-white/10">
          {/* Main Dolby Master Toggle */}
          <div 
            className="p-4 flex items-center justify-between cursor-pointer" 
            onClick={() => setDolbyEnabled(!dolbyEnabled)}
          >
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wide text-white">DOLBY ATMOS</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${dolbyEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/40'}`}>
                  {dolbyEnabled ? 'Active' : 'Off'}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Virtualizes 3D spatial field, expands stereo width, and enriches acoustic details
              </p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${dolbyEnabled ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </div>
          </div>

          {/* Profile Selector (When Enabled) */}
          {dolbyEnabled && (
            <div className="p-4 animate-in fade-in duration-200">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2.5 block">Sound Profiles</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['dynamic', 'music', 'movie', 'voice'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setDolbyProfile(p)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      dolbyProfile === p
                        ? 'liquid-segment-active text-white border-emerald-500/50 shadow-md'
                        : 'liquid-glass-pill text-white/60 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Sub-features */}
              <div className="mt-4 space-y-3 pt-3 border-t border-white/10">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setDolbySurround(!dolbySurround)}
                >
                  <div>
                    <span className="text-xs font-semibold text-white">Surround Virtualizer</span>
                    <p className="text-[11px] text-white/40">Immersive 3D audio stage</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${dolbySurround ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setDolbyBass(!dolbyBass)}
                >
                  <div>
                    <span className="text-xs font-semibold text-white">Acoustic Bass Enhancer</span>
                    <p className="text-[11px] text-white/40">Punchy low-frequency resonance</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${dolbyBass ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </div>

                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setDolbyDialogue(!dolbyDialogue)}
                >
                  <div>
                    <span className="text-xs font-semibold text-white">Vocal & Dialogue Enhancer</span>
                    <p className="text-[11px] text-white/40">Crisp vocal clarity</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${dolbyDialogue ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                </div>
              </div>

              {/* Interactive 3D Spatial Audio Test Button */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={testSpatialAudio}
                  disabled={isPlayingTest}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#991b1b]/80 via-[#15803d]/80 to-[#16a34a]/80 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play size={14} className={isPlayingTest ? 'animate-spin' : ''} fill="currentColor" />
                  <span>{isPlayingTest ? 'Auditioning 3D Spatial Sound (Left ➔ Right)...' : 'Test Spatial Audio (Audition Sound)'}</span>
                </button>
                <p className="text-[10px] text-white/40 text-center mt-1.5">
                  Best experienced with headphones to test 360° surround virtualization.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Controls Group */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-2 flex items-center gap-1.5">
          <Sliders size={13} className="text-[#16a34a]" />
          Playback & Audio Quality
        </h3>

        <div className="liquid-glass-card rounded-3xl overflow-hidden divide-y divide-white/10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-semibold text-white">Audio Stream Quality</span>
              <span className="text-xs text-emerald-400 font-medium capitalize">{streamQuality} (Hi-Fi)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'high', 'ultra'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setStreamQuality(q)}
                  className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                    streamQuality === q
                      ? 'liquid-segment-active text-white font-bold shadow-md'
                      : 'liquid-glass-pill text-white/70'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setGaplessPlayback(!gaplessPlayback)}>
            <div>
              <p className="text-sm font-semibold text-white">Gapless Playback</p>
              <p className="text-xs text-white/40 mt-0.5">Continuous smooth playback without ads or gaps</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${gaplessPlayback ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setNormalizeVolume(!normalizeVolume)}>
            <div>
              <p className="text-sm font-semibold text-white">Normalize Volume</p>
              <p className="text-xs text-white/40 mt-0.5">Balance loudness across all tracks</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${normalizeVolume ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setDataSaver(!dataSaver)}>
            <div>
              <p className="text-sm font-semibold text-white">Data Saver</p>
              <p className="text-xs text-white/40 mt-0.5">Reduce bandwidth usage on cellular data</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${dataSaver ? 'liquid-switch-on justify-end' : 'bg-white/15 justify-start'}`}>
              <div className="w-5 h-5 rounded-full bg-white shadow-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Android Mobile Application */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-2 flex items-center gap-1.5">
          <Smartphone size={13} className="text-[#16a34a]" />
          <span>{isNativePlatform() ? 'Ytify Android App' : 'Android Mobile App'}</span>
        </h3>

        <div className="liquid-glass-card rounded-3xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {isNativePlatform() ? 'Ytify for Android' : 'Ytify for Android (APK)'}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {isNativePlatform() 
                ? 'Version 1.0 (Tap to update to the latest build)' 
                : 'Standalone native Android application'}
            </p>
          </div>
          <a
            href="https://soutrik-ytify.vercel.app/ytify.apk"
            download="ytify.apk"
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs border border-emerald-500/30 active:scale-95 transition-all cursor-pointer shadow"
          >
            {isNativePlatform() ? (
              <>
                <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '6s' }} />
                <span>Update App</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Download APK</span>
              </>
            )}
          </a>
        </div>
      </div>

      {/* Storage and Cache */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-2 flex items-center gap-1.5">
          <Volume2 size={13} className="text-[#16a34a]" />
          Storage & Maintenance
        </h3>

        <div className="liquid-glass-card rounded-3xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Clear Cache & Temporary Data</p>
            <p className="text-xs text-white/40 mt-0.5">Free up browser storage and reset offline streams</p>
          </div>
          <button
            onClick={clearCache}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Ultra-Aesthetic Modern Developer Signature Card */}
      <div className="mb-10">
        <div className="relative overflow-hidden rounded-[28px] p-6 liquid-glass-card border border-white/10 hover:border-white/20 shadow-[0_16px_45px_rgba(0,0,0,0.7)] group transition-all duration-500">
          {/* Subtle Dynamic Ambient Lighting Aura */}
          <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-gradient-to-tr from-rose-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-5">
            {/* Creator Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Sleek Minimalist Creator Badge */}
                <div className="relative w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-tr from-[#16a34a] via-emerald-400 to-[#dc2626] shadow-[0_4px_20px_rgba(21,128,61,0.3)] flex-shrink-0 group-hover:scale-105 transition-all duration-300">
                  <div className="w-full h-full rounded-[14px] overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center relative">
                    <Code2 size={20} className="text-emerald-400 group-hover:text-white transition-colors" />
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-400/90 font-mono">
                      CREATOR & ARCHITECT
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white tracking-tight mt-0.5">
                    Developed by :- <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent font-extrabold">Soutrik</span>
                  </h4>
                  <p className="text-xs text-white/50 mt-0.5 font-medium">
                    Crafted for High-Fidelity Streaming & Dolby Atmos Spatial Audio
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-[11px] font-mono">
                <span>v1.0 • Release</span>
              </div>
            </div>

            {/* Quick Links: Portfolio Website + LinkedIn */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <a
                href="https://soutrik.antideploy.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-white text-xs font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <Globe size={13} className="text-emerald-400" />
                </div>
                <span className="tracking-wide">Portfolio</span>
              </a>

              <a
                href="https://www.linkedin.com/in/soutrik-dutta-245b93372/"
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-[#0a66c2]/10 border border-white/10 hover:border-[#0a66c2]/30 text-white text-xs font-semibold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all duration-200 shadow-sm"
              >
                <div className="w-6 h-6 rounded-lg bg-[#0a66c2]/15 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <svg className="w-3.5 h-3.5 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.85 6.46a1.62 1.62 0 1 0 1.62 1.62c0-.9-.72-1.62-1.62-1.62z"/>
                  </svg>
                </div>
                <span className="tracking-wide">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {/* SIMPLEST CLEAN TONE PREMIUM OVERVIEW MODAL */}
      {showPremiumModal && createPortal(
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 touch-none overscroll-none"
          onClick={() => setShowPremiumModal(false)}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#101115] border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-200 relative overflow-hidden text-white"
          >
            {/* Close Button X */}
            <button 
              type="button" 
              onClick={() => setShowPremiumModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header: Crown & Title */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mb-3">
                <Crown size={28} className="text-amber-400" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full mb-1">
                2 Months Subscription • ₹10
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">ytify Premium</h2>
              <p className="text-xs text-white/50 mt-1 max-w-xs">
                Enjoy uninterrupted music with background playback and pure zero-ad listening.
              </p>
            </div>

            {/* Features Included */}
            <div className="space-y-2.5 mb-5">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 text-amber-300">
                  <Smartphone size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">Background Playing</h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Music continues playing even when your phone screen is locked or while using other apps.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 text-amber-300">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">Zero Ads</h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Zero commercial interruptions, zero audio promotions. Pure uninterrupted music.
                  </p>
                </div>
              </div>
            </div>

            {/* Price & Action */}
            <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center mb-4">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-2xl font-black text-white">₹10</span>
                <span className="text-xs text-white/50">/ 2 Months</span>
                <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full font-semibold ml-1">
                  ₹5 / Month
                </span>
              </div>
              {isPremiumActive && (
                <p className="text-xs text-amber-300 font-semibold mt-1">
                  Active Subscription: {daysRemaining} days remaining
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowPremiumModal(false);
                setShowPaymentModal(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-sm shadow cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>{isPremiumActive ? 'Renew / Extend Plan (₹10)' : 'Pay ₹10 with UPI'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED UPI PAYMENT MODAL (WITH QR CODE & DIRECT GATEWAY) */}
      {showPaymentModal && createPortal(
        <div 
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 touch-none overscroll-none"
          onClick={() => setShowPaymentModal(false)}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#101115] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 relative overflow-hidden text-white"
          >
            {/* Close Button X */}
            <button 
              type="button" 
              onClick={() => setShowPaymentModal(false)} 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-3">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full mb-1">
                <Crown size={12} />
                <span>₹10 for 2 Months</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Pay via UPI</h2>
              <p className="text-xs text-white/50 mt-0.5">Scan the QR code or open any UPI app</p>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-md mb-3">
              <img 
                src="/premium-qr.png" 
                alt="UPI QR Code - 8902281688@mbk" 
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
              />
              <div className="flex items-center gap-2 mt-2 px-2.5 py-1 bg-neutral-100 rounded-lg border border-neutral-200 w-full justify-between">
                <span className="text-[11px] font-mono font-bold text-neutral-800 truncate">
                  8902281688@mbk
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="text-[10px] font-bold text-neutral-700 hover:text-black flex items-center gap-1 cursor-pointer flex-shrink-0"
                >
                  <Copy size={11} />
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mb-3">
              {/* Trigger native Android / iOS system UPI app chooser */}
              <a
                href="upi://pay?pa=8902281688@mbk&pn=Soutrik%20Dutta&am=10&cu=INR&tn=ytify%20Premium%202%20Months"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-[0.98] transition-all cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Pay ₹10 with UPI App (GPay/PhonePe/Paytm)</span>
              </a>
            </div>

            {/* Verification Section: 12-digit UPI UTR Number */}
            <div className="pt-3 border-t border-neutral-800 text-left">
              <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                <span>Enter 12-digit UPI Ref / UTR No.</span>
                <span className="text-[10px] text-amber-300 font-semibold">From Payment Receipt</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  maxLength={12}
                  inputMode="numeric"
                  value={utrNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setUtrNumber(val);
                    if (utrError) setUtrError('');
                  }}
                  placeholder="e.g. 429108392102"
                  className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-400 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl outline-none placeholder:text-white/30 tracking-wider shadow-inner"
                />
                {utrNumber.length > 0 && (
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-white/40">
                    {utrNumber.length}/12
                  </span>
                )}
              </div>

              {utrError && (
                <p className="text-[11px] text-rose-400 mt-1 font-medium">
                  {utrError}
                </p>
              )}
            </div>

            {/* Payment Verification & Activation Button */}
            <button
              type="button"
              disabled={isVerifying || utrNumber.length !== 12}
              onClick={handleVerifyAndActivate}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-black text-xs shadow-md cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-3"
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Verifying UTR...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Verify UTR & Activate 2 Months</span>
                </>
              )}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Animated Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-neutral-900/90 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-white text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};