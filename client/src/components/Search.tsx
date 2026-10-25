import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../api';
import { 
  Search as SearchIcon, 
  X, 
  Play, 
  Clock, 
  Eye, 
  Trash2, 
  History, 
  Heart, 
  ListPlus, 
  Check, 
  ListMusic, 
  Plus,
  Disc,
  Mic2,
  CheckCircle2,
  Shuffle,
  ArrowUpLeft,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface SearchProps {
  onPlaySong: (song: Song) => void;
  onPlayPlaylist?: (songs: Song[], startIndex?: number) => void;
  currentSong: Song | null;
  isPlaying?: boolean;
}

export const Search: React.FC<SearchProps> = ({ onPlaySong, onPlayPlaylist, currentSong, isPlaying = false }) => {
  const { 
    toggleLike, 
    isLiked, 
    userData, 
    addSongToPlaylist,
    addSearchHistory,
    removeSearchHistory,
    clearSearchHistory: clearGlobalSearchHistory
  } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [onlinePlaylists, setOnlinePlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'songs' | 'artists' | 'playlists'>('songs');
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(c => c === msg ? null : c);
    }, 2800);
  };

  // Google Account Synced Search History (stored in Firestore per account)
  const searchHistory = userData.searchHistory || [];

  // Real-time YouTube / Google Autocomplete Suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Live autocomplete search suggestions (YouTube / Google Search API)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/suggestions?q=${encodeURIComponent(trimmed)}`));
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
            setShowSuggestions(data.suggestions.length > 0);
            setSelectedIndex(-1);
          }
        }
      } catch (err) {
        console.warn('Suggestions fetch error:', err);
      }
    }, 120);

    return () => clearTimeout(debounceTimerRef.current);
  }, [query]);

  // Dismiss suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Lock body scroll and prevent background horizontal shift/rubber-banding when playlist modal is open
  useEffect(() => {
    if (selectedPlaylist) {
      const scrollY = window.scrollY;
      const prevOverflow = document.body.style.overflow;
      const prevPosition = document.body.style.position;
      const prevWidth = document.body.style.width;
      const prevTop = document.body.style.top;
      const prevLeft = document.body.style.left;
      const prevRight = document.body.style.right;
      const prevTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.position = prevPosition;
        document.body.style.width = prevWidth;
        document.body.style.top = prevTop;
        document.body.style.left = prevLeft;
        document.body.style.right = prevRight;
        document.body.style.touchAction = prevTouchAction;
        window.scrollTo(0, scrollY);
      };
    }
  }, [selectedPlaylist]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 < 0 ? suggestions.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          const chosen = suggestions[selectedIndex];
          setQuery(chosen);
          setShowSuggestions(false);
          performSearch(chosen);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const performSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setLoading(true);
    setShowSuggestions(false);
    setHasSearched(true);
    setActiveFilter('songs');

    // Blur input on mobile devices to collapse the keyboard immediately
    if (inputRef.current) {
      inputRef.current.blur();
    }

    try {
      // 1. Save to Google account synced search history
      addSearchHistory(trimmed);

      // 2. Fetch search results
      const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(trimmed)}`));
      if (!res.ok) throw new Error('Search request failed');
      const data = await res.json();
      
      const songResults = Array.isArray(data) ? data : (data?.songs || []);
      setResults(songResults);

      // 3. Simultaneously fetch matching community playlists
      try {
        const plRes = await fetch(apiUrl(`/api/search/playlists?q=${encodeURIComponent(trimmed)}`));
        if (plRes.ok) {
          const plData = await plRes.json();
          setOnlinePlaylists(Array.isArray(plData) ? plData : (plData?.playlists || []));
        }
      } catch (e) {
        console.warn('Playlist search error:', e);
      }
    } catch (err) {
      console.error(err);
      showToast('Search encountered a temporary error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  // In-memory cache for loaded playlist songs to prevent duplicate fetches
  const playlistCacheRef = useRef<Map<string, { playlist: any; songs: Song[] }>>(new Map());

  const handleOpenPlaylist = async (pl: any) => {
    setSelectedPlaylist(pl);

    // 1. Check in-memory cache first for instant opening
    if (playlistCacheRef.current.has(pl.id)) {
      const cached = playlistCacheRef.current.get(pl.id)!;
      setSelectedPlaylist(cached.playlist);
      setPlaylistSongs(cached.songs);
      setLoadingPlaylist(false);
      return;
    }

    // 2. If it's a user's own custom playlist, load songs directly from userData
    if (pl.id && pl.id.startsWith('pl_')) {
      const local = userData.playlists.find(p => p.id === pl.id);
      if (local && local.songs) {
        setPlaylistSongs(local.songs);
        playlistCacheRef.current.set(pl.id, { playlist: pl, songs: local.songs });
        return;
      }
    }

    // 3. Otherwise fetch from YouTube Music API
    setLoadingPlaylist(true);
    setPlaylistSongs([]);

    try {
      const res = await fetch(apiUrl(`/api/playlist?id=${encodeURIComponent(pl.id)}`));
      if (res.ok) {
        const data = await res.json();
        const songs = data?.playlist?.songs || [];
        const fullPlaylist = {
          ...pl,
          ...(data.playlist || {}),
          songCount: data.playlist?.songCount || songs.length || pl.songCount
        };
        setSelectedPlaylist(fullPlaylist);
        setPlaylistSongs(songs);
        playlistCacheRef.current.set(pl.id, { playlist: fullPlaylist, songs });
      } else {
        showToast('Could not load playlist tracks.');
      }
    } catch (err) {
      console.warn('Playlist tracks fetch error:', err);
      showToast('Error loading playlist.');
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handlePlayEntirePlaylist = async (pl: any, shuffle = false) => {
    let songs = playlistSongs;

    // If modal is not open yet, fetch on the fly
    if (!songs || songs.length === 0) {
      if (playlistCacheRef.current.has(pl.id)) {
        songs = playlistCacheRef.current.get(pl.id)!.songs;
      } else if (pl.id?.startsWith('pl_')) {
        const local = userData.playlists.find(p => p.id === pl.id);
        songs = local?.songs || [];
      }
    }

    if (!songs || songs.length === 0) {
      showToast('Loading playlist tracks...');
      try {
        const res = await fetch(apiUrl(`/api/playlist?id=${encodeURIComponent(pl.id)}`));
        const data = await res.json();
        if (data?.playlist?.songs && data.playlist.songs.length > 0) {
          songs = data.playlist.songs;
          const fullPl = { ...pl, ...data.playlist };
          setPlaylistSongs(songs);
          setSelectedPlaylist(fullPl);
          playlistCacheRef.current.set(pl.id, { playlist: fullPl, songs });
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!songs || songs.length === 0) {
      showToast('Could not load songs for this playlist');
      return;
    }

    const list = [...songs];
    if (shuffle) {
      list.sort(() => Math.random() - 0.5);
    }

    if (onPlayPlaylist) {
      onPlayPlaylist(list, 0);
    } else {
      onPlaySong(list[0]);
    }
    showToast(`Playing "${pl.title}" (${list.length} tracks) 🎵`);
  };

  const getArtistName = (song: Song | null) => {
    if (!song) return 'Artist';
    if (typeof song.artist === 'string') return song.artist;
    if (song.artist && song.artist.name) return song.artist.name;
    if (song.artists && song.artists.length > 0) return song.artists.map((a) => a.name).join(', ');
    return 'Artist';
  };

  const getThumbnail = (song: Song | null) => {
    if (!song) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
    if (song.thumbnails && Array.isArray(song.thumbnails) && song.thumbnails.length > 0) {
      const last = song.thumbnails[song.thumbnails.length - 1];
      if (last && typeof last === 'object' && last.url) return last.url;
      if (typeof last === 'string') return last;
    }
    if (song.videoId) {
      return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
    }
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
  };

  // Group songs by artist for the 'artists' filter tab
  const artistMap = new Map<string, Song[]>();
  results.forEach(song => {
    const aName = getArtistName(song);
    if (!artistMap.has(aName)) {
      artistMap.set(aName, []);
    }
    artistMap.get(aName)!.push(song);
  });
  const primaryArtist = Array.from(artistMap.entries())[0] || null;

  // Custom Playlists matching query + Curated playlist bundles for the 'playlists' filter tab
  const matchingCustomPlaylists = (userData.playlists || []).filter(pl => 
    !query || pl.name.toLowerCase().includes(query.toLowerCase())
  );

  const topResult = results[0];
  const otherResults = results.slice(1);

  return (
    <div className="pb-48 px-3.5 sm:px-6 pt-3 w-full max-w-7xl mx-auto">
      {/* Search Input Bar with Live YouTube / Google Autocomplete Engine */}
      <div ref={searchContainerRef} className="relative mb-4 max-w-3xl mx-auto z-30">
        <form onSubmit={(e) => handleSearch(e)} className="relative flex items-center">
          <SearchIcon className="absolute left-4 text-white/40 pointer-events-none" size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search all songs, artists, playlists..."
            className="w-full liquid-glass-card text-white placeholder-white/35 pl-11 pr-28 sm:pr-32 py-3.5 rounded-2xl text-sm outline-none focus:border-emerald-500/60 transition-all shadow-lg"
          />

          {/* Quick Clear (X) cross button when query is present */}
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setQuery('');
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="absolute right-20 sm:right-22 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer z-10"
              title="Clear search text"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

          {/* Dedicated Tactile Search Button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#15803d] hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5 z-10"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>

        {/* Live Autocomplete Suggestions Dropdown (Identical to YouTube & Google Search) */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 liquid-glass-dock rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl bg-[#080812]/95 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {suggestions.map((suggestion, idx) => {
              const isSelected = selectedIndex === idx;
              const matchIdx = suggestion.toLowerCase().indexOf(query.toLowerCase());
              return (
                <div
                  key={suggestion}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/10 text-white font-bold' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <SearchIcon size={14} className="text-white/35 flex-shrink-0" />
                    <span className="truncate">
                      {matchIdx >= 0 ? (
                        <>
                          <span className="text-white/40">{suggestion.slice(0, matchIdx)}</span>
                          <span className="text-white font-bold underline decoration-emerald-500/40">{suggestion.slice(matchIdx, matchIdx + query.length)}</span>
                          <span className="text-white font-semibold">{suggestion.slice(matchIdx + query.length)}</span>
                        </>
                      ) : (
                        suggestion
                      )}
                    </span>
                  </div>
                  <ArrowUpLeft size={14} className="text-white/30 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Tabs (When Results are Loaded) */}
      {hasSearched && results.length > 0 && (
        <div className="flex items-center gap-2 mb-6 max-w-3xl mx-auto overflow-x-auto no-scrollbar pb-1">
          {(['songs', 'artists', 'playlists'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                activeFilter === filter
                  ? 'bg-gradient-to-r from-[#991b1b] to-[#15803d] text-white shadow-md'
                  : 'liquid-glass-pill text-white/60 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <Loader2 size={32} className="animate-spin mb-3 text-[#16a34a]" />
          <p className="text-xs font-semibold tracking-wide">Searching YouTube Music...</p>
        </div>
      ) : hasSearched && results.length > 0 ? (
        /* Results View */
        <div className="max-w-4xl mx-auto">
          {activeFilter === 'songs' && (
            <>
              {/* Top Result Card */}
              {topResult && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-1">Top Result</h3>
                  <div 
                    onClick={() => {
                      if (onPlayPlaylist) {
                        onPlayPlaylist(results, 0);
                      } else {
                        onPlaySong(topResult);
                      }
                    }}
                    className="liquid-glass-card rounded-3xl p-4 sm:p-5 flex items-center justify-between cursor-pointer group hover:border-emerald-500/40"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                        <img 
                          src={getThumbnail(topResult)} 
                          alt={topResult.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play size={24} fill="currentColor" className="text-white ml-1" />
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#16a34a] font-bold">Song</span>
                        <h4 className="text-base sm:text-lg font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {topResult.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/50 truncate mt-0.5">
                          {getArtistName(topResult)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleLike(topResult)}
                        className="p-2.5 rounded-full text-white/50 hover:text-white cursor-pointer transition-colors"
                      >
                        <Heart 
                          size={18} 
                          className={isLiked(topResult.videoId) ? "text-rose-500 fill-rose-500" : ""} 
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSongToAddToPlaylist(topResult)}
                        className="p-2.5 rounded-full text-white/50 hover:text-white cursor-pointer transition-colors"
                      >
                        <ListPlus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Songs List */}
              {otherResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-1">Songs</h3>
                  <div className="space-y-1.5">
                    {otherResults.map((song, idx) => {
                      const isThisPlaying = currentSong?.videoId === song.videoId && isPlaying;
                      return (
                        <div
                          key={`${song.videoId}_${idx}`}
                          onClick={() => {
                            if (onPlayPlaylist) {
                              onPlayPlaylist(results, idx + 1);
                            } else {
                              onPlaySong(song);
                            }
                          }}
                          className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                            isThisPlaying 
                              ? 'bg-emerald-500/15 border border-emerald-500/30' 
                              : 'liquid-glass-card hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden pr-2">
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow">
                              <img 
                                src={getThumbnail(song)} 
                                alt={song.name} 
                                className="w-full h-full object-cover" 
                              />
                              {isThisPlaying && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
                                </div>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h5 className={`text-xs sm:text-sm font-bold truncate ${isThisPlaying ? 'text-emerald-300' : 'text-white'}`}>
                                {song.name}
                              </h5>
                              <p className="text-[11px] text-white/45 truncate mt-0.5">
                                {getArtistName(song)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleLike(song)}
                              className="p-2 rounded-full text-white/40 hover:text-white cursor-pointer"
                            >
                              <Heart 
                                size={16} 
                                className={isLiked(song.videoId) ? "text-rose-500 fill-rose-500" : ""} 
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSongToAddToPlaylist(song)}
                              className="p-2 rounded-full text-white/40 hover:text-white cursor-pointer"
                            >
                              <ListPlus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeFilter === 'artists' && (
            <div className="space-y-4">
              {primaryArtist ? (
                <div className="liquid-glass-card rounded-3xl p-5 border border-emerald-500/30">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-2xl shadow-lg flex-shrink-0">
                      <Mic2 size={28} />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">Featured Artist</span>
                      <h3 className="text-xl font-black text-white">{primaryArtist[0]}</h3>
                      <p className="text-xs text-white/50 mt-0.5">{primaryArtist[1].length} tracks found</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {primaryArtist[1].map((s, idx) => (
                      <div
                        key={`${s.videoId}_artist_${idx}`}
                        onClick={() => {
                          if (onPlayPlaylist) {
                            onPlayPlaylist(primaryArtist[1], idx);
                          } else {
                            onPlaySong(s);
                          }
                        }}
                        className="p-2.5 rounded-2xl liquid-glass-pill hover:bg-white/10 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={getThumbnail(s)} alt={s.name} className="w-9 h-9 rounded-lg object-cover" />
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">{s.name}</p>
                            <p className="text-[10px] text-white/40 truncate">{getArtistName(s)}</p>
                          </div>
                        </div>
                        <Play size={14} className="text-white/40 hover:text-white" fill="currentColor" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-white/40 text-xs">No artists identified for this search.</div>
              )}
            </div>
          )}

          {activeFilter === 'playlists' && (
            <div className="space-y-4">
              {/* Online Community Playlists */}
              {onlinePlaylists.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-1">Community Playlists</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {onlinePlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => handleOpenPlaylist(pl)}
                        className="liquid-glass-card rounded-2xl p-3 cursor-pointer group hover:border-emerald-500/40 flex flex-col justify-between"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-neutral-900 relative">
                          <img 
                            src={pl.thumbnail || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop'} 
                            alt={pl.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayEntirePlaylist(pl, false);
                            }}
                            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play size={14} fill="currentColor" className="ml-0.5" />
                          </button>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{pl.title}</h4>
                        <p className="text-[10px] text-white/40 truncate mt-0.5">{pl.author || 'Playlist'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Custom Playlists from User */}
              {matchingCustomPlaylists.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2 px-1">Your Custom Playlists</h3>
                  <div className="space-y-2">
                    {matchingCustomPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => handleOpenPlaylist(pl)}
                        className="liquid-glass-card rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <ListMusic size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{pl.name}</h4>
                            <p className="text-[10px] text-white/40">{pl.songs?.length || 0} tracks</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-white/40" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : hasSearched ? (
        <div className="py-20 text-center text-white/40 text-xs">
          No songs found for "{query}". Try a different spelling or artist name.
        </div>
      ) : (
        /* Default Empty State: Show Synced Search History */
        <div className="max-w-2xl mx-auto">
          {searchHistory.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                  <History size={13} className="text-[#16a34a]" />
                  <span>Recent Searches</span>
                </h3>
                <button
                  type="button"
                  onClick={clearGlobalSearchHistory}
                  className="text-[11px] text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-1">
                {searchHistory.map((item) => (
                  <div
                    key={item}
                    onClick={() => {
                      setQuery(item);
                      performSearch(item);
                    }}
                    className="p-2.5 rounded-xl liquid-glass-pill hover:bg-white/10 flex items-center justify-between text-xs text-white/80 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Clock size={13} className="text-white/35 flex-shrink-0" />
                      <span className="truncate group-hover:text-white font-medium">{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSearchHistory(item);
                      }}
                      className="p-1 text-white/30 hover:text-rose-400 cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-white/30 text-xs">
              <SearchIcon size={28} className="mx-auto mb-2 text-white/20" />
              <p>Type any song, artist, album, or genre to start listening.</p>
            </div>
          )}
        </div>
      )}

      {/* Playlist View Modal (Portaled) */}
      {selectedPlaylist && createPortal(
        <div 
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-xl flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPlaylist(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[85vh] sm:h-[80vh] bg-[#0c0d14] border border-white/15 rounded-t-[32px] sm:rounded-3xl p-5 flex flex-col shadow-2xl relative overflow-hidden text-white"
          >
            {/* Header info */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-3">
              <div className="flex items-center gap-3.5 overflow-hidden">
                <img 
                  src={selectedPlaylist.thumbnail || (playlistSongs[0] ? getThumbnail(playlistSongs[0]) : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop')} 
                  alt={selectedPlaylist.title || selectedPlaylist.name}
                  className="w-14 h-14 rounded-2xl object-cover shadow-md flex-shrink-0" 
                />
                <div className="overflow-hidden">
                  <h3 className="text-base font-bold text-white truncate">{selectedPlaylist.title || selectedPlaylist.name}</h3>
                  <p className="text-xs text-white/50 truncate mt-0.5">
                    {playlistSongs.length > 0 ? `${playlistSongs.length} tracks` : (selectedPlaylist.songCount ? `${selectedPlaylist.songCount} tracks` : 'Playlist')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlaylist(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Play & Shuffle Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handlePlayEntirePlaylist(selectedPlaylist, false)}
                disabled={loadingPlaylist || playlistSongs.length === 0}
                className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                <span>Play All</span>
              </button>
              <button
                type="button"
                onClick={() => handlePlayEntirePlaylist(selectedPlaylist, true)}
                disabled={loadingPlaylist || playlistSongs.length === 0}
                className="py-2 px-3 rounded-xl liquid-glass-pill hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-40 cursor-pointer"
              >
                <Shuffle size={13} />
                <span>Shuffle</span>
              </button>
            </div>

            {/* Tracklist */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
              {loadingPlaylist ? (
                <div className="py-20 text-center text-white/40 text-xs flex flex-col items-center">
                  <Loader2 size={24} className="animate-spin mb-2 text-[#16a34a]" />
                  <span>Loading playlist tracks...</span>
                </div>
              ) : playlistSongs.length === 0 ? (
                <div className="py-20 text-center text-white/40 text-xs">No tracks in this playlist.</div>
              ) : (
                playlistSongs.map((track, idx) => {
                  const isTrackPlaying = currentSong?.videoId === track.videoId && isPlaying;
                  return (
                    <div
                      key={`${track.videoId}_${idx}`}
                      onClick={() => {
                        if (onPlayPlaylist) {
                          onPlayPlaylist(playlistSongs, idx);
                        } else {
                          onPlaySong(track);
                        }
                      }}
                      className={`p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                        isTrackPlaying 
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                          : 'liquid-glass-pill hover:bg-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <span className="text-xs font-mono text-white/30 w-5 text-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <img 
                          src={getThumbnail(track)} 
                          alt={track.name} 
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="overflow-hidden">
                          <h5 className="text-xs font-bold truncate">{track.name}</h5>
                          <p className="text-[11px] text-white/40 truncate mt-0.5">{getArtistName(track)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onPlayPlaylist) {
                              onPlayPlaylist(playlistSongs, idx);
                            } else {
                              onPlaySong(track);
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-emerald-500 text-white hover:text-black flex items-center justify-center transition-all cursor-pointer"
                          title="Play Track"
                        >
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add To Playlist Modal */}
      {songToAddToPlaylist && createPortal(
        <div 
          className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSongToAddToPlaylist(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm liquid-glass-dock rounded-3xl p-5 border border-white/20 shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ListMusic size={18} className="text-[#16a34a]" />
                <span>Add to Playlist</span>
              </div>
              <button 
                type="button"
                onClick={() => setSongToAddToPlaylist(null)}
                className="p-1 rounded-full text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 mb-4">
              <img 
                src={getThumbnail(songToAddToPlaylist)} 
                alt={songToAddToPlaylist.name} 
                className="w-11 h-11 rounded-lg object-cover"
              />
              <div className="overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">{songToAddToPlaylist.name}</p>
                <p className="text-white/40 text-[11px] truncate mt-0.5">{getArtistName(songToAddToPlaylist)}</p>
              </div>
            </div>

            {(!userData.playlists || userData.playlists.length === 0) ? (
              <div className="py-6 text-center text-white/40 text-xs">
                <p>No custom playlists yet.</p>
                <p className="text-white/60 mt-1">Go to Library tab to create your first playlist!</p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {userData.playlists.map((pl) => {
                  const alreadyIn = pl.songs?.some((s) => s.videoId === songToAddToPlaylist.videoId);
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={async () => {
                        if (alreadyIn) {
                          showToast(`Song already in "${pl.name}"`);
                          return;
                        }
                        await addSongToPlaylist(pl.id, songToAddToPlaylist);
                        showToast(`Added to "${pl.name}"`);
                        setSongToAddToPlaylist(null);
                      }}
                      className="w-full p-3 rounded-2xl liquid-glass-pill flex items-center justify-between text-left hover:border-emerald-500/40 transition-all cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                        {pl.name}
                      </span>
                      {alreadyIn ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check size={12} /> In Playlist
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/40 group-hover:text-white flex items-center gap-1">
                          <Plus size={12} /> Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
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
