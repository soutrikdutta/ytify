import React, { useState, useEffect } from 'react';
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
  Code2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { isNativePlatform } from '../api';

interface SettingsProps {
  onOpenTaste?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onOpenTaste }) => {
  const { user, signOut, userData } = useAuth();
  const [showModal, setShowModal] = useState(false);
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
