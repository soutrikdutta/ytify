import React, { useState, useEffect } from 'react';
import type { Song, ExploreSection } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { Play, Sparkles, Flame, Headphones, Moon, Heart, Radio, Music2, ChevronRight, History, Search as SearchIcon } from 'lucide-react';

interface HomeProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying?: boolean;
  onOpenAuth?: () => void;
  onOpenTaste?: () => void;
  onOpenProfile?: () => void;
}

export const Home: React.FC<HomeProps> = ({ 
  onPlaySong, 
  currentSong, 
  isPlaying = false,
  onOpenTaste 
}) => {
  const { user, userData } = useAuth();
  const [activeMood, setActiveMood] = useState('All');

  const userArtists = userData.preferences?.artists || [];
  const getCacheKey = (mood: string, artists: string[]) => `ytify_feed_cached_${artists.join('_')}_${mood}`;

  // Persistent feed state loaded instantly from cache with 0ms delay
  const [sections, setSections] = useState<ExploreSection[]>(() => {
    try {
      const cached = localStorage.getItem(getCacheKey('All', userArtists));
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem(getCacheKey('All', userArtists));
      return !cached;
    } catch {
      return true;
    }
  });

  // Persistent search recommendations shelf loaded instantly from cache
  const [recentSearchSongs, setRecentSearchSongs] = useState<{ query: string; items: Song[] } | null>(() => {
    try {
      const saved = localStorage.getItem('ytify_cached_search_shelf');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const moods = [
    { label: 'All', icon: Sparkles },
    { label: 'Podcasts', icon: Headphones },
    { label: 'Romance', icon: Flame },
    { label: 'Feel good', icon: Sparkles },
    { label: 'Party', icon: Radio },
    { label: 'Relax', icon: Moon },
    { label: 'Commute', icon: Music2 },
    { label: 'Sad', icon: Heart },
    { label: 'Sleep', icon: Moon },
    { label: 'Energize', icon: Flame },
    { label: 'Workout', icon: Flame }
  ];

  // Fetch recent search recommendations without causing layout shifts
  const loadRecentSearchShelf = async () => {
    try {
      const historyStr = localStorage.getItem('ytify_search_history');
      if (historyStr) {
        const history: string[] = JSON.parse(historyStr);
        if (history.length > 0) {
          const latest = history[0];
          // If already cached for this exact query, keep it stable
          if (recentSearchSongs && recentSearchSongs.query.toLowerCase() === latest.toLowerCase()) {
            return;
          }
          const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(latest)}`));
          const data = await res.json();
          if (data && data.songs && data.songs.length > 0) {
            const shelfObj = {
              query: latest,
              items: data.songs.slice(0, 8)
            };
            setRecentSearchSongs(shelfObj);
            try {
              localStorage.setItem('ytify_cached_search_shelf', JSON.stringify(shelfObj));
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Recent search shelf notice:', e);
    }
  };

  useEffect(() => {
    loadRecentSearchShelf();
    const handleSearchDone = () => loadRecentSearchShelf();
    window.addEventListener('ytify_search_performed', handleSearchDone);
    return () => window.removeEventListener('ytify_search_performed', handleSearchDone);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [activeMood, userData.preferences]);

  const fetchFeed = async () => {
    const cacheKey = getCacheKey(activeMood, userArtists);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          setSections(parsed);
          setLoading(false);
        }
      } catch {}
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (activeMood !== 'All') {
        params.set('mood', activeMood);
      } else if (userArtists.length > 0) {
        params.set('artists', userArtists.join(','));
      }

      const res = await fetch(apiUrl(`/api/feed?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        if (data && data.sections && data.sections.length > 0) {
          setSections(data.sections);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data.sections));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
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

  return (
    <div className="pb-48 px-2 sm:px-4 pt-3 w-full max-w-7xl mx-auto">
      {/* Recommendation Onboarding Taste Banner */}
      <div
        onClick={onOpenTaste}
        className="mb-5 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl liquid-glass-card border border-emerald-500/25 flex items-center justify-between cursor-pointer group hover:bg-white/[0.08] hover:border-emerald-500/40 active:scale-[0.99] transition-all duration-300 shadow-lg"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#991b1b] to-[#15803d] flex items-center justify-center text-white flex-shrink-0 shadow">
            <Sparkles size={16} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">
              {userArtists.length > 0
                ? `Tuned to: ${userArtists.slice(0, 3).join(', ')}${userArtists.length > 3 ? ` +${userArtists.length - 3}` : ''}`
                : 'Tell us which artists you like'}
            </p>
            <p className="text-[10px] text-emerald-400/80 truncate">
              {userArtists.length > 0
                ? 'Tap to re-tune your recommendations'
                : 'Pick 5+ artists to personalize your feed'}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="text-white/40 group-hover:text-white transition-colors flex-shrink-0" />
      </div>

      {/* YouTube Music Mood Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5 -mx-4 px-4">
        {moods.map((m) => {
          const Icon = m.icon;
          const isActive = activeMood === m.label;
          return (
            <button
              key={m.label}
              onClick={() => setActiveMood(m.label)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                isActive
                  ? 'liquid-segment-active text-white font-bold shadow-lg'
                  : 'liquid-glass-pill text-white/75 hover:text-white'
              }`}
            >
              {Icon && <Icon size={13} className={isActive ? 'text-white' : 'text-emerald-400'} />}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. RELATABLE SHELF: "Listen Again" (Speed Dial from Recent History) - ALWAYS VISIBLE, NEVER HIDDEN BEHIND SPINNER */}
      {activeMood === 'All' && userData.history && userData.history.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <History size={16} className="text-emerald-400" />
              <span>Listen Again</span>
            </h3>
            <span className="text-[11px] text-white/40">Recently Played</span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 pt-1">
            {userData.history.slice(0, 10).map((song, idx) => {
              const isSelectedThis = currentSong?.videoId === song.videoId;
              const isPlayingThis = isPlaying && isSelectedThis;
              return (
                <div
                  key={`hist-${song.videoId}-${idx}`}
                  onClick={() => onPlaySong(song)}
                  className="w-32 flex-shrink-0 cursor-pointer group select-none active:scale-95 transition-all"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-950 border border-white/15 shadow-md mb-2 flex items-center justify-center">
                    <img
                      src={getThumbnail(song)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-50 brightness-75 pointer-events-none"
                    />
                    <img
                      src={getThumbnail(song)}
                      alt={song.name}
                      className="relative z-10 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-500"
                    />
                    {isPlayingThis && (
                      <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3.5">
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-1" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-2" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-3" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 ${isPlayingThis ? 'text-emerald-400' : 'text-white'}`}>
                    {song.name}
                  </h4>
                  <p className="text-[11px] text-white/50 truncate mt-0.5">
                    {getArtistName(song)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. RELATABLE SHELF: "From Your Recent Searches" */}
      {activeMood === 'All' && recentSearchSongs && recentSearchSongs.items.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                <SearchIcon size={10} />
                <span>Based on your recent search</span>
              </span>
              <h3 className="text-base font-black tracking-tight text-white capitalize">
                Similar to "{recentSearchSongs.query}"
              </h3>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 pt-1">
            {recentSearchSongs.items.map((song, idx) => {
              const isSelectedThis = currentSong?.videoId === song.videoId;
              const isPlayingThis = isPlaying && isSelectedThis;
              return (
                <div
                  key={`search-shelf-${song.videoId}-${idx}`}
                  onClick={() => onPlaySong(song)}
                  className="w-34 flex-shrink-0 cursor-pointer group select-none active:scale-95 transition-all"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-950 border border-white/15 shadow-md mb-2 flex items-center justify-center">
                    <img
                      src={getThumbnail(song)}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-50 brightness-75 pointer-events-none"
                    />
                    <img
                      src={getThumbnail(song)}
                      alt={song.name}
                      className="relative z-10 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-500"
                    />
                    {isPlayingThis && (
                      <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                        <div className="flex items-end gap-[2px] h-3.5">
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-1" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-2" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-3" />
                          <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className={`text-xs font-bold line-clamp-1 ${isPlayingThis ? 'text-emerald-400' : 'text-white'}`}>
                    {song.name}
                  </h4>
                  <p className="text-[11px] text-white/50 truncate mt-0.5">
                    {getArtistName(song)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Feed Shelves (Quick Picks, Artist Highlights, Moods) */}
      {loading && sections.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-white/40 gap-3">
          <div className="w-8 h-8 border-2 border-[#16a34a] border-t-[#991b1b] rounded-full animate-spin" />
          <p className="text-xs tracking-wider uppercase text-white/50 font-medium">Curating your mix...</p>
        </div>
      ) : (
        <div className="space-y-7 animate-in fade-in duration-200">

          {/* 3. Personalized Quick Picks 2x2 Grid */}
          {sections.length > 0 && sections[0].items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                    {user?.name ? user.name.toUpperCase() : 'FOR YOU'}
                  </span>
                  <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                    {sections[0].title}
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {sections[0].items.slice(0, 8).map((song) => {
                  const isPlayingThis = currentSong?.videoId === song.videoId;
                  return (
                    <div
                      key={song.videoId}
                      onClick={() => onPlaySong(song)}
                      className={`flex items-center gap-3 liquid-glass-card rounded-2xl overflow-hidden cursor-pointer p-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 group ${
                        isPlayingThis ? 'border-[#15803d]/60 bg-[#15803d]/20 shadow-[0_4px_20px_rgba(21,128,61,0.2)]' : 'hover:bg-white/10'
                      }`}
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
                        <img
                          src={getThumbnail(song)}
                          alt={song.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200 ${isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Play size={16} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="overflow-hidden flex-1 pr-1">
                        <p className={`text-xs sm:text-sm font-bold truncate leading-tight ${isPlayingThis ? 'text-emerald-400' : 'text-white'}`}>
                          {song.name}
                        </p>
                        <p className="text-[11px] text-white/50 truncate mt-1 font-medium">
                          {getArtistName(song)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. All Curated & Personalized Shelves */}
          {sections.map((section, sIdx) => {
            if (sIdx === 0 && sections.length > 1) return null;
            return (
              <div key={sIdx}>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    {section.title}
                  </h3>
                </div>

                {/* Responsive Horizontal Scroll Carousel with Rich Desktop Sizing */}
                <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar -mx-2 sm:-mx-4 px-2 sm:px-4 pb-3 pt-1">
                  {section.items.map((song) => {
                    const isSelectedThis = currentSong?.videoId === song.videoId;
                    const isPlayingThis = isPlaying && isSelectedThis;
                    return (
                      <div
                        key={song.videoId}
                        onClick={() => onPlaySong(song)}
                        className="w-36 sm:w-44 md:w-48 lg:w-52 flex-shrink-0 cursor-pointer group select-none active:scale-95 transition-all duration-300 hover:-translate-y-1.5"
                      >
                        <div className="relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-950 border border-white/10 group-hover:border-emerald-500/30 shadow-[0_12px_30px_rgba(0,0,0,0.6)] mb-2.5 transition-all duration-300 flex items-center justify-center">
                          {/* Ambient Glowing Backdrop to seamlessly fill the square */}
                          <img
                            src={getThumbnail(song)}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-md scale-110 opacity-50 brightness-75 pointer-events-none"
                          />
                          {/* Complete uncropped thumbnail */}
                          <img
                            src={getThumbnail(song)}
                            alt={song.name}
                            className="relative z-10 w-full h-full object-contain p-0.5 transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

                          <div
                            className={`absolute bottom-3 right-3 transition-all duration-300 ${
                              isPlayingThis
                                ? 'opacity-100 scale-100'
                                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(21,128,61,0.6)] border border-white/20 transition-transform active:scale-95">
                              {isPlayingThis ? (
                                <div className="flex items-end gap-[2px] h-3.5">
                                  <div className="w-[2px] bg-white rounded-full animate-eq-1" />
                                  <div className="w-[2px] bg-white rounded-full animate-eq-2" />
                                  <div className="w-[2px] bg-white rounded-full animate-eq-3" />
                                  <div className="w-[2px] bg-white rounded-full animate-eq-4" />
                                </div>
                              ) : (
                                <Play size={17} fill="white" className="ml-0.5 text-white" />
                              )}
                            </div>
                          </div>
                        </div>

                        <h4
                          className={`text-xs sm:text-sm font-semibold line-clamp-2 leading-tight transition-colors ${
                            isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white/90 group-hover:text-white'
                          }`}
                        >
                          {song.name}
                        </h4>
                        <p className="text-[11px] sm:text-xs text-white/50 truncate mt-1">
                          {getArtistName(song)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
