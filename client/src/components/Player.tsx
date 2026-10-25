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
  isShuffle?: boolean;
  onToggleShuffle?: () => void;
  onClosePlayer?: () => void;
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
  onShuffleQueue,
  isShuffle: propIsShuffle,
  onToggleShuffle,
  onClosePlayer
}) => {
  const { toggleLike, isLiked, userData, addSongToPlaylist } = useAuth();
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isHeaderDragging, setIsHeaderDragging] = useState(false);
  const headerDragStartY = useRef(0);
  const [showQueue, setShowQueue] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [localShuffle, setLocalShuffle] = useState(false);
  const isShuffle = propIsShuffle !== undefined ? propIsShuffle : localShuffle;
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
    if (onToggleShuffle) {
      onToggleShuffle();
      showToast(!isShuffle ? 'Shuffle enabled' : 'Shuffle off');
    } else {
      const nextState = !localShuffle;
      setLocalShuffle(nextState);
      if (onShuffleQueue) {
        onShuffleQueue();
      }
      showToast(nextState ? 'Shuffle enabled' : 'Shuffle off');
    }
  };

  useEffect(() => {
    if (autoExpand) {
      setIsClosing(false);
      setShowQueue(false);
      setShowMoreMenu(false);
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
    setShowQueue(false);
    setShowMoreMenu(false);
    setDragY(0);
    setIsExpanded(true);
  };

  const closeExpanded = () => {
    if (isClosing) return;
    setIsClosing(true);
    setShowQueue(false);
    setShowMoreMenu(false);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
      setShowQueue(false);
      setShowMoreMenu(false);
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
    setIsHeaderDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (dragY > 120) {
      closeExpanded();
    } else {
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
    const shareUrl = `${window.location.origin}/?v=${currentSong.videoId}`;
    const shareText = `🎵 Listening to "${currentSong.name}" on ytify!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentSong.name,
          text: shareText,
          url: shareUrl
        });
        showToast('Shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard?.writeText(text);
      showToast('Share link copied to clipboard!');
    } catch {
      showToast('Link: ' + text);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getArtistName = (song: Song | null) => {
    if (!song) return 'Unknown Artist';
    if (typeof song.artist === 'string') return song.artist;
    if (song.artist && song.artist.name) return song.artist.name;
    if (song.artists && song.artists.length > 0) return song.artists.map((a) => a.name).join(', ');
    return 'Unknown Artist';
  };

  const getThumbnail = (song: Song | null) => {
    if (!song) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
    if (song.thumbnails && Array.isArray(song.thumbnails) && song.thumbnails.length > 0) {
      const best = song.thumbnails[song.thumbnails.length - 1];
      if (best && typeof best === 'object' && best.url) return best.url;
      if (typeof best === 'string') return best;
    }
    if (song.videoId) {
      return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
    }
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
  };

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isCurrentLiked = isLiked(currentSong.videoId);

  return (
    <>
      {/* 
        DESKTOP PERSISTENT LUXURY BOTTOM BAR (MD+)
      */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 bg-[#0a0a10]/95 backdrop-blur-3xl border-t border-white/10 z-50 items-center justify-between px-6 select-none shadow-[0_-10px_40px_rgba(0,0,0,0.85)]">
        {/* Left: Track Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          <div 
            onClick={openExpanded}
            className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 cursor-pointer group border border-white/10"
          >
            <img 
              src={getThumbnail(currentSong)} 
              alt={currentSong.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white" />
            </div>
          </div>

          <div className="overflow-hidden pr-2">
            <h4 
              onClick={openExpanded}
              className="text-white text-sm font-bold truncate cursor-pointer hover:underline"
            >
              {currentSong.name}
            </h4>
            <p className="text-white/50 text-xs truncate mt-0.5">
              {getArtistName(currentSong)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleLike(currentSong)}
            className="p-2 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title={isCurrentLiked ? "Liked" : "Like"}
          >
            <Heart 
              size={18} 
              className={isCurrentLiked ? "text-rose-500 fill-rose-500 animate-pulse-subtle" : "hover:text-rose-400"} 
            />
          </button>
        </div>

        {/* Center: Playback Controls & Scrubber */}
        <div className="flex flex-col items-center max-w-xl w-2/4 px-4">
          <div className="flex items-center gap-5 mb-1.5">
            <button
              type="button"
              onClick={handleShuffleClick}
              className={`p-2 rounded-full transition-colors cursor-pointer ${isShuffle ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="p-2 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer active:scale-90"
              title="Previous"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="p-2 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer active:scale-90"
              title="Next"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>

            <button
              type="button"
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${isRepeat ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
              title="Repeat"
            >
              <Repeat size={16} />
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className="w-full flex items-center gap-3 text-xs text-white/40 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1.5 bg-white/10 hover:h-2 rounded-full cursor-pointer relative group transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                onSeek(pos * (duration || 1));
              }}
            >
              <div 
                className="h-full bg-emerald-500 rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow" />
              </div>
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Sound & Action Tools */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
          {/* Dolby Atmos Indicator Pill */}
          {dolbyEnabled && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold tracking-wider font-mono">
              <Waves size={11} className="animate-pulse" />
              <span>DOLBY</span>
            </div>
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-2 group/vol">
            <button 
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-white/50 hover:text-white cursor-pointer"
            >
              {isMuted || currentVol === 0 ? (
                <VolumeX size={18} className="text-rose-400" />
              ) : currentVol < 40 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
            <input 
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : currentVol}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-20 h-1 bg-white/15 accent-emerald-500 rounded-lg cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={openExpanded}
            className="p-2 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Expand Player"
          >
            <Maximize2 size={17} />
          </button>
        </div>
      </div>

      {/* 
        MOBILE FLOATING MINI PLAYER CAPSULE (VISIBLE ON MOBILE ONLY)
      */}
      <div 
        onClick={openExpanded}
        className="md:hidden w-full liquid-glass-dock rounded-[26px] p-2 pr-3.5 flex items-center justify-between cursor-pointer select-none active:scale-[0.985] transition-all relative overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.85)] group border border-white/15"
      >
        {/* Dynamic Equalizer Glow Aura */}
        <div className="absolute -left-10 top-0 bottom-0 w-32 bg-emerald-500/15 blur-2xl pointer-events-none -z-10 group-hover:bg-emerald-500/25 transition-all" />

        {/* Thin Live Refined Scrubber Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#16a34a] relative transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          >
            {isPlaying && (
              <div className="absolute inset-0 bg-white/40 animate-scrubber-shimmer" />
            )}
          </div>
        </div>

        {/* Left: Thumbnail & Title */}
        <div className="flex items-center gap-3 overflow-hidden pr-2">
          <div className="relative w-11 h-11 rounded-[16px] overflow-hidden flex-shrink-0 shadow-md border border-white/15">
            <img 
              src={getThumbnail(currentSong)} 
              alt={currentSong.name} 
              className="w-full h-full object-cover" 
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-0.5">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-1" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-2" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-3" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-eq-4" />
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h4 className="text-white text-xs font-bold truncate leading-tight">
                {currentSong.name}
              </h4>
              {dolbyEnabled && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                  ATMOS
                </span>
              )}
            </div>
            <p className="text-white/50 text-[11px] truncate mt-0.5 font-medium">
              {getArtistName(currentSong)}
            </p>
          </div>
        </div>

        {/* Right: Quick Play/Pause & Next Button */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleLike(currentSong)}
            className="p-2 rounded-full text-white/50 hover:text-white cursor-pointer transition-colors"
          >
            <Heart 
              size={17} 
              className={isCurrentLiked ? "text-rose-500 fill-rose-500 animate-pulse-subtle" : ""} 
            />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className="w-9 h-9 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="p-2 rounded-full text-white/60 hover:text-white cursor-pointer active:scale-90 transition-transform"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* 
        EXPANDED IMMERSIVE FULL-SCREEN PLAYER MODAL (PORTAL)
      */}
      {isExpanded && createPortal(
        <div 
          className={`fixed inset-0 z-[100] flex flex-col justify-end bg-black/80 backdrop-blur-2xl transition-opacity duration-300 ${
            isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          onClick={closeExpanded}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translate3d(0, ${Math.max(0, dragY)}px, 0)`,
              transition: isHeaderDragging ? 'none' : 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className={`w-full h-full max-h-screen bg-[#07070d] text-white flex flex-col overflow-hidden relative select-none ${
              isClosing ? 'player-sheet-exit' : 'player-sheet-enter'
            }`}
          >
            {/* Dynamic Background Album Glow Overlay */}
            <div 
              className="absolute inset-0 opacity-25 filter blur-3xl pointer-events-none -z-10 scale-125"
              style={{
                backgroundImage: `url(${getThumbnail(currentSong)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />

            {/* Top Drag Handle Bar */}
            <div 
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
              onPointerCancel={handleHeaderPointerUp}
              className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mb-3" />
              <div className="w-full px-5 flex items-center justify-between">
                <button 
                  type="button"
                  onClick={closeExpanded}
                  className="w-9 h-9 rounded-full liquid-glass-pill flex items-center justify-center text-white/70 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  <ChevronDown size={20} />
                </button>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] tracking-widest uppercase font-mono text-white/40">PLAYING FROM</span>
                  <span className="text-xs font-bold text-white/80 truncate max-w-[180px]">
                    {showQueue ? 'Up Next Queue' : (queue.length > 1 ? 'Playlist / Stream' : 'Single Track')}
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowMoreMenu(true)}
                  className="w-9 h-9 rounded-full liquid-glass-pill flex items-center justify-center text-white/70 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Main Interactive Center Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
              {!showQueue ? (
                /* Artwork Display Mode */
                <div className="w-full max-w-sm flex flex-col items-center">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/15 mb-6 player-stagger-1 animate-artwork-float">
                    <img 
                      src={getThumbnail(currentSong)} 
                      alt={currentSong.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  {/* Title & Artist & Like Button */}
                  <div className="w-full flex items-center justify-between mb-4 player-stagger-2">
                    <div className="overflow-hidden pr-3">
                      <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                        {currentSong.name}
                      </h2>
                      <p className="text-sm font-semibold text-white/50 truncate mt-0.5">
                        {getArtistName(currentSong)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLike(currentSong)}
                      className="p-3 rounded-2xl liquid-glass-pill text-white/60 hover:text-white cursor-pointer active:scale-90 transition-transform flex-shrink-0"
                    >
                      <Heart 
                        size={22} 
                        className={isCurrentLiked ? "text-rose-500 fill-rose-500 animate-pulse-subtle" : ""} 
                      />
                    </button>
                  </div>

                  {/* Scrubber & Timers */}
                  <div className="w-full mb-6 player-stagger-3">
                    <div 
                      className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative group transition-all"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        onSeek(pos * (duration || 1));
                      }}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-[#16a34a] rounded-full relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono text-white/40 mt-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Primary Playback Buttons */}
                  <div className="w-full flex items-center justify-between mb-6 player-stagger-4">
                    <button
                      type="button"
                      onClick={handleShuffleClick}
                      className={`p-3 rounded-full transition-colors cursor-pointer ${isShuffle ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                      title="Shuffle"
                    >
                      <Shuffle size={20} />
                    </button>

                    <button
                      type="button"
                      onClick={onPrev}
                      className="p-3 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer active:scale-90"
                      title="Previous"
                    >
                      <SkipBack size={26} fill="currentColor" />
                    </button>

                    <button
                      type="button"
                      onClick={onPlayPause}
                      className="w-16 h-16 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={onNext}
                      className="p-3 rounded-full text-white/70 hover:text-white transition-colors cursor-pointer active:scale-90"
                      title="Next"
                    >
                      <SkipForward size={26} fill="currentColor" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={`p-3 rounded-full transition-colors cursor-pointer ${isRepeat ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}
                      title="Repeat"
                    >
                      <Repeat size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Up Next Queue Mode */
                <div className="w-full h-full flex flex-col max-w-md pt-2">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                      <ListMusic size={16} className="text-emerald-400" />
                      <span>Up Next Queue ({queue.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowQueue(false)}
                      className="text-xs text-emerald-400 font-semibold hover:underline"
                    >
                      Back to Now Playing
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {queue.map((song, idx) => {
                      const isThisPlaying = song.videoId === currentSong.videoId;
                      return (
                        <div
                          key={`${song.videoId}_${idx}`}
                          onClick={() => onPlaySong(song)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                            isThisPlaying 
                              ? 'bg-emerald-500/15 border border-emerald-500/30' 
                              : 'liquid-glass-card hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <span className="text-xs font-mono text-white/30 w-5 text-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <img 
                              src={getThumbnail(song)} 
                              alt={song.name} 
                              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            />
                            <div className="overflow-hidden">
                              <h5 className={`text-xs font-bold truncate ${isThisPlaying ? 'text-emerald-300' : 'text-white'}`}>
                                {song.name}
                              </h5>
                              <p className="text-[11px] text-white/40 truncate mt-0.5">
                                {getArtistName(song)}
                              </p>
                            </div>
                          </div>

                          {isThisPlaying && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                              Playing
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Utility Bar */}
            <div className="w-full px-6 py-4 flex items-center justify-between border-t border-white/5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowAddToPlaylistModal(true)}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white cursor-pointer"
              >
                <ListPlus size={16} />
                <span>Add to Playlist</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQueue(!showQueue)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  showQueue ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'liquid-glass-pill text-white/70'
                }`}
              >
                <ListMusic size={15} />
                <span>{showQueue ? 'Close Queue' : 'Up Next'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Animated Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-full bg-neutral-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-white text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* More Options Modal */}
      {showMoreMenu && currentSong && createPortal(
        <div 
          onClick={() => setShowMoreMenu(false)}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm liquid-glass-dock rounded-3xl p-5 border border-white/20 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <img 
                  src={getThumbnail(currentSong)} 
                  alt={currentSong.name} 
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="overflow-hidden">
                  <h4 className="text-white text-xs font-bold truncate">{currentSong.name}</h4>
                  <p className="text-white/40 text-[11px] truncate mt-0.5">{getArtistName(currentSong)}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

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
