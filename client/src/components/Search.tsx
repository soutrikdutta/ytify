import React, { useState, useEffect, useRef } from 'react';
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
  const [activeFilter, setActiveFilter] = useState<'songs' | 'artists' | 'playlists'>('songs');
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
          handleSearch(undefined, chosen);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(undefined, suggestion);
  };

  const handleFillSuggestion = (e: React.MouseEvent, suggestion: string) => {
    e.stopPropagation();
    setQuery(suggestion);
    setSelectedIndex(-1);
  };

  const addToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    addSearchHistory(trimmed);
    window.dispatchEvent(new CustomEvent('ytify_search_performed', { detail: trimmed }));
  };

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeSearchHistory(item);
  };

  const clearSearchHistory = () => {
    clearGlobalSearchHistory();
  };

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    const searchTarget = customQuery !== undefined ? customQuery : query;
    const trimmed = searchTarget.trim();
    if (!trimmed) return;

    if (customQuery !== undefined) {
      setQuery(customQuery);
    }

    addToHistory(trimmed);
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(trimmed)}`));
      const data = await res.json();
      if (data) {
        setResults(data.songs || []);
        setOnlinePlaylists(data.playlists || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // In-memory instant client cache for opened playlists (0ms subsequent loads)
  const playlistCacheRef = useRef<Map<string, { playlist: any; songs: Song[] }>>(new Map());

  const openPlaylistModal = async (pl: any) => {
    // 1. Immediately display modal with initial metadata
    setSelectedPlaylist(pl);

    // 2. Instant client-cache check (0ms load)
    if (playlistCacheRef.current.has(pl.id)) {
      const cached = playlistCacheRef.current.get(pl.id)!;
      setSelectedPlaylist(cached.playlist);
      setPlaylistSongs(cached.songs);
      setLoadingPlaylist(false);
      return;
    }

    setLoadingPlaylist(true);
    setPlaylistSongs([]);
    try {
      const res = await fetch(apiUrl(`/api/playlist?id=${encodeURIComponent(pl.id)}`));
      const data = await res.json();
      if (data?.playlist) {
        const fullPlaylist = { ...pl, ...data.playlist };
        const songs = data.playlist.songs || [];
        setPlaylistSongs(songs);
        setSelectedPlaylist(fullPlaylist);
        playlistCacheRef.current.set(pl.id, { playlist: fullPlaylist, songs });
      }
    } catch (err) {
      console.error('Error fetching playlist tracks:', err);
      showToast('Error loading playlist tracks');
    } finally {
      setLoadingPlaylist(false);
    }
  };

  const handlePlayOnlinePlaylistAll = async (pl: any, shuffle: boolean = false) => {
    let songs = (selectedPlaylist?.id === pl.id && playlistSongs.length > 0)
      ? playlistSongs
      : (playlistCacheRef.current.get(pl.id)?.songs || []);

    if (songs.length === 0) {
      try {
        showToast('Loading playlist tracks...');
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
          <SearchIcon className="absolute left-4 text-white/40" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search all songs, artists, playlists..."
            className="w-full liquid-glass-card text-white placeholder-white/35 pl-11 pr-24 py-3.5 rounded-2xl text-sm outline-none focus:border-[#15803d]/60 transition-all shadow-lg"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setOnlinePlaylists([]);
                setSelectedPlaylist(null);
                setPlaylistSongs([]);
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="absolute right-14 text-white/40 hover:text-white p-1 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          )}

          <button
            type="submit"
            className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#15803d] hover:brightness-110 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-md"
          >
            Search
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
                  key={`${suggestion}-${idx}`}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-white/15 text-white' : 'hover:bg-white/10 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                    <SearchIcon size={14} className={isSelected ? 'text-emerald-400' : 'text-white/40'} />
                    <span className="text-sm truncate">
                      {matchIdx !== -1 ? (
                        <>
                          <span className="text-white/50">{suggestion.slice(0, matchIdx)}</span>
                          <span className="text-white font-bold">{suggestion.slice(matchIdx, matchIdx + query.length)}</span>
                          <span className="text-white/90 font-medium">{suggestion.slice(matchIdx + query.length)}</span>
                        </>
                      ) : (
                        suggestion
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleFillSuggestion(e, suggestion)}
                    className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Insert into search bar"
                  >
                    <ArrowUpLeft size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Dedicated Category Chips: Songs, Artists, Playlists */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
          {(['songs', 'artists', 'playlists'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'liquid-segment-active text-white border-emerald-500/50 shadow'
                    : 'liquid-glass-pill text-white/50 hover:text-white'
                }`}
              >
                {filter === 'songs' && <Disc size={13} className={isActive ? 'text-emerald-400' : 'text-white/40'} />}
                {filter === 'artists' && <Mic2 size={13} className={isActive ? 'text-emerald-400' : 'text-white/40'} />}
                {filter === 'playlists' && <ListMusic size={13} className={isActive ? 'text-emerald-400' : 'text-white/40'} />}
                <span className="capitalize">{filter}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-white/40 gap-3">
          <div className="w-9 h-9 border-2 border-[#16a34a] border-t-[#991b1b] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-white/60 font-medium">Searching Whole Ytify Library...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* TAB 1: SONGS FILTER */}
          {activeFilter === 'songs' && (
            <>
              {/* Top Result Card */}
              {topResult && (
                <div className="mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-2 px-1">
                    Top Result
                  </span>
                  <div
                    onClick={() => onPlaySong(topResult)}
                    className="relative overflow-hidden liquid-glass-card rounded-3xl p-4 flex items-center justify-between cursor-pointer group active:scale-[0.98] transition-all border border-emerald-500/30 shadow-xl bg-gradient-to-r from-emerald-950/20 via-black/40 to-transparent"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden flex-1 mr-2">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10 flex items-center justify-center bg-neutral-950">
                        <img
                          src={getThumbnail(topResult)}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50 brightness-75 pointer-events-none"
                        />
                        <img
                          src={getThumbnail(topResult)}
                          alt={topResult.name}
                          className="relative z-10 w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-500"
                        />
                        {isPlaying && currentSong?.videoId === topResult.videoId && (
                          <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                            <div className="flex items-end gap-[3px] h-5">
                              <div className="w-[3.5px] bg-emerald-400 rounded-full animate-eq-1" />
                              <div className="w-[3.5px] bg-emerald-400 rounded-full animate-eq-2" />
                              <div className="w-[3.5px] bg-emerald-400 rounded-full animate-eq-3" />
                              <div className="w-[3.5px] bg-emerald-400 rounded-full animate-eq-4" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-base font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {topResult.name}
                        </h4>
                        <p className="text-xs text-white/60 truncate mt-0.5">
                          {getArtistName(topResult)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/40">
                          {topResult.duration && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {topResult.duration}
                            </span>
                          )}
                          {topResult.views && (
                            <span className="flex items-center gap-1">
                              <Eye size={11} />
                              {topResult.views}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleLike(topResult)}
                        className={`p-2.5 rounded-full liquid-glass-pill transition-transform active:scale-125 cursor-pointer ${
                          isLiked(topResult.videoId) ? 'text-rose-500' : 'text-white/40 hover:text-white'
                        }`}
                        title={isLiked(topResult.videoId) ? "Liked" : "Like"}
                      >
                        <Heart size={18} fill={isLiked(topResult.videoId) ? "currentColor" : "none"} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSongToAddToPlaylist(topResult)}
                        className="p-2.5 rounded-full liquid-glass-pill text-white/50 hover:text-emerald-400 transition-colors cursor-pointer active:scale-110"
                        title="Add to Playlist"
                      >
                        <ListPlus size={18} />
                      </button>

                      {/* Big Tactile Play Button */}
                      <button
                        type="button"
                        onClick={() => onPlaySong(topResult)}
                        className="w-12 h-12 rounded-full bg-[#15803d] group-hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 active:scale-90 cursor-pointer"
                        title="Play"
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* All Songs List */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Songs ({results.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {otherResults.map((song, idx) => {
                    const isSelectedThis = currentSong?.videoId === song.videoId;
                    const isPlayingThis = isPlaying && isSelectedThis;
                    return (
                      <div
                        key={`${song.videoId}-${idx}`}
                        onClick={() => onPlaySong(song)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                          isPlayingThis
                            ? 'bg-gradient-to-r from-red-600/15 via-[#15803d]/15 to-transparent border border-[#15803d]/40'
                            : 'liquid-glass-card hover:bg-white/10'
                        }`}
                      >
                        {/* Thumbnail with duration badge */}
                        <div className="relative w-13 h-13 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow border border-white/10">
                          <img
                            src={getThumbnail(song)}
                            alt={song.name}
                            className="w-full h-full object-cover"
                          />
                          {song.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm text-[9px] font-mono text-white/90 px-1 py-0.2 rounded font-bold">
                              {song.duration}
                            </span>
                          )}
                          {isPlayingThis && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="flex items-end gap-[2.5px] h-4">
                                <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-1" />
                                <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-2" />
                                <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-3" />
                                <div className="w-[2.5px] bg-emerald-400 rounded-full animate-eq-4" />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 overflow-hidden">
                          <h4 className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                            {song.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-white/50 truncate mt-0.5">
                            <span className="truncate">{getArtistName(song)}</span>
                            {song.views && (
                              <>
                                <span>•</span>
                                <span className="text-[11px] text-white/40 flex-shrink-0">{song.views}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggleLike(song)}
                            className={`p-2 rounded-full transition-transform active:scale-125 cursor-pointer ${
                              isLiked(song.videoId) ? 'text-rose-500' : 'text-white/35 hover:text-white'
                            }`}
                            title={isLiked(song.videoId) ? "Liked" : "Like"}
                          >
                            <Heart size={16} fill={isLiked(song.videoId) ? "currentColor" : "none"} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSongToAddToPlaylist(song)}
                            className="p-2 text-white/35 hover:text-emerald-400 rounded-full transition-colors cursor-pointer active:scale-110"
                            title="Add to Playlist"
                          >
                            <ListPlus size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onPlaySong(song)}
                            className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer active:scale-90"
                            title="Play"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ARTISTS FILTER */}
          {activeFilter === 'artists' && (
            <div className="space-y-4">
              {primaryArtist ? (
                <>
                  {/* Artist Hero Profile Banner */}
                  <div className="liquid-glass-dock rounded-3xl p-5 border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-black/60 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg flex-shrink-0">
                        <img 
                          src={getThumbnail(primaryArtist[1][0])} 
                          alt={primaryArtist[0]} 
                          className="w-full h-full object-cover scale-110"
                        />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 size={14} />
                          <span>Official Artist</span>
                        </div>
                        <h3 className="text-xl font-black text-white truncate mt-0.5">
                          {primaryArtist[0]}
                        </h3>
                        <p className="text-xs text-white/50 mt-0.5">
                          {primaryArtist[1].length} tracks in search
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onPlaySong(primaryArtist[1][0])}
                        className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer flex-shrink-0"
                        title="Play Top Track"
                      >
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Top Songs by this Artist */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 px-1 mb-2">
                      Top Songs by {primaryArtist[0]}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                      {primaryArtist[1].map((song, idx) => (
                        <div
                          key={`artist-song-${song.videoId}-${idx}`}
                          onClick={() => onPlaySong(song)}
                          className="flex items-center gap-3 p-2.5 rounded-2xl liquid-glass-card hover:bg-white/10 cursor-pointer select-none transition-all active:scale-[0.98]"
                        >
                          <span className="text-xs font-mono text-white/30 w-4 text-center">{idx + 1}</span>
                          <img src={getThumbnail(song)} alt={song.name} className="w-11 h-11 rounded-xl object-cover shadow border border-white/10" />
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{song.name}</p>
                            <p className="text-xs text-white/50 truncate mt-0.5">{getArtistName(song)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlaySong(song);
                            }}
                            className="p-2 text-white/40 hover:text-white"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-white/40 text-xs">
                  No artist profiles found for "{query}".
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLAYLISTS FILTER */}
          {activeFilter === 'playlists' && (
            <div className="space-y-6">
              {/* 1. Matching User Playlists */}
              {matchingCustomPlaylists.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 px-1 mb-3">
                    Your Library Playlists ({matchingCustomPlaylists.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {matchingCustomPlaylists.map(pl => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          if (pl.songs && pl.songs.length > 0) {
                            if (onPlayPlaylist) {
                              onPlayPlaylist(pl.songs, 0);
                            } else {
                              onPlaySong(pl.songs[0]);
                            }
                            showToast(`Playing playlist "${pl.name}"`);
                          } else {
                            showToast('Playlist is empty');
                          }
                        }}
                        className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass-card hover:bg-white/10 cursor-pointer transition-all active:scale-[0.98] group"
                      >
                        <div className="flex items-center gap-3.5 overflow-hidden">
                          <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-[#991b1b]/40 to-[#15803d]/40 border border-white/15 flex items-center justify-center text-emerald-400 shadow flex-shrink-0">
                            <ListMusic size={22} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{pl.name}</p>
                            <p className="text-xs text-white/45 truncate mt-0.5">Your Playlist • {pl.songs?.length || 0} tracks</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-10 h-10 rounded-full liquid-segment-active text-white flex items-center justify-center hover:scale-105 active:scale-90 transition-all cursor-pointer flex-shrink-0"
                          title="Play Playlist"
                        >
                          <Play size={16} fill="currentColor" className="ml-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. YouTube Playlists from Search */}
              <div>
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 flex items-center gap-2">
                    <ListMusic size={14} className="text-emerald-400" />
                    <span>YouTube Playlists & Albums ({onlinePlaylists.length})</span>
                  </h3>
                  <span className="text-[11px] text-white/30 hidden sm:inline">Tap playlist to view full tracklist</span>
                </div>

                {onlinePlaylists.length === 0 ? (
                  <div className="py-16 text-center text-white/40 text-xs">
                    {loading ? 'Searching YouTube playlists...' : `No playlists found for "${query}". Try searching an artist or genre + playlist.`}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {onlinePlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => openPlaylistModal(pl)}
                        className="group flex flex-col justify-between p-3 rounded-2xl liquid-glass-card hover:bg-white/10 hover:border-emerald-500/40 cursor-pointer transition-all duration-300 active:scale-[0.98] border border-white/10 shadow-lg"
                      >
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-950 mb-3 border border-white/10 shadow pointer-events-none">
                          <img 
                            src={pl.thumbnail} 
                            alt={pl.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-80" />
                          
                          {/* Track count badge */}
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/15">
                            <ListMusic size={11} className="text-emerald-400" />
                            <span>{pl.trackCount}</span>
                          </div>
                        </div>

                        <div className="flex-1 overflow-hidden pointer-events-none">
                          <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors" title={pl.title}>
                            {pl.title}
                          </h4>
                          <p className="text-xs text-white/50 truncate mt-1">
                            {pl.author}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 pointer-events-none">
                            <span>Open playlist</span>
                            <ChevronRight size={13} />
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayOnlinePlaylistAll(pl);
                            }}
                            className="px-3.5 py-1.5 rounded-full liquid-glass-pill hover:bg-emerald-500 hover:text-black text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-90 cursor-pointer shadow-md"
                            title="Play All"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>Play</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Empty State: Exactly as requested - When there is no text, show JUST the history */
        <div className="py-2 space-y-4 animate-in fade-in duration-200">
          <div className="liquid-glass-card rounded-3xl p-5 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                <History size={15} className="text-emerald-400" />
                <span>Search History</span>
              </h3>
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearSearchHistory}
                  className="text-[11px] text-rose-400/80 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash2 size={12} />
                  <span>Clear history</span>
                </button>
              )}
            </div>

            {searchHistory.length > 0 ? (
              <div className="divide-y divide-white/10">
                {searchHistory.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSearch(undefined, item)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-white/5 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden pr-2">
                      <Clock size={15} className="text-white/35 flex-shrink-0 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-sm text-white/80 group-hover:text-white truncate font-medium">
                        {item}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuery(item);
                        }}
                        className="p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Put in search bar"
                      >
                        <ArrowUpLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeHistoryItem(e, item)}
                        className="p-1.5 text-white/30 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Remove from history"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl liquid-glass-pill flex items-center justify-center text-white/30 mb-3 border border-white/10">
                  <History size={20} />
                </div>
                <p className="text-sm font-semibold text-white/60">No Search History</p>
                <p className="text-xs text-white/35 mt-1 max-w-xs">
                  Your search history will appear here. Start typing above to search across millions of songs.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real YouTube Playlist Detail Modal */}
      {selectedPlaylist && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col justify-end md:justify-center items-center p-0 md:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedPlaylist(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] md:max-h-[85vh] bg-[#090b10] border border-white/15 rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom-6 duration-300"
          >
            {/* Playlist Header / Hero */}
            <div className="relative p-5 sm:p-7 border-b border-white/10 bg-gradient-to-b from-emerald-950/40 via-white/5 to-transparent flex-shrink-0">
              <button 
                type="button"
                onClick={() => setSelectedPlaylist(null)}
                className="absolute top-4 right-4 p-2 rounded-full liquid-glass-pill text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex-shrink-0 bg-neutral-950 group">
                  <img 
                    src={selectedPlaylist.thumbnail || `https://i.ytimg.com/vi/${selectedPlaylist.id}/hqdefault.jpg`} 
                    alt={selectedPlaylist.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="flex-1 text-center sm:text-left overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                    <ListMusic size={13} />
                    <span>YouTube Playlist</span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white leading-tight line-clamp-2">
                    {selectedPlaylist.title}
                  </h2>
                  <p className="text-white/60 text-xs sm:text-sm mt-1 font-medium">
                    {selectedPlaylist.author || 'YouTube'} • {selectedPlaylist.trackCount || `${playlistSongs.length} tracks`}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => handlePlayOnlinePlaylistAll(selectedPlaylist, false)}
                      disabled={loadingPlaylist || playlistSongs.length === 0}
                      className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Play size={16} fill="currentColor" />
                      <span>Play All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlayOnlinePlaylistAll(selectedPlaylist, true)}
                      disabled={loadingPlaylist || playlistSongs.length === 0}
                      className="px-4 py-2.5 rounded-full liquid-glass-pill text-white hover:border-emerald-500/50 disabled:opacity-50 font-semibold text-xs sm:text-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                    >
                      <Shuffle size={16} />
                      <span>Shuffle</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Playlist Track List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 no-scrollbar">
              {loadingPlaylist ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold py-1">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading tracks from YouTube...</span>
                  </div>
                  {[1, 2, 3, 4, 5, 6].map((idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl liquid-glass-card animate-pulse">
                      <div className="w-5 h-4 bg-white/10 rounded" />
                      <div className="w-11 h-11 bg-white/10 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-white/5 rounded w-1/3" />
                      </div>
                      <div className="w-10 h-3 bg-white/10 rounded flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : playlistSongs.length === 0 ? (
                <div className="py-16 text-center text-white/40 text-xs">
                  No tracks available in this playlist.
                </div>
              ) : (
                playlistSongs.map((song, idx) => {
                  const isCurrent = currentSong?.videoId === song.videoId;
                  const isPlayingNow = isCurrent && isPlaying;
                  return (
                    <div
                      key={`${song.videoId}-${idx}`}
                      onClick={() => {
                        if (onPlayPlaylist) {
                          onPlayPlaylist(playlistSongs, idx);
                        } else {
                          onPlaySong(song);
                        }
                      }}
                      className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl cursor-pointer select-none transition-all active:scale-[0.99] group ${
                        isCurrent 
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shadow'
                          : 'liquid-glass-card hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <span className="text-xs font-mono text-white/35 w-6 text-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10 shadow">
                        <img 
                          src={getThumbnail(song)} 
                          alt={song.name} 
                          className="w-full h-full object-cover" 
                        />
                        {isPlayingNow && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="flex items-end gap-[2px] h-3.5">
                              <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-1" />
                              <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-2" />
                              <span className="w-[2px] bg-emerald-400 rounded-full animate-eq-3" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-emerald-400' : 'text-white group-hover:text-emerald-300'}`}>
                          {song.name}
                        </p>
                        <p className="text-xs text-white/45 truncate mt-0.5">
                          {getArtistName(song)}
                        </p>
                      </div>

                      {song.duration && (
                        <span className="text-xs font-mono text-white/40 flex-shrink-0 mr-1">
                          {song.duration}
                        </span>
                      )}

                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => toggleLike(song)}
                          className={`p-2 rounded-full transition-transform active:scale-125 cursor-pointer ${
                            isLiked(song.videoId) ? 'text-rose-500' : 'text-white/30 hover:text-white'
                          }`}
                          title="Like"
                        >
                          <Heart size={16} fill={isLiked(song.videoId) ? 'currentColor' : 'none'} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSongToAddToPlaylist(song)}
                          className="p-2 text-white/30 hover:text-emerald-400 rounded-full transition-colors cursor-pointer"
                          title="Add to Playlist"
                        >
                          <ListPlus size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onPlayPlaylist) {
                              onPlayPlaylist(playlistSongs, idx);
                            } else {
                              onPlaySong(song);
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
        </div>
      )}

      {/* Add To Playlist Modal */}
      {songToAddToPlaylist && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
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
        </div>
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
