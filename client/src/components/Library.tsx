import React, { useState } from 'react';
import type { Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  Clock, 
  Play, 
  Shuffle, 
  Plus, 
  ListMusic, 
  FolderPlus, 
  Trash2, 
  ChevronRight, 
  Music, 
  Disc3, 
  X, 
  Check, 
  ListPlus, 
  ArrowLeft 
} from 'lucide-react';
import { AuthModal } from './AuthModal';

interface LibraryProps {
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying?: boolean;
}

export const Library: React.FC<LibraryProps> = ({ onPlaySong, currentSong, isPlaying = false }) => {
  const { 
    user, 
    userData, 
    toggleLike, 
    createPlaylist, 
    deletePlaylist, 
    addSongToPlaylist, 
    removeSongFromPlaylist 
  } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'liked' | 'history'>('all');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const playlists = userData.playlists || [];
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId) || null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const getThumbnail = (song: Song) => {
    if (song.thumbnails && song.thumbnails.length > 0) {
      return song.thumbnails[song.thumbnails.length - 1].url;
    }
    return `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
  };

  const getArtistName = (song: Song) => {
    if (typeof song.artist === 'string') return song.artist;
    if (song.artist && song.artist.name) return song.artist.name;
    if (song.artists && song.artists.length > 0) return song.artists.map((a) => a.name).join(', ');
    return 'Artist';
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewPlaylistName('');
    setShowNewPlaylistModal(false);
    showToast(`Created playlist "${name}"`);
  };

  const playLikedAll = (shuffle: boolean = false) => {
    if (userData.likedSongs.length === 0) return;
    const list = [...userData.likedSongs];
    if (shuffle) {
      list.sort(() => Math.random() - 0.5);
    }
    onPlaySong(list[0]);
  };

  const playPlaylistAll = (pl: { songs: Song[] }, shuffle: boolean = false) => {
    if (!pl.songs || pl.songs.length === 0) {
      showToast('Playlist is empty. Add songs first!');
      return;
    }
    const list = [...pl.songs];
    if (shuffle) {
      list.sort(() => Math.random() - 0.5);
    }
    onPlaySong(list[0]);
  };

  return (
    <div className="pb-48 px-3.5 sm:px-6 pt-3 w-full max-w-7xl mx-auto relative select-none">
      {/* Floating Animated Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-black/90 text-emerald-300 border border-emerald-500/50 shadow-2xl px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-xl">
            <Check size={14} className="text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Library
          </h1>
          <p className="text-xs text-white/50">
            {user ? `${user.name.split(' ')[0]}'s Music Collection` : 'Offline Guest Stash'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPlaylistModal(true)}
            className="px-3 py-1.5 rounded-full liquid-glass-pill flex items-center gap-1.5 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer active:scale-95 transition-all text-xs font-bold shadow"
            title="Create Playlist"
          >
            <Plus size={15} />
            <span>New</span>
          </button>
          {!user && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-bold text-white bg-gradient-to-r from-[#991b1b] to-[#15803d] px-3.5 py-1.5 rounded-full shadow active:scale-95 transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar py-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'playlists', label: `Playlists (${playlists.length})` },
          { key: 'liked', label: `Liked (${userData.likedSongs.length})` },
          { key: 'history', label: `History (${userData.history.length})` }
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'liquid-segment-active text-white border-emerald-500/50 shadow-md'
                  : 'liquid-glass-pill text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. PRIMARY HERO: LIKED MUSIC PLAYLIST CARD */}
      {(activeTab === 'all' || activeTab === 'liked') && (
        <div className="mb-5 relative overflow-hidden liquid-glass-card rounded-3xl p-5 border border-white/15 shadow-2xl bg-gradient-to-br from-red-950/40 via-[#0a0a14] to-emerald-950/30 group">
          {/* Subtle Ambient Pulse Light */}
          <div className="absolute -right-12 -top-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
          <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-red-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

          <div className="relative z-10 flex items-center justify-between">
            <div 
              onClick={() => setActiveTab('liked')} 
              className="flex items-center gap-3.5 cursor-pointer flex-1 overflow-hidden mr-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#991b1b] via-[#b91c1c] to-[#15803d] flex items-center justify-center text-white shadow-xl flex-shrink-0 relative overflow-hidden border border-white/20">
                <Heart size={26} fill="white" className="animate-pulse" />
                <div className="absolute inset-0 bg-white/15 pointer-events-none" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">Auto Playlist</span>
                <h2 className="text-base font-black text-white truncate">Liked Music</h2>
                <p className="text-xs text-white/50 mt-0.5 truncate">
                  {userData.likedSongs.length} tracks • Ready to mix
                </p>
              </div>
            </div>

            {userData.likedSongs.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => playLikedAll(true)}
                  className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-emerald-400 hover:text-white cursor-pointer active:scale-90 transition-all shadow"
                  title="Shuffle Play"
                >
                  <Shuffle size={16} />
                </button>
                <button
                  onClick={() => playLikedAll(false)}
                  className="w-11 h-11 rounded-full bg-[#15803d] hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer border border-white/20"
                  title="Play All"
                >
                  <Play size={18} fill="currentColor" className="ml-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PLACED DIRECTLY UNDER LIKED PLAYLIST: "YOUR PLAYLISTS" SECTION */}
      {(activeTab === 'all' || activeTab === 'playlists') && (
        <div className="mb-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <ListMusic size={16} className="text-emerald-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Your Playlists
              </h3>
              <span className="text-xs font-mono font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                {playlists.length}
              </span>
            </div>

            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={13} />
              <span>Create Playlist</span>
            </button>
          </div>

          {/* Grid of Playlists Placed Directly Under Liked Playlist */}
          {playlists.length === 0 ? (
            /* Animated Empty Playlist Card */
            <div
              onClick={() => setShowNewPlaylistModal(true)}
              className="p-5 rounded-3xl border-2 border-dashed border-white/15 hover:border-emerald-500/50 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group hover:bg-white/5 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl liquid-segment-active flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform shadow">
                <FolderPlus size={22} />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                Create Your First Playlist
              </h4>
              <p className="text-xs text-white/40 mt-1 max-w-xs">
                Organize your tracks into custom playlists like late-night drives, workouts, or chill acoustic.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {playlists.map((pl, idx) => {
                const songCount = pl.songs ? pl.songs.length : 0;
                const coverThumb = songCount > 0 ? getThumbnail(pl.songs[0]) : null;

                return (
                  <div
                    key={pl.id || idx}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className="liquid-glass-card rounded-3xl p-3 flex flex-col justify-between cursor-pointer group active:scale-[0.97] transition-all border border-white/10 hover:border-emerald-500/40 shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* Glowing Playlist Artwork Box */}
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900 via-emerald-950/30 to-black border border-white/10 shadow-md mb-2.5 flex items-center justify-center group-hover:shadow-emerald-900/30 transition-all">
                      {coverThumb ? (
                        <img 
                          src={coverThumb} 
                          alt={pl.name} 
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#991b1b]/40 via-neutral-900 to-[#15803d]/40 flex flex-col items-center justify-center text-white/40">
                          <Disc3 size={32} className="text-emerald-400/80 animate-spin" style={{ animationDuration: '9s' }} />
                        </div>
                      )}

                      {/* Play Button Overlay on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playPlaylistAll(pl);
                        }}
                        className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#15803d] hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all opacity-90 group-hover:opacity-100 group-hover:scale-105"
                        title="Play Playlist"
                      >
                        <Play size={15} fill="currentColor" className="ml-0.5" />
                      </button>

                      {/* Delete Playlist Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(pl.id);
                          showToast(`Deleted "${pl.name}"`);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white/40 hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Playlist"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Playlist Metadata */}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium flex items-center justify-between">
                        <span>{songCount} {songCount === 1 ? 'song' : 'songs'}</span>
                        <ChevronRight size={12} className="text-white/30 group-hover:text-white transition-colors" />
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. LIKED TRACKS LIST (Shown in 'all' and 'liked' tab) */}
      {(activeTab === 'all' || activeTab === 'liked') && (
        <div className="mb-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Heart size={14} className="text-rose-400" />
              <span>{activeTab === 'all' ? 'Favorite Tracks' : 'All Liked Songs'}</span>
            </h3>
            {activeTab === 'all' && userData.likedSongs.length > 5 && (
              <button 
                onClick={() => setActiveTab('liked')} 
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                See all ({userData.likedSongs.length})
              </button>
            )}
          </div>

          <div className="space-y-2">
            {userData.likedSongs.length === 0 ? (
              <div className="liquid-glass-card rounded-3xl p-6 text-center my-2 flex flex-col items-center">
                <Heart size={24} className="text-white/30 mb-2 animate-pulse" />
                <p className="text-xs text-white/50">No favorite songs yet. Tap heart to save tracks here.</p>
              </div>
            ) : (
              (activeTab === 'all' ? userData.likedSongs.slice(0, 6) : userData.likedSongs).map((song, idx) => {
                const isSelectedThis = currentSong?.videoId === song.videoId;
                const isPlayingThis = isPlaying && isSelectedThis;
                return (
                  <div
                    key={`liked-${song.videoId}-${idx}`}
                    onClick={() => onPlaySong(song)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                      isPlayingThis
                        ? 'bg-gradient-to-r from-red-600/15 via-[#15803d]/15 to-transparent border border-[#15803d]/40'
                        : 'liquid-glass-card hover:bg-white/10'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow border border-white/10">
                      <img src={getThumbnail(song)} alt={song.name} className="w-full h-full object-cover" />
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

                    <div className="flex-1 overflow-hidden">
                      <h4 className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {song.name}
                      </h4>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {getArtistName(song)}
                      </p>
                    </div>

                    {/* Quick Add To Playlist Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongToAddToPlaylist(song);
                      }}
                      className="p-2 text-white/30 hover:text-emerald-400 hover:bg-white/10 rounded-full transition-all cursor-pointer"
                      title="Add to Playlist"
                    >
                      <ListPlus size={16} />
                    </button>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(song);
                      }}
                      className="p-2 text-rose-500 hover:scale-110 active:scale-90 transition-all cursor-pointer"
                      title="Liked"
                    >
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. PLAYBACK HISTORY (Shown in 'all' and 'history' tab) */}
      {(activeTab === 'all' || activeTab === 'history') && (
        <div className="mb-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" />
              <span>{activeTab === 'all' ? 'Recent History' : 'Playback History'}</span>
            </h3>
            {activeTab === 'all' && userData.history.length > 5 && (
              <button 
                onClick={() => setActiveTab('history')} 
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                See all ({userData.history.length})
              </button>
            )}
          </div>

          <div className="space-y-2">
            {userData.history.length === 0 ? (
              <div className="liquid-glass-card rounded-3xl p-6 text-center my-2 flex flex-col items-center">
                <Clock size={24} className="text-white/30 mb-2" />
                <p className="text-xs text-white/50">No playback history yet. Play songs to see them here.</p>
              </div>
            ) : (
              (activeTab === 'all' ? userData.history.slice(0, 6) : userData.history).map((song, idx) => {
                const isSelectedThis = currentSong?.videoId === song.videoId;
                const isPlayingThis = isPlaying && isSelectedThis;
                return (
                  <div
                    key={`hist-${song.videoId}-${idx}`}
                    onClick={() => onPlaySong(song)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                      isPlayingThis
                        ? 'bg-gradient-to-r from-red-600/15 via-[#15803d]/15 to-transparent border border-[#15803d]/40'
                        : 'liquid-glass-card hover:bg-white/10'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow border border-white/10">
                      <img src={getThumbnail(song)} alt={song.name} className="w-full h-full object-cover" />
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

                    <div className="flex-1 overflow-hidden">
                      <h4 className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                        {song.name}
                      </h4>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {getArtistName(song)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongToAddToPlaylist(song);
                      }}
                      className="p-2 text-white/30 hover:text-emerald-400 hover:bg-white/10 rounded-full transition-all cursor-pointer"
                      title="Add to Playlist"
                    >
                      <ListPlus size={16} />
                    </button>

                    <button className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/70">
                      <Play size={13} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. INTERACTIVE PLAYLIST DETAIL DRAWER / MODAL */}
      {selectedPlaylist && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-md mx-auto pt-2 pb-24">
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedPlaylistId(null)}
                className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-white/80 hover:text-white cursor-pointer active:scale-90 transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Playlist</span>
              <button
                onClick={() => {
                  deletePlaylist(selectedPlaylist.id);
                  setSelectedPlaylistId(null);
                  showToast(`Deleted "${selectedPlaylist.name}"`);
                }}
                className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center text-white/50 hover:text-rose-400 cursor-pointer active:scale-90 transition-all"
                title="Delete Playlist"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Playlist Hero Artwork Header */}
            <div className="flex flex-col items-center text-center my-4">
              <div className="w-40 h-40 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/20 mb-4 bg-gradient-to-tr from-[#991b1b]/40 via-neutral-900 to-[#15803d]/40 flex items-center justify-center">
                {selectedPlaylist.songs && selectedPlaylist.songs.length > 0 ? (
                  <img
                    src={getThumbnail(selectedPlaylist.songs[0])}
                    alt={selectedPlaylist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc3 size={48} className="text-emerald-400/80 animate-spin" style={{ animationDuration: '8s' }} />
                )}
              </div>

              <h2 className="text-2xl font-black text-white">{selectedPlaylist.name}</h2>
              <p className="text-xs text-white/50 mt-1">
                {selectedPlaylist.songs ? selectedPlaylist.songs.length : 0} songs • Created by you
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => playPlaylistAll(selectedPlaylist, false)}
                  className="px-6 py-2.5 rounded-full bg-[#15803d] hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => playPlaylistAll(selectedPlaylist, true)}
                  className="px-5 py-2.5 rounded-full liquid-glass-pill text-white/80 hover:text-white font-bold text-xs flex items-center gap-2 shadow active:scale-95 transition-all cursor-pointer"
                >
                  <Shuffle size={15} />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            {/* Songs List inside Playlist */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Tracks</h4>
              </div>

              {!selectedPlaylist.songs || selectedPlaylist.songs.length === 0 ? (
                <div className="liquid-glass-card rounded-3xl p-8 text-center my-4 flex flex-col items-center">
                  <Music size={26} className="text-white/30 mb-2" />
                  <p className="text-sm font-bold text-white mb-1">Playlist is Empty</p>
                  <p className="text-xs text-white/40 max-w-xs mb-3">
                    Add tracks from Liked Music or History by tapping the '+' button on any track.
                  </p>
                  <button
                    onClick={() => setSelectedPlaylistId(null)}
                    className="px-4 py-2 rounded-full liquid-glass-pill text-emerald-400 text-xs font-bold hover:text-white cursor-pointer"
                  >
                    Browse Library
                  </button>
                </div>
              ) : (
                selectedPlaylist.songs.map((song, sIdx) => {
                  const isSelectedThis = currentSong?.videoId === song.videoId;
                  const isPlayingThis = isPlaying && isSelectedThis;
                  return (
                    <div
                      key={`pl-song-${song.videoId}-${sIdx}`}
                      onClick={() => onPlaySong(song)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                        isPlayingThis
                          ? 'bg-gradient-to-r from-red-600/15 via-[#15803d]/15 to-transparent border border-[#15803d]/40'
                          : 'liquid-glass-card hover:bg-white/10'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900 shadow border border-white/10">
                        <img src={getThumbnail(song)} alt={song.name} className="w-full h-full object-cover" />
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

                      <div className="flex-1 overflow-hidden">
                        <h4 className={`text-sm font-semibold truncate ${isPlayingThis ? 'text-emerald-400 font-bold' : 'text-white'}`}>
                          {song.name}
                        </h4>
                        <p className="text-xs text-white/50 truncate mt-0.5">
                          {getArtistName(song)}
                        </p>
                      </div>

                      {/* Remove Song from Playlist */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSongFromPlaylist(selectedPlaylist.id, song.videoId);
                          showToast(`Removed from "${selectedPlaylist.name}"`);
                        }}
                        className="p-2 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove track"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. ADD TO PLAYLIST QUICK PICKER MODAL */}
      {songToAddToPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-sm liquid-glass-dock rounded-3xl p-5 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListPlus size={18} className="text-emerald-400" />
                <span>Add to Playlist</span>
              </h3>
              <button 
                onClick={() => setSongToAddToPlaylist(null)}
                className="w-8 h-8 rounded-full liquid-glass-pill flex items-center justify-center text-white/60 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Song Preview */}
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 mb-4 border border-white/10">
              <img 
                src={getThumbnail(songToAddToPlaylist)} 
                alt={songToAddToPlaylist.name} 
                className="w-10 h-10 rounded-xl object-cover shadow"
              />
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{songToAddToPlaylist.name}</p>
                <p className="text-[10px] text-white/50 truncate">{getArtistName(songToAddToPlaylist)}</p>
              </div>
            </div>

            {/* Playlists Selection */}
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar mb-4">
              {playlists.length === 0 ? (
                <div className="p-4 text-center text-white/40 text-xs">
                  No playlists created yet. Create one below!
                </div>
              ) : (
                playlists.map((pl) => {
                  const alreadyIn = pl.songs && pl.songs.some(s => s.videoId === songToAddToPlaylist.videoId);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => {
                        if (!alreadyIn) {
                          addSongToPlaylist(pl.id, songToAddToPlaylist);
                          showToast(`Added to "${pl.name}"`);
                          setSongToAddToPlaylist(null);
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

            {/* Quick Create Playlist Inside Picker */}
            <button
              onClick={() => {
                setShowNewPlaylistModal(true);
              }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/10 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>New Playlist</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. CREATE NEW PLAYLIST MODAL */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm liquid-glass-dock rounded-3xl p-6 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#991b1b] to-[#15803d] flex items-center justify-center text-white shadow">
                <FolderPlus size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">New Playlist</h3>
                <p className="text-[11px] text-white/50">It will appear right under Liked Music.</p>
              </div>
            </div>

            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g. Late Night Vibes, Gym Pump, Chill..."
              className="w-full liquid-glass-card text-white placeholder-white/35 px-4 py-3.5 rounded-2xl text-sm outline-none focus:border-emerald-500/70 transition-all my-4 shadow-inner"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPlaylistModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#15803d] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs shadow-lg cursor-pointer transition-all active:scale-95"
              >
                Create Playlist
              </button>
            </div>
          </form>
        </div>
      )}

      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};
