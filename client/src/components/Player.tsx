import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronDown, 
  Heart, 
  Repeat, 
  Shuffle, 
  ListMusic, 
  Share2, 
  MoreVertical, 
  Disc3, 
  Waves, 
  RotateCcw, 
  RotateCw, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  ListPlus,
  Plus,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2
} from 'lucide-react';

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onVolumeChange?: (vol: number) => void;
  queue: Song[];
  onPlaySong: (song: Song) => void;
  dolbyEnabled?: boolean;
  dolbyProfile?: string;
  autoExpand?: boolean;
  onShuffleQueue?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume: _volume = 80,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange: _onVolumeChange,
  queue,
  onPlaySong,
  dolbyEnabled = true,
  dolbyProfile = 'music',
  autoExpand = false,
  onShuffleQueue
}) => {
  const { toggleLike, isLiked, userData, addSongToPlaylist } = useAuth();
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isHeaderDragging, setIsHeaderDragging] = useState(false);
  const headerDragStartY = useRef(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [currentVol, setCurrentVol] = useState(_volume || 80);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(80);

  const handleVolumeChange = (newVol: number) => {
    setCurrentVol(newVol);
    setIsMuted(newVol === 0);
    _onVolumeChange?.(newVol);
  };

  const toggleMute = () => {
    if (isMuted || currentVol === 0) {
      const restored = prevVol || 80;
      setCurrentVol(restored);
      setIsMuted(false);
      _onVolumeChange?.(restored);
    } else {
      setPrevVol(currentVol);
      setCurrentVol(0);
      setIsMuted(true);
      _onVolumeChange?.(0);
    }
  };

  const handleShuffleClick = () => {
    const nextState = !isShuffle;
    setIsShuffle(nextState);
    if (onShuffleQueue) {
      onShuffleQueue();
    }
    showToast(nextState ? 'Shuffle enabled 🔀' : 'Shuffle off');
  };

  useEffect(() => {
    if (autoExpand) {
      setIsClosing(false);
      setIsExpanded(true);
    }
  }, [autoExpand, currentSong?.videoId]);

  useEffect(() => {
    const handleCloseExpanded = () => {
      if (isExpanded) {
        closeExpanded();
      }
    };
    window.addEventListener('ytify_close_expanded_player', handleCloseExpanded);
    return () => window.removeEventListener('ytify_close_expanded_player', handleCloseExpanded);
  }, [isExpanded]);

  const openExpanded = () => {
    try {
      window.history.pushState({ player: 'expanded' }, '');
    } catch {}
    setIsClosing(false);
    setDragY(0);
    setIsExpanded(true);
  };

  const closeExpanded = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
      setDragY(0);
    }, 280);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsHeaderDragging(true);
    headerDragStartY.current = e.clientY;
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHeaderDragging) return;
    const delta = e.clientY - headerDragStartY.current;
    if (delta > 0) {
      setDragY(delta);
    } else {
      setDragY(delta * 0.15);
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHeaderDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsHeaderDragging(false);
    if (dragY > 85) {
      closeExpanded();
    } else {
      setDragY(0);
    }
  };

  const handleHeaderPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isHeaderDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsHeaderDragging(false);
      setDragY(0);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(c => c === msg ? null : c);
    }, 2800);
  };

  const handleShare = async () => {
    if (!currentSong) return;
    const url = `${window.location.origin}/?v=${currentSong.videoId}&play=1`;
    const artistName = typeof currentSong.artist === 'string' ? currentSong.artist : currentSong.artist?.name || 'Artist';
    const shareData = {
      title: `${currentSong.name} on ytify`,
      text: `Listen to "${currentSong.name}" by ${artistName} on ytify:`,
      url
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('ytify full-screen link copied to clipboard!');
    } catch {
      showToast(url);
    }
  };

  // Timebar Drag & Seeking State (Smooth Forward / Backward at anytime)
  const [isDragging, setIsDragging] = useState(false);
  const [dragRatio, setDragRatio] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!currentSong) return null;

  const songIsLiked = isLiked(currentSong.videoId);

  const parseDurationString = (dStr?: string | number | null): number => {
    if (!dStr) return 0;
    if (typeof dStr === 'number') return dStr;
    const parts = String(dStr).split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const effectiveDuration = duration > 0 ? duration : (parseDurationString(currentSong.duration) || 180);
  const currentRatio = isDragging 
    ? dragRatio 
    : (effectiveDuration > 0 ? Math.min(1, Math.max(0, currentTime / effectiveDuration)) : 0);
  const displayCurrentTime = isDragging ? dragRatio * effectiveDuration : currentTime;

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRatioFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const ratio = getRatioFromEvent(e);
    setIsDragging(true);
    setDragRatio(ratio);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const ratio = getRatioFromEvent(e);
    setDragRatio(ratio);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const ratio = getRatioFromEvent(e);
    setIsDragging(false);
    if (effectiveDuration > 0) {
      onSeek(ratio * effectiveDuration);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setIsDragging(false);
    }
  };

  const handleJump = (seconds: number) => {
    const target = Math.max(0, Math.min(effectiveDuration, currentTime + seconds));
    onSeek(target);
  };

  const getArtistName = (song: Song) => {
    if (typeof song.artist === 'string') return song.artist;
    if (song.artist && song.artist.name) return song.artist.name;
    if (song.artists && song.artists.length > 0) return song.artists.map(a => a.name).join(', ');
    return 'Artist';
  };

  const getThumbnail = (song: Song) => {
    if (song.thumbnails && song.thumbnails.length > 0) {
      return song.thumbnails[song.thumbnails.length - 1].url;
    }
    return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
  };

  return (
    <>
      {/* Floating Mini Player (Mobile Only) */}
      {!isExpanded && (
        <>
          <div 
            onClick={openExpanded}
            className="md:hidden w-full liquid-glass-dock rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 active:scale-[0.97] shadow-[0_16px_50px_rgba(0,0,0,0.9)] group relative overflow-hidden select-none border border-white/15"
          >
            {/* Interactive Alive Glowing Ambient Progress Accent on Mini Player */}
            <div 
              className="absolute bottom-0 inset-x-0 h-[4px] bg-white/10 overflow-hidden cursor-pointer group/mini-bar"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                if (effectiveDuration > 0) {
                  onSeek(ratio * effectiveDuration);
                }
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-[#991b1b] via-[#15803d] to-[#22c55e] relative shadow-[0_0_10px_rgba(34,197,94,0.7)]"
                style={{ width: `${effectiveDuration ? (currentTime / effectiveDuration) * 100 : 0}%` }}
              >
                {isPlaying && (
                  <div className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-scrubber-shimmer pointer-events-none" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-3">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/15 flex items-center justify-center bg-neutral-950">
                <img 
                  src={getThumbnail(currentSong)} 
                  alt="" 
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50 brightness-75 pointer-events-none"
                />
                <img 
                  src={getThumbnail(currentSong)} 
                  alt={currentSong.name} 
                  className={`relative z-10 w-full h-full object-contain p-0.5 transition-transform duration-700 ${isPlaying ? 'scale-105' : ''}`}
                />
              </div>

              <div className="overflow-hidden">
                <h4 className="text-white text-sm font-semibold truncate leading-tight group-hover:text-emerald-400 transition-colors">
                  {currentSong.name}
                </h4>
                <p className="text-white/55 text-xs truncate mt-0.5 font-medium flex items-center gap-1.5">
                  <span className="truncate">{getArtistName(currentSong)}</span>
                  {isPlaying && (
                    <span className="flex items-end gap-[2px] h-3 ml-0.5 flex-shrink-0" title="Playing">
                      <span className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-1" />
                      <span className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-2" />
                      <span className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-3" />
                      <span className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-4" />
                    </span>
                  )}
                  {dolbyEnabled && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full font-bold flex-shrink-0 tracking-wider">
                      ATMOS
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => toggleLike(currentSong)}
                className={`p-2 transition-transform duration-200 active:scale-130 ${songIsLiked ? 'text-[#b91c1c]' : 'text-white/40 hover:text-white/80'}`}
              >
                <Heart size={20} fill={songIsLiked ? 'currentColor' : 'none'} />
              </button>
              <button 
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full liquid-segment-active text-white flex items-center justify-center hover:scale-108 active:scale-90 transition-all shadow-md ml-0.5"
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          </div>

          {/* DESKTOP VIEW: LUXURY FULL-WIDTH PERSISTENT DOCK AT SCREEN BOTTOM */}
          <div 
            className="hidden md:flex fixed bottom-0 inset-x-0 h-24 bg-[#07080d]/95 backdrop-blur-2xl border-t border-white/10 z-50 px-8 items-center justify-between select-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)]"
          >
            {/* Top glowing progress accent bar */}
            <div 
              className="absolute top-0 inset-x-0 h-[3px] bg-white/10 cursor-pointer group/d-bar overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (effectiveDuration > 0) onSeek(ratio * effectiveDuration);
              }}
            >
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-emerald-500 to-teal-400 relative"
                style={{ width: `${effectiveDuration ? (currentTime / effectiveDuration) * 100 : 0}%` }}
              />
            </div>

            {/* Left: Song details, unclipped cover art, heart button */}
            <div className="flex items-center gap-4 w-1/4 min-w-[240px]">
              <div 
                onClick={openExpanded}
                className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/15 cursor-pointer group flex items-center justify-center bg-neutral-950"
              >
                <img 
                  src={getThumbnail(currentSong)} 
                  alt="" 
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50 brightness-75 pointer-events-none"
                />
                <img 
                  src={getThumbnail(currentSong)} 
                  alt={currentSong.name} 
                  className="relative z-10 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 z-20 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 size={16} className="text-white" />
                </div>
              </div>

              <div className="overflow-hidden flex-1">
                <h4 
                  onClick={openExpanded}
                  className="text-white text-sm font-bold truncate hover:underline hover:text-emerald-400 cursor-pointer leading-tight transition-colors"
                  title={currentSong.name}
                >
                  {currentSong.name}
                </h4>
                <p className="text-white/50 text-xs truncate mt-0.5 font-medium flex items-center gap-2">
                  <span>{getArtistName(currentSong)}</span>
                  {isPlaying && (
                    <span className="flex items-end gap-[2px] h-3 ml-0.5 flex-shrink-0">
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-1" />
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-2" />
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-3" />
                      <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-4" />
                    </span>
                  )}
                </p>
              </div>

              <button 
                onClick={() => toggleLike(currentSong)}
                className={`p-2 transition-transform duration-200 active:scale-125 ${songIsLiked ? 'text-red-500' : 'text-white/40 hover:text-white'}`}
                title={songIsLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
              >
                <Heart size={20} fill={songIsLiked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Center: Playback Transport & Live Scrubber */}
            <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-4">
              {/* Control buttons */}
              <div className="flex items-center gap-5 mb-1.5">
                <button 
                  onClick={onShuffleQueue}
                  className={`p-1.5 transition-colors ${queue.length > 1 ? 'text-white/60 hover:text-white' : 'text-white/30 cursor-not-allowed'}`}
                  title="Shuffle"
                >
                  <Shuffle size={16} />
                </button>

                <button 
                  onClick={onPrev}
                  className="p-1.5 text-white/80 hover:text-white transition-all active:scale-90"
                  title="Previous"
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>

                <button 
                  onClick={onPlayPause}
                  className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>

                <button 
                  onClick={onNext}
                  className="p-1.5 text-white/80 hover:text-white transition-all active:scale-90"
                  title="Next"
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>

                <button 
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-1.5 transition-colors ${isRepeat ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                  title={isRepeat ? 'Repeat On' : 'Repeat Off'}
                >
                  <Repeat size={16} />
                </button>
              </div>

              {/* Scrubber slider bar */}
              <div className="w-full flex items-center gap-3">
                <span className="text-[11px] font-mono text-white/45 w-10 text-right">
                  {formatTime(currentTime)}
                </span>

                <div 
                  className="relative flex-1 h-1.5 hover:h-2 bg-white/15 rounded-full cursor-pointer transition-all group/rail flex items-center"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    if (effectiveDuration > 0) onSeek(ratio * effectiveDuration);
                  }}
                >
                  <div 
                    className="h-full bg-emerald-500 rounded-full relative transition-all"
                    style={{ width: `${effectiveDuration ? (currentTime / effectiveDuration) * 100 : 0}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/rail:opacity-100 shadow-md transition-opacity" />
                  </div>
                </div>

                <span className="text-[11px] font-mono text-white/45 w-10 text-left">
                  {formatTime(effectiveDuration)}
                </span>
              </div>
            </div>

            {/* Right: Audio Specs, Volume Slider, Expand Button */}
            <div className="flex items-center justify-end gap-4 w-1/4 min-w-[220px]">
              {dolbyEnabled && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">
                  ATMOS
                </span>
              )}

              <div className="flex items-center gap-2.5">
                <button 
                  onClick={toggleMute}
                  className="text-white/60 hover:text-white transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || currentVol === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : currentVol}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-24 h-1.5 bg-white/20 rounded-full appearance-none accent-emerald-500 cursor-pointer hover:bg-white/30 transition-all"
                  title={`Volume: ${isMuted ? 0 : currentVol}%`}
                />
              </div>

              <button 
                onClick={openExpanded}
                className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                title="Expand Player"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Player rendered via Portal to document.body (100% immune to parent clipping) */}
      {(isExpanded || isClosing) && createPortal(
        <div 
          className={`fixed inset-0 z-[100] flex flex-col justify-between px-4 sm:px-8 lg:px-12 pt-3 pb-6 md:pb-8 overflow-y-auto md:overflow-hidden select-none bg-[#030307] ${
            isClosing ? 'player-sheet-exit' : 'player-sheet-enter'
          }`}
          style={{
            transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
            transition: isHeaderDragging ? 'none' : (dragY > 0 ? 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : undefined)
          }}
        >
          {/* Dynamic Blurred Backdrop Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center scale-150 filter blur-3xl opacity-35 pointer-events-none transition-all duration-1000"
            style={{ backgroundImage: `url(${getThumbnail(currentSong)})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#08080f]/90 via-[#040407]/95 to-[#020204] pointer-events-none" />

          {/* Top Interactive Pull Handle (Swipe down on mobile to dismiss) */}
          <div 
            className="w-full pt-1 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none relative z-20 group md:hidden"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerCancel}
            title="Swipe down to minimize"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/25 group-hover:bg-white/45 group-active:bg-white/60 transition-colors" />
          </div>

          {/* Top Bar with Liquid Capsule Buttons */}
          <div className="relative z-10 flex items-center justify-between w-full max-w-5xl mx-auto player-stagger-1 mb-2">
            <button 
              type="button"
              onClick={closeExpanded}
              className="px-3.5 py-2 rounded-full liquid-glass-pill flex items-center gap-1.5 text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/10"
              title="Minimize"
            >
              <ChevronDown size={20} />
              <span className="hidden sm:inline text-xs font-semibold">Minimize</span>
            </button>

            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#16a34a] font-black flex items-center justify-center gap-1">
                {dolbyEnabled ? (
                  <>
                    <Waves size={11} className={isPlaying ? 'animate-pulse' : ''} />
                    <span>DOLBY ATMOS • {dolbyProfile.toUpperCase()}</span>
                  </>
                ) : (
                  <span>Playing on Ytify</span>
                )}
              </span>
              <p className="text-xs font-semibold text-white/70 truncate max-w-[240px]">
                {currentSong.album ? currentSong.album.name : 'ytify'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowQueue(!showQueue)}
                className={`px-3 py-2 rounded-full liquid-glass-pill flex items-center gap-1.5 transition-all border ${showQueue ? 'text-[#16a34a] border-[#16a34a]/40 bg-[#16a34a]/15 shadow-[0_0_12px_rgba(22,163,74,0.3)]' : 'text-white/80 hover:text-white border-white/10'}`}
                title="Up Next"
              >
                <ListMusic size={18} />
                <span className="hidden sm:inline text-xs font-semibold">Queue ({queue.length})</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowMoreMenu(true)}
                className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all border border-white/10"
                title="Track Options"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Queue View (When active) */}
          {showQueue ? (
            <div className="relative z-10 flex-1 my-3 overflow-y-auto no-scrollbar liquid-glass-card p-4 sm:p-6 rounded-3xl animate-in fade-in duration-200 player-stagger-2 max-w-4xl mx-auto w-full border border-white/15">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <span>Up Next</span>
                  <span className="text-xs font-normal text-white/40">({queue.length} tracks in queue)</span>
                </h3>
              </div>
              <div className="space-y-2">
                {queue.map((song, idx) => (
                  <div 
                    key={`${song.videoId}-${idx}`}
                    onClick={() => onPlaySong(song)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      song.videoId === currentSong.videoId 
                        ? 'bg-[#15803d]/20 border border-[#15803d]/40 text-emerald-400 shadow-md' 
                        : 'hover:bg-white/5 text-white/80'
                    }`}
                  >
                    <span className="text-xs text-white/30 w-5 text-center font-mono">{idx + 1}</span>
                    <img src={getThumbnail(song)} alt={song.name} className="w-11 h-11 rounded-xl object-cover shadow border border-white/10" />
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm truncate font-medium ${song.videoId === currentSong.videoId ? 'text-emerald-400 font-semibold' : 'text-white'}`}>
                        {song.name}
                      </p>
                      <p className="text-xs text-white/45 truncate mt-0.5">{getArtistName(song)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* DESKTOP VIEW: ULTRA-MODERN 2-COLUMN LUXURY AUDIO INTERFACE   */}
              {/* ============================================================ */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-10 lg:gap-16 md:items-center md:max-w-5xl md:mx-auto md:w-full md:my-auto md:py-4 relative z-10 player-stagger-2">
                
                {/* LEFT COLUMN: GORGEOUS 3D FLOATING ALBUM ART */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative group w-full max-w-[340px] lg:max-w-[380px] aspect-square">
                    {/* Ambient Glow */}
                    <div 
                      className="absolute inset-0 rounded-3xl blur-3xl opacity-50 scale-95 transition-all duration-700 pointer-events-none"
                      style={{
                        backgroundImage: `url(${getThumbnail(currentSong)})`,
                        backgroundSize: 'cover'
                      }}
                    />

                    {/* Main Cover Card */}
                    <div className={`relative w-full h-full rounded-3xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.95)] border border-white/20 transition-all duration-700 bg-neutral-950 flex items-center justify-center ${isPlaying ? 'scale-100 animate-artwork-float' : 'scale-95 opacity-85'}`}>
                      {/* Ambient Glow Backdrop to smoothly fill edges */}
                      <img 
                        src={getThumbnail(currentSong)} 
                        alt="" 
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-125 opacity-40 brightness-75 pointer-events-none"
                      />
                      {/* Uncropped Artwork */}
                      <img 
                        src={getThumbnail(currentSong)} 
                        alt={currentSong.name} 
                        className="relative z-10 w-full h-full object-contain p-1 transition-transform duration-1000 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                      {/* Vinyl Indicator Badge in bottom corner */}
                      <div className="absolute bottom-3 left-3 z-30 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 shadow-lg">
                        <Disc3 size={18} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: BIG TYPOGRAPHY, ACTIONS, SCRUBBER, & CONTROLS */}
                <div className="md:col-span-7 flex flex-col justify-center space-y-5">
                  {/* Quality Pill */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold tracking-wider">
                      DOLBY ATMOS • HI-RES LOSSLESS
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">320 KBPS</span>
                  </div>

                  {/* Song Title & Artist + Likes */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="overflow-hidden flex-1">
                      <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2">
                        {currentSong.name}
                      </h2>
                      <p className="text-base text-white/65 font-medium truncate mt-1">
                        {getArtistName(currentSong)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        type="button"
                        onClick={() => toggleLike(currentSong)}
                        className={`p-2.5 rounded-full liquid-glass-pill transition-all active:scale-125 cursor-pointer border ${songIsLiked ? 'text-[#b91c1c] border-[#b91c1c]/40 bg-[#b91c1c]/15 shadow-[0_0_12px_rgba(185,28,28,0.3)]' : 'text-white/60 hover:text-white border-white/10'}`}
                        title={songIsLiked ? "Liked" : "Like"}
                      >
                        <Heart size={20} fill={songIsLiked ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowAddToPlaylistModal(true)}
                        className="p-2.5 rounded-full liquid-glass-pill text-white/60 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/10"
                        title="Add to Playlist"
                      >
                        <ListPlus size={20} />
                      </button>
                      <button 
                        type="button"
                        onClick={handleShare}
                        className="p-2.5 rounded-full liquid-glass-pill text-white/60 hover:text-white active:scale-90 transition-all cursor-pointer border border-white/10"
                        title="Share Track"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Desktop Scrubber Bar */}
                  <div className="space-y-1.5 select-none pt-2">
                    <div 
                      ref={progressBarRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      className="h-7 flex items-center group cursor-pointer relative touch-none"
                    >
                      <div className={`w-full ${isDragging ? 'h-2.5' : 'h-1.5'} group-hover:h-2.5 bg-white/15 rounded-full overflow-hidden relative backdrop-blur-md transition-all duration-200`}>
                        <div 
                          className="h-full bg-gradient-to-r from-[#991b1b] via-[#15803d] to-[#22c55e] relative rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                          style={{ width: `${currentRatio * 100}%` }}
                        >
                          {isPlaying && !isDragging && (
                            <div className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scrubber-shimmer pointer-events-none" />
                          )}
                        </div>
                      </div>

                      <div 
                        className={`absolute top-1/2 -translate-y-1/2 -ml-2.5 ${isDragging ? 'w-5 h-5 scale-125 shadow-[0_0_20px_rgba(34,197,94,1)]' : 'w-4 h-4 group-hover:scale-125'} rounded-full bg-white border-2 border-[#15803d] shadow-[0_0_12px_rgba(34,197,94,0.9)] transition-transform pointer-events-none flex items-center justify-center`}
                        style={{ left: `${currentRatio * 100}%` }}
                      >
                        {isDragging && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-2xl whitespace-nowrap pointer-events-none">
                            {formatTime(displayCurrentTime)}
                          </div>
                        )}
                        <div className="w-2 h-2 rounded-full bg-white shadow" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-white/50 px-0.5 font-medium">
                      <span className={isDragging ? 'text-emerald-400 font-bold' : ''}>
                        {formatTime(displayCurrentTime)}
                      </span>
                      <span>{formatTime(effectiveDuration)}</span>
                    </div>
                  </div>

                  {/* Desktop Controls Bar: 100% VISIBLE & ACCESSIBLE */}
                  <div className="flex items-center justify-between pt-1">
                    <button 
                      type="button"
                      onClick={handleShuffleClick}
                      className={`p-3 rounded-full transition-all active:scale-90 cursor-pointer ${
                        isShuffle 
                          ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.3)]' 
                          : 'text-white/40 hover:text-white'
                      }`}
                      title={isShuffle ? "Shuffle On" : "Shuffle Off"}
                    >
                      <Shuffle size={20} />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleJump(-10)}
                      className="relative p-2.5 text-white/70 hover:text-white active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                      title="Rewind 10 seconds"
                    >
                      <RotateCcw size={22} />
                      <span className="absolute text-[8px] font-black font-mono pt-0.5">10</span>
                    </button>

                    <button 
                      type="button"
                      onClick={onPrev}
                      className="text-white hover:text-white/80 active:scale-85 transition-all p-2.5 cursor-pointer"
                      title="Previous Track"
                    >
                      <SkipBack size={26} fill="currentColor" />
                    </button>

                    {/* BIG TACTILE PLAY / PAUSE BUTTON */}
                    <button 
                      type="button"
                      onClick={onPlayPause}
                      className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#16a34a] text-white flex items-center justify-center hover:scale-108 active:scale-95 transition-all shadow-[0_10px_35px_rgba(22,163,74,0.45)] border border-white/25 cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button 
                      type="button"
                      onClick={onNext}
                      className="text-white hover:text-white/80 active:scale-85 transition-all p-2.5 cursor-pointer"
                      title="Next Track"
                    >
                      <SkipForward size={26} fill="currentColor" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleJump(10)}
                      className="relative p-2.5 text-white/70 hover:text-white active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                      title="Forward 10 seconds"
                    >
                      <RotateCw size={22} />
                      <span className="absolute text-[8px] font-black font-mono pt-0.5">10</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={`p-3 rounded-full transition-colors active:scale-90 cursor-pointer ${isRepeat ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40' : 'text-white/40 hover:text-white'}`}
                      title="Repeat"
                    >
                      <Repeat size={20} />
                    </button>
                  </div>

                  {/* Desktop Dedicated Volume Slider */}
                  <div className="flex items-center gap-3 pt-2 px-1">
                    <button 
                      type="button"
                      onClick={toggleMute}
                      className="text-white/50 hover:text-white transition-colors cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || currentVol === 0 ? <VolumeX size={18} /> : currentVol < 50 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : currentVol}
                      onChange={(e) => handleVolumeChange(Number(e.target.value))}
                      className="w-32 h-1.5 accent-emerald-500 bg-white/20 rounded-full cursor-pointer"
                    />
                    <span className="text-xs font-mono text-white/40 w-8">{isMuted ? '0%' : `${currentVol}%`}</span>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* MOBILE VIEW: COMPACT, BALANCED & NEVER CLIPPED               */}
              {/* ============================================================ */}
              <div className="flex md:hidden flex-col justify-between flex-1 py-1 relative z-10 player-stagger-2 select-none">
                {/* Mobile Album Art */}
                <div className="relative group w-[54vw] max-w-[210px] max-h-[210px] aspect-square mx-auto my-auto">
                  <div 
                    className="absolute inset-0 rounded-2xl blur-2xl opacity-45 scale-95 transition-all duration-700 pointer-events-none"
                    style={{
                      backgroundImage: `url(${getThumbnail(currentSong)})`,
                      backgroundSize: 'cover'
                    }}
                  />
                  <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/20 transition-all duration-700 bg-neutral-950 flex items-center justify-center ${isPlaying ? 'scale-100 animate-artwork-float' : 'scale-95 opacity-85'}`}>
                    {/* Ambient Glow Backdrop */}
                    <img 
                      src={getThumbnail(currentSong)} 
                      alt="" 
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-lg scale-125 opacity-40 brightness-75 pointer-events-none"
                    />
                    {/* Uncut foreground */}
                    <img 
                      src={getThumbnail(currentSong)} 
                      alt={currentSong.name} 
                      className="relative z-10 w-full h-full object-contain p-0.5"
                    />
                    <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 z-30 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70">
                      <Disc3 size={15} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
                    </div>
                  </div>
                </div>

                {/* Mobile Track Info */}
                <div className="mb-2 px-1">
                  <div className="flex items-center justify-between">
                    <div className="overflow-hidden flex-1 pr-3">
                      <h2 className="text-lg font-black text-white truncate tracking-tight">
                        {currentSong.name}
                      </h2>
                      <p className="text-xs font-medium text-white/65 truncate mt-0.5">
                        {getArtistName(currentSong)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => toggleLike(currentSong)}
                        className={`p-2 rounded-full liquid-glass-pill transition-all active:scale-130 ${songIsLiked ? 'text-[#b91c1c] border-[#b91c1c]/40 bg-[#b91c1c]/15' : 'text-white/60 hover:text-white'}`}
                      >
                        <Heart size={18} fill={songIsLiked ? 'currentColor' : 'none'} />
                      </button>
                      <button 
                        type="button"
                        onClick={handleShare}
                        className="p-2 rounded-full liquid-glass-pill text-white/60 hover:text-white active:scale-90 transition-all cursor-pointer"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Scrubber */}
                <div className="mb-2 px-1 select-none">
                  <div 
                    ref={progressBarRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    className="h-6 flex items-center group cursor-pointer relative touch-none"
                  >
                    <div className={`w-full ${isDragging ? 'h-2' : 'h-1.5'} bg-white/15 rounded-full overflow-hidden relative backdrop-blur-md transition-all duration-200`}>
                      <div 
                        className="h-full bg-gradient-to-r from-[#991b1b] via-[#15803d] to-[#22c55e] relative rounded-full"
                        style={{ width: `${currentRatio * 100}%` }}
                      >
                        {isPlaying && !isDragging && (
                          <div className="absolute inset-0 w-2/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scrubber-shimmer pointer-events-none" />
                        )}
                      </div>
                    </div>

                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 -ml-2 ${isDragging ? 'w-4 h-4 scale-125' : 'w-3.5 h-3.5'} rounded-full bg-white border-2 border-[#15803d] shadow-[0_0_10px_rgba(34,197,94,0.9)] transition-transform pointer-events-none flex items-center justify-center`}
                      style={{ left: `${currentRatio * 100}%` }}
                    >
                      {isDragging && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shadow-2xl whitespace-nowrap pointer-events-none">
                          {formatTime(displayCurrentTime)}
                        </div>
                      )}
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 px-0.5 -mt-1 font-medium">
                    <span className={isDragging ? 'text-emerald-400 font-bold' : ''}>
                      {formatTime(displayCurrentTime)}
                    </span>
                    <span>{formatTime(effectiveDuration)}</span>
                  </div>
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center justify-between px-2 mb-1 max-w-sm mx-auto w-full">
                  <button 
                    type="button"
                    onClick={handleShuffleClick}
                    className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${
                      isShuffle 
                        ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40' 
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <Shuffle size={18} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleJump(-10)}
                    className="relative p-1.5 text-white/70 hover:text-white active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <RotateCcw size={19} />
                    <span className="absolute text-[7px] font-black font-mono pt-0.5">10</span>
                  </button>

                  <button 
                    type="button"
                    onClick={onPrev}
                    className="text-white hover:text-white/80 active:scale-85 transition-all p-2 cursor-pointer"
                  >
                    <SkipBack size={22} fill="currentColor" />
                  </button>

                  <button 
                    type="button"
                    onClick={onPlayPause}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#16a34a] text-white flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-[0_10px_30px_rgba(21,128,61,0.5)] border border-white/20 cursor-pointer"
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
                  </button>

                  <button 
                    type="button"
                    onClick={onNext}
                    className="text-white hover:text-white/80 active:scale-85 transition-all p-2 cursor-pointer"
                  >
                    <SkipForward size={22} fill="currentColor" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleJump(10)}
                    className="relative p-1.5 text-white/70 hover:text-white active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                  >
                    <RotateCw size={19} />
                    <span className="absolute text-[7px] font-black font-mono pt-0.5">10</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsRepeat(!isRepeat)}
                    className={`p-2 rounded-full transition-colors active:scale-90 cursor-pointer ${isRepeat ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                  >
                    <Repeat size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Floating Animated Toast */}
      {toastMessage && createPortal(
        <div className="fixed top-6 inset-x-0 z-[120] flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-black/90 text-emerald-300 border border-emerald-500/50 shadow-2xl px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-xl">
            <Check size={14} className="text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Track Options Modal (Triggered by MoreVertical button) */}
      {showMoreMenu && currentSong && createPortal(
        <div 
          onClick={() => setShowMoreMenu(false)}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm liquid-glass-dock rounded-3xl p-5 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
          >
            {/* Header with Close */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Track Options</h3>
              <button 
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="w-7 h-7 rounded-full liquid-glass-pill flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Track Info Card */}
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 mb-4">
              <img src={getThumbnail(currentSong)} alt={currentSong.name} className="w-12 h-12 rounded-xl object-cover shadow" />
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{currentSong.name}</p>
                <p className="text-[11px] text-white/50 truncate mt-0.5">{getArtistName(currentSong)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowAddToPlaylistModal(true);
                }}
                className="w-full p-3 rounded-2xl liquid-glass-card hover:bg-white/10 flex items-center gap-3 text-white text-xs font-semibold cursor-pointer transition-all active:scale-98"
              >
                <ListPlus size={16} className="text-emerald-400" />
                <span>Add to Playlist</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShare();
                  setShowMoreMenu(false);
                }}
                className="w-full p-3 rounded-2xl liquid-glass-card hover:bg-white/10 flex items-center gap-3 text-white text-xs font-semibold cursor-pointer transition-all active:scale-98"
              >
                <Copy size={16} className="text-emerald-400" />
                <span>Copy ytify Share Link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(`https://www.youtube.com/watch?v=${currentSong.videoId}`, '_blank');
                  setShowMoreMenu(false);
                }}
                className="w-full p-3 rounded-2xl liquid-glass-card hover:bg-white/10 flex items-center gap-3 text-white text-xs font-semibold cursor-pointer transition-all active:scale-98"
              >
                <ExternalLink size={16} className="text-emerald-400" />
                <span>Watch on Ytify</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add To Playlist Modal From Player */}
      {showAddToPlaylistModal && currentSong && createPortal(
        <div 
          onClick={() => setShowAddToPlaylistModal(false)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm liquid-glass-dock rounded-3xl p-5 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListPlus size={18} className="text-emerald-400" />
                <span>Add to Playlist</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddToPlaylistModal(false)}
                className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar mb-4">
              {(!userData.playlists || userData.playlists.length === 0) ? (
                <div className="p-4 text-center text-white/40 text-xs">
                  No playlists created yet. Create one in Library!
                </div>
              ) : (
                userData.playlists.map((pl) => {
                  const alreadyIn = pl.songs && pl.songs.some(s => s.videoId === currentSong.videoId);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (!alreadyIn) {
                          addSongToPlaylist(pl.id, currentSong);
                          showToast(`Added to "${pl.name}"`);
                          setShowAddToPlaylistModal(false);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                        alreadyIn 
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                          : 'liquid-glass-card hover:bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <ListMusic size={16} className={alreadyIn ? 'text-emerald-400' : 'text-white/40'} />
                        <span className="text-sm font-semibold truncate">{pl.name}</span>
                      </div>
                      {alreadyIn ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Plus size={16} className="text-white/40" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};