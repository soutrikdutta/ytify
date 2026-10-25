import React, { useState, useEffect } from 'react';
import type { Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { 
  Compass, 
  Flame, 
  Disc, 
  Radio, 
  Mic2, 
  Sparkles, 
  Play, 
  Heart, 
  ListPlus, 
  Check, 
  ListMusic, 
  X,
  TrendingUp
} from 'lucide-react';

interface ExploreProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying?: boolean;
}

export const Explore: React.FC<ExploreProps> = ({ onPlaySong, currentSong, isPlaying = false }) => {
  const { toggleLike, isLiked, userData, addSongToPlaylist } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('trending');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((c) => (c === msg ? null : c));
    }, 2800);
  };

  const categories = [
    { 
      id: 'trending', 
      label: 'Trending Music', 
      icon: Flame, 
      query: 'chart=mostPopular',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      gradient: 'from-rose-900/90 via-red-950/80 to-black/90',
      accent: '#ef4444',
      badge: 'VIRAL CHARTS',
      description: 'The hottest tracks going viral worldwide right now'
    },
    { 
      id: 'new', 
      label: 'New Releases', 
      icon: Sparkles, 
      query: 'New Music Releases 2026',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      gradient: 'from-emerald-900/90 via-teal-950/80 to-black/90',
      accent: '#10b981',
      badge: 'FRESH DROPS',
      description: 'Brand new singles, EPs, and major album releases'
    },
    { 
      id: 'global50', 
      label: 'Global Top 50', 
      icon: Disc, 
      query: 'Global Top 50 Songs',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
      gradient: 'from-cyan-900/90 via-blue-950/80 to-black/90',
      accent: '#06b6d4',
      badge: 'WORLDWIDE TOP 50',
      description: 'Most-streamed songs across all countries this week'
    },
    { 
      id: 'charts', 
      label: 'Billboard Hot 100', 
      icon: Radio, 
      query: 'Billboard Hot 100 Songs',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
      gradient: 'from-amber-900/90 via-yellow-950/80 to-black/90',
      accent: '#f59e0b',
      badge: 'HOT 100',
      description: 'The official definitive chart of the biggest songs'
    },
    { 
      id: 'podcasts', 
      label: 'Podcasts & Talk', 
      icon: Mic2, 
      query: 'Popular Podcasts',
      image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
      gradient: 'from-purple-900/90 via-indigo-950/80 to-black/90',
      accent: '#a855f7',
      badge: 'TOP PODCASTS',
      description: 'Engaging conversations, culture, stories, and comedy'
    },
  ];

  const currentCat = categories.find((c) => c.id === activeCategory) || categories[0];

  useEffect(() => {
    loadCategory(activeCategory);
  }, [activeCategory]);

  const loadCategory = async (catId: string) => {
    const cacheKey = `ytify_explore_${catId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setSongs(JSON.parse(cached));
        setLoading(false);
      } catch {}
    } else {
      setLoading(true);
    }

    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    try {
      // Fetch official live YouTube Music Trending & Charts
      const res = await fetch(apiUrl(`/api/trending?chart=${encodeURIComponent(catId)}`));
      const data = await res.json();
      if (data && data.songs && data.songs.length > 0) {
        setSongs(data.songs);
        sessionStorage.setItem(cacheKey, JSON.stringify(data.songs));
      }
    } catch (e) {
      console.error('Explore load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getArtistName = (song: Song) => {
    if (typeof song.artist === 'string') return song.artist;
    if (song.artist && song.artist.name) return song.artist.name;
    if (song.artists && song.artists.length > 0) return song.artists.map((a) => a.name).join(', ');
    return 'Artist';
  };

  const getThumbnail = (song: Song) => {
    if (song.thumbnails && song.thumbnails.length > 0) {
      return song.thumbnails[song.thumbnails.length - 1].url;
    }
    return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
  };

  const topSong = songs.length > 0 ? songs[0] : null;

  return (
    <div className="pb-48 px-3.5 sm:px-6 pt-3 w-full max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Compass size={24} className="text-[#16a34a]" />
          <span>Explore & Charts</span>
        </h2>
        <span className="text-[11px] font-bold text-white/40 tracking-wider uppercase">
          Live Stream
        </span>
      </div>

      {/* Featured Hero Banner with Rich Artwork */}
      <div className="relative mb-6 rounded-3xl overflow-hidden border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)] group">
        {/* Banner Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={currentCat.image} 
            alt={currentCat.label} 
            className="w-full h-full object-cover filter brightness-75 contrast-110 scale-105 group-hover:scale-110 transition-transform duration-700 ease-out" 
          />
          {/* Gradient Overlay for high text contrast */}
          <div className={`absolute inset-0 bg-gradient-to-t ${currentCat.gradient}`} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Banner Content */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[190px] sm:min-h-[240px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest text-white uppercase border border-white/20">
                {currentCat.badge}
              </span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md mb-1.5">
              {currentCat.label}
            </h3>
            
            <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-md font-medium leading-relaxed">
              {currentCat.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/15">
            <div className="flex items-center gap-2">
              {topSong && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-white/20 shadow flex-shrink-0">
                    <img src={getThumbnail(topSong)} alt={topSong.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="overflow-hidden max-w-[220px] sm:max-w-[320px]">
                    <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">#1 {topSong.name}</p>
                    <p className="text-[11px] text-white/60 truncate leading-none mt-0.5">{getArtistName(topSong)}</p>
                  </div>
                </div>
              )}
            </div>

            {songs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onPlaySong(songs[0]);
                  showToast(`Playing ${currentCat.label}`);
                }}
                className="px-5 py-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer flex-shrink-0"
              >
                <Play size={15} fill="currentColor" className="ml-0.5" />
                <span>Play All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Selection Cards with High-Res Background Images */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 px-1 flex items-center gap-1.5">
          <TrendingUp size={13} className="text-[#16a34a]" />
          <span>Curated Categories</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((c, index) => {
            const Icon = c.icon;
            const isActive = activeCategory === c.id;
            const isLastOdd = index === categories.length - 1 && categories.length % 2 !== 0;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all active:scale-95 flex flex-col justify-between h-24 p-3 group border ${
                  isLastOdd ? 'col-span-2 sm:col-span-1' : ''
                } ${
                  isActive 
                    ? 'border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-400/40' 
                    : 'border-white/10 hover:border-white/25 shadow-md'
                }`}
              >
                {/* Background Card Image */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={c.image} 
                    alt={c.label} 
                    className="w-full h-full object-cover scale-105 group-hover:scale-115 transition-transform duration-500" 
                  />
                  {/* Subtle Gradient Mask for readability */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${c.gradient} opacity-90`} />
                  <div className="absolute inset-0 bg-black/30" />
                </div>

                {/* Top Row: Title */}
                <div className="relative z-10 flex items-start justify-between">
                  <span className={`font-black text-xs leading-tight drop-shadow-md ${isActive ? 'text-white' : 'text-white/90'}`}>
                    {c.label}
                  </span>
                </div>

                {/* Bottom Row: Icon + Subtitle */}
                <div className="relative z-10 flex items-end justify-between">
                  <span className="text-[10px] text-white/70 font-semibold tracking-wide drop-shadow">
                    {c.badge}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md ${isActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-black/40 text-white/80'}`}>
                    <Icon size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Track List for the Selected Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">
              {currentCat.label} Tracks
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            {songs.length} Tracks
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-white/40 gap-3">
            <div className="w-8 h-8 border-2 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading Ytify Chart...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {songs.map((song, idx) => {
              const isSelectedThis = currentSong?.videoId === song.videoId;
              const isPlayingThis = isPlaying && isSelectedThis;
              return (
                <div
                  key={`${song.videoId}-${idx}`}
                  onClick={() => onPlaySong(song)}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all select-none active:scale-[0.98] ${
                    isPlayingThis 
                      ? 'bg-gradient-to-r from-red-600/15 via-[#15803d]/15 to-transparent border border-[#15803d]/50 text-emerald-400' 
                      : 'liquid-glass-card hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-mono font-bold text-white/30 w-5 text-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  
                  {/* Thumbnail with duration and live jumping equalizer */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow border border-white/10">
                    <img src={getThumbnail(song)} alt={song.name} className="w-full h-full object-cover" />
                    {song.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-[9px] font-mono text-white/90 px-1 py-0.2 rounded font-bold">
                        {song.duration}
                      </span>
                    )}
                    {isPlayingThis && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3.5">
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-1" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-2" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-3" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-4" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Song title and artist */}
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                      {song.name}
                    </p>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {getArtistName(song)}
                    </p>
                  </div>

                  {/* Working Action Buttons: Like & Add to Playlist */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song);
                        showToast(isLiked(song.videoId) ? 'Removed from Liked Songs' : 'Saved to Liked Songs ❤️');
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-rose-400 active:scale-90 transition-all cursor-pointer"
                      title="Like"
                    >
                      <Heart 
                        size={15} 
                        fill={isLiked(song.videoId) ? '#f43f5e' : 'none'} 
                        className={isLiked(song.videoId) ? 'text-rose-500' : ''} 
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongToAddToPlaylist(song);
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white active:scale-90 transition-all cursor-pointer"
                      title="Add to Playlist"
                    >
                      <ListPlus size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add To Playlist Modal */}
      {songToAddToPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm liquid-glass-dock rounded-3xl p-6 border border-white/15 shadow-2xl">
            <button
              type="button"
              onClick={() => setSongToAddToPlaylist(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Add to Playlist</h3>
            <p className="text-xs text-white/50 truncate mb-4">{songToAddToPlaylist.name}</p>

            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-1">
              {userData.playlists && userData.playlists.length > 0 ? (
                userData.playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={async () => {
                      await addSongToPlaylist(pl.id, songToAddToPlaylist);
                      showToast(`Added to "${pl.name}"`);
                      setSongToAddToPlaylist(null);
                    }}
                    className="w-full p-3 rounded-2xl liquid-glass-card hover:bg-white/10 flex items-center justify-between text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <ListMusic size={16} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-xs font-semibold text-white truncate">{pl.name}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0">
                      {pl.songs.length} tracks
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 text-center text-xs text-white/40">
                  No custom playlists yet. Create one in your Library.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Toast */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-neutral-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-2 text-white text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
