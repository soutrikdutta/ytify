import { useState, useEffect, useRef } from 'react';
import type { Song } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Home } from './components/Home';
import { Search } from './components/Search';
import { Player } from './components/Player';
import { BottomNav } from './components/BottomNav';
import { Library } from './components/Library';
import { Settings } from './components/Settings';
import { Explore } from './components/Explore';
import { AuthModal } from './components/AuthModal';
import { TasteOnboardingModal } from './components/TasteOnboardingModal';
import { ProfileModal } from './components/ProfileModal';
import { LandingPage } from './components/LandingPage';
import { TopBar } from './components/TopBar';
import { apiUrl, isNativePlatform } from './api';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

function MainApp() {
  const { user, userData, addToHistory } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTasteModal, setShowTasteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentTab, setCurrentTab] = useState('home');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');

  const tabOrder = ['home', 'search', 'explore', 'library', 'settings'];
  const handleTabChange = (newTab: string) => {
    if (newTab === currentTab) return;
    const prevIdx = tabOrder.indexOf(currentTab);
    const newIdx = tabOrder.indexOf(newTab);
    setTransitionDirection(newIdx >= prevIdx ? 'forward' : 'backward');
    setCurrentTab(newTab);
    try {
      window.history.pushState({ tab: newTab }, '');
    } catch {}
  };

  const handleOpenAuth = () => {
    setShowAuthModal(true);
    try {
      window.history.pushState({ modal: 'auth' }, '');
    } catch {}
  };

  const handleOpenTaste = () => {
    setShowTasteModal(true);
    try {
      window.history.pushState({ modal: 'taste' }, '');
    } catch {}
  };

  const handleOpenProfile = () => {
    setShowProfileModal(true);
    try {
      window.history.pushState({ modal: 'profile' }, '');
    } catch {}
  };

  // Hardware Back Button & Mobile Popstate Navigation Handler
  useEffect(() => {
    try {
      if (!window.history.state) {
        window.history.replaceState({ tab: 'home' }, '');
      }
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      // 1. Close any open dialogs/modals
      if (showProfileModal) {
        setShowProfileModal(false);
        return;
      }
      if (showTasteModal) {
        setShowTasteModal(false);
        return;
      }
      if (showAuthModal) {
        setShowAuthModal(false);
        return;
      }

      // 2. Close full-screen music player if expanded
      window.dispatchEvent(new CustomEvent('ytify_close_expanded_player'));

      // 3. Tab back-navigation
      const targetTab = e.state?.tab;
      if (targetTab && tabOrder.includes(targetTab)) {
        const prevIdx = tabOrder.indexOf(currentTab);
        const newIdx = tabOrder.indexOf(targetTab);
        setTransitionDirection(newIdx >= prevIdx ? 'forward' : 'backward');
        setCurrentTab(targetTab);
      } else if (currentTab !== 'home') {
        setTransitionDirection('backward');
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showProfileModal, showTasteModal, showAuthModal, currentTab]);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [autoExpandPlayer, setAutoExpandPlayer] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const originalQueueRef = useRef<Song[]>([]);
  const isFetchingRelatedRef = useRef<boolean>(false);
  const lastFetchedRelatedForRef = useRef<string>('');

  // YouTube Iframe Player Engine (Official, 100% reliable Google engine)
  const ytPlayerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const pendingSongRef = useRef<Song | null>(null);
  const currentSongRef = useRef<Song | null>(null);

  // Dedicated account-switch & signout reset: stops audio immediately and clears player state
  const prevUserUidRef = useRef<string | undefined>(user?.uid);
  useEffect(() => {
    const handleResetAudio = () => {
      try {
        if (ytPlayerRef.current?.stopVideo) {
          ytPlayerRef.current.stopVideo();
        }
      } catch {}
      setIsPlaying(false);
      setCurrentSong(null);
      currentSongRef.current = null;
      setQueue([]);
      originalQueueRef.current = [];
      setQueueIndex(-1);
      setCurrentTime(0);
      setDuration(0);
    };

    if (prevUserUidRef.current !== undefined && prevUserUidRef.current !== user?.uid) {
      handleResetAudio();
    }
    prevUserUidRef.current = user?.uid;

    window.addEventListener('ytify_reset_audio_state', handleResetAudio);
    return () => {
      window.removeEventListener('ytify_reset_audio_state', handleResetAudio);
    };
  }, [user]);

  // Dolby Atmos Engine Local State for Visual Equalizer Bars
  const [dolbyEnabled, setDolbyEnabled] = useState(() => {
    const saved = localStorage.getItem('ytify_dolby_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [dolbyProfile, setDolbyProfile] = useState<'dynamic' | 'movie' | 'music' | 'voice'>(() => {
    return (localStorage.getItem('ytify_dolby_profile') as any) || 'music';
  });

  useEffect(() => {
    const handleDolbyUpdate = () => {
      const savedEnabled = localStorage.getItem('ytify_dolby_enabled');
      const savedProfile = localStorage.getItem('ytify_dolby_profile');
      if (savedEnabled !== null) setDolbyEnabled(savedEnabled === 'true');
      if (savedProfile) setDolbyProfile(savedProfile as any);
    };
    window.addEventListener('ytify_dolby_updated', handleDolbyUpdate);
    return () => window.removeEventListener('ytify_dolby_updated', handleDolbyUpdate);
  }, []);

  // Initialize YouTube Iframe API once
  useEffect(() => {
    const initYT = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          createPlayer();
        };
      }
    };

    const createPlayer = () => {
      if (ytPlayerRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player('yt-hidden-player', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              event.target.setVolume(volume);
              if (pendingSongRef.current) {
                const s = pendingSongRef.current;
                pendingSongRef.current = null;
                playSongOnPlayer(s);
              }
            },
            onStateChange: (event: any) => {
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
                const d = ytPlayerRef.current.getDuration();
                if (d && !isNaN(d) && d > 0) {
                  setDuration(d);
                }
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Song ended naturally - proceed to next or automatically fetch related songs
                handleNext();
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Player error code:', event.data);
              // Auto skip unplayable track after short delay
              setTimeout(() => {
                handleNext();
              }, 1200);
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube Iframe player:', err);
      }
    };

    initYT();

    return () => {
      try {
        if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
          ytPlayerRef.current.destroy();
          ytPlayerRef.current = null;
          isPlayerReadyRef.current = false;
        }
      } catch {}
    };
  }, []);

  // Sync volume with YouTube player
  useEffect(() => {
    if (ytPlayerRef.current && isPlayerReadyRef.current && ytPlayerRef.current.setVolume) {
      try {
        ytPlayerRef.current.setVolume(volume);
      } catch {}
    }
  }, [volume]);

  // Polling playback time from YouTube player
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && isPlayerReadyRef.current) {
          try {
            const time = ytPlayerRef.current.getCurrentTime();
            const dur = ytPlayerRef.current.getDuration();
            if (typeof time === 'number' && !isNaN(time)) {
              setCurrentTime(time);
            }
            if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
              setDuration(dur);
            }
          } catch {}
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Continuous Playback: Automatically fetch and append related songs when queue is ending
  const fetchRelatedSongs = async (videoId: string): Promise<Song[]> => {
    if (!videoId || isFetchingRelatedRef.current || lastFetchedRelatedForRef.current === videoId) {
      return [];
    }
    isFetchingRelatedRef.current = true;
    lastFetchedRelatedForRef.current = videoId;
    try {
      const res = await fetch(apiUrl(`/api/related?videoId=${encodeURIComponent(videoId)}`));
      if (res.ok) {
        const data = await res.json();
        const related: Song[] = data.songs || [];
        return related;
      }
    } catch (err) {
      console.warn('Failed to fetch related autoplay tracks:', err);
    } finally {
      isFetchingRelatedRef.current = false;
    }
    return [];
  };

  const playSongOnPlayer = (song: Song) => {
    if (!song.videoId) return;

    if (!isPlayerReadyRef.current || !ytPlayerRef.current?.loadVideoById) {
      pendingSongRef.current = song;
      return;
    }

    try {
      ytPlayerRef.current.loadVideoById({
        videoId: song.videoId,
        startSeconds: 0
      });
      setIsPlaying(true);
      setCurrentTime(0);

      // Reset last fetched cache for new seed song
      lastFetchedRelatedForRef.current = '';
    } catch (e) {
      console.warn('Error loading video in YT Player:', e);
    }
  };

  // Helper to get duration seconds from string (e.g. "3:45" -> 225)
  const parseDuration = (durStr?: string): number => {
    if (!durStr) return 0;
    const parts = durStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    currentSongRef.current = song;
    if (song.duration) {
      const parsed = parseDuration(song.duration);
      if (parsed > 0) setDuration(parsed);
    }

    // Set queue if empty or contains only one track
    if (queue.length <= 1) {
      setQueue([song]);
      originalQueueRef.current = [song];
      setQueueIndex(0);

      // Proactively fetch related songs right away to keep continuous playback ready
      if (song.videoId) {
        fetchRelatedSongs(song.videoId).then((related) => {
          if (related && related.length > 0) {
            setQueue((prev) => {
              const existingIds = new Set(prev.map(s => s.videoId));
              const uniqueRelated = related.filter(r => !existingIds.has(r.videoId));
              const updated = [...prev, ...uniqueRelated];
              originalQueueRef.current = [...originalQueueRef.current, ...uniqueRelated];
              return updated;
            });
          }
        });
      }
    } else {
      const idx = queue.findIndex(s => s.videoId === song.videoId);
      if (idx !== -1) {
        setQueueIndex(idx);
      } else {
        setQueue(prev => [...prev, song]);
        originalQueueRef.current = [...originalQueueRef.current, song];
        setQueueIndex(queue.length);
      }
    }

    playSongOnPlayer(song);
    addToHistory(song);

    // Expand player when user plays a song
    setAutoExpandPlayer(true);
    setTimeout(() => setAutoExpandPlayer(false), 500);
  };

  // Fisher-Yates true randomization algorithm
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Toggle Shuffle with true state restoration and continuous queue preservation
  const handleToggleShuffle = () => {
    setIsShuffle(prev => {
      const nextState = !prev;
      if (nextState) {
        // TURN ON SHUFFLE: Keep current track first, shuffle remaining queue
        if (queue.length > 1) {
          const activeTrack = queue[queueIndex] || currentSong;
          const remaining = queue.filter(s => s.videoId !== activeTrack?.videoId);
          const shuffledRemaining = shuffleArray(remaining);
          const newQueue = activeTrack ? [activeTrack, ...shuffledRemaining] : shuffledRemaining;
          setQueue(newQueue);
          setQueueIndex(0);
        }
      } else {
        // TURN OFF SHUFFLE: Restore original unshuffled queue
        if (originalQueueRef.current.length > 0) {
          const activeTrack = currentSong;
          const restored = [...originalQueueRef.current];
          const newIdx = activeTrack ? restored.findIndex(s => s.videoId === activeTrack.videoId) : 0;
          setQueue(restored);
          setQueueIndex(newIdx !== -1 ? newIdx : 0);
        }
      }
      return nextState;
    });
  };

  const handlePlayPlaylist = (songs: Song[], startIndex = 0, shouldShuffle = false) => {
    if (!songs || songs.length === 0) return;
    
    // Store pristine unshuffled list for restore
    originalQueueRef.current = [...songs];

    let targetQueue = [...songs];
    let targetIndex = startIndex;

    if (shouldShuffle || isShuffle) {
      setIsShuffle(true);
      const chosen = songs[startIndex];
      const remaining = songs.filter((_, i) => i !== startIndex);
      targetQueue = chosen ? [chosen, ...shuffleArray(remaining)] : shuffleArray(songs);
      targetIndex = 0;
    }

    setQueue(targetQueue);
    setQueueIndex(targetIndex);

    const song = targetQueue[targetIndex];
    if (song) {
      setCurrentSong(song);
      currentSongRef.current = song;
      if (song.duration) {
        const parsed = parseDuration(song.duration);
        if (parsed > 0) setDuration(parsed);
      }
      playSongOnPlayer(song);
      addToHistory(song);
    }
  };

  const handlePlayPause = () => {
    if (!ytPlayerRef.current || !isPlayerReadyRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Error toggling play/pause:', e);
    }
  };

  const handleNext = async () => {
    if (queue.length === 0) return;

    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      setQueueIndex(nextIndex);
      const song = queue[nextIndex];
      setCurrentSong(song);
      currentSongRef.current = song;
      if (song.duration) {
        const parsed = parseDuration(song.duration);
        if (parsed > 0) setDuration(parsed);
      }
      playSongOnPlayer(song);
      addToHistory(song);

      // Proactively fetch more related songs if we are nearing the end of the queue (<= 2 tracks left)
      if (nextIndex >= queue.length - 2 && song.videoId) {
        fetchRelatedSongs(song.videoId).then((related) => {
          if (related && related.length > 0) {
            setQueue((prev) => {
              const existingIds = new Set(prev.map(s => s.videoId));
              const uniqueRelated = related.filter(r => !existingIds.has(r.videoId));
              const updated = [...prev, ...uniqueRelated];
              originalQueueRef.current = [...originalQueueRef.current, ...uniqueRelated];
              return updated;
            });
          }
        });
      }
    } else {
      // Reached the very end of queue: seamlessly fetch and play related songs without stopping!
      const activeSeed = currentSongRef.current || queue[queue.length - 1];
      if (activeSeed && activeSeed.videoId) {
        try {
          const related = await fetchRelatedSongs(activeSeed.videoId);
          if (related && related.length > 0) {
            const existingIds = new Set(queue.map(s => s.videoId));
            const uniqueRelated = related.filter(r => !existingIds.has(r.videoId));
            if (uniqueRelated.length > 0) {
              const nextQueue = [...queue, ...uniqueRelated];
              originalQueueRef.current = [...originalQueueRef.current, ...uniqueRelated];
              setQueue(nextQueue);
              setQueueIndex(queue.length);
              const nextSong = uniqueRelated[0];
              setCurrentSong(nextSong);
              currentSongRef.current = nextSong;
              if (nextSong.duration) {
                const parsed = parseDuration(nextSong.duration);
                if (parsed > 0) setDuration(parsed);
              }
              playSongOnPlayer(nextSong);
              addToHistory(nextSong);
              return;
            }
          }
        } catch (e) {
          console.warn('Auto-next fetch error:', e);
        }
      }

      // Fallback: loop back to beginning
      setQueueIndex(0);
      const song = queue[0];
      setCurrentSong(song);
      currentSongRef.current = song;
      playSongOnPlayer(song);
      addToHistory(song);
    }
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    // If >3s into the song, restart it
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      const song = queue[prevIndex];
      setCurrentSong(song);
      currentSongRef.current = song;
      if (song.duration) {
        const parsed = parseDuration(song.duration);
        if (parsed > 0) setDuration(parsed);
      }
      playSongOnPlayer(song);
      addToHistory(song);
    } else {
      handleSeek(0);
    }
  };

  const handleSeek = (time: number) => {
    if (!ytPlayerRef.current || !isPlayerReadyRef.current) return;
    try {
      ytPlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
    } catch {}
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
  };

  const handleClosePlayer = () => {
    try {
      if (ytPlayerRef.current?.stopVideo) {
        ytPlayerRef.current.stopVideo();
      }
    } catch {}
    setIsPlaying(false);
    setCurrentSong(null);
    currentSongRef.current = null;
    setQueue([]);
    originalQueueRef.current = [];
    setQueueIndex(-1);
    setCurrentTime(0);
    setDuration(0);
  };

  // Auto-expand player event from other components
  useEffect(() => {
    const handleExpand = () => {
      setAutoExpandPlayer(true);
      setTimeout(() => setAutoExpandPlayer(false), 500);
    };
    window.addEventListener('ytify_expand_player', handleExpand);
    return () => window.removeEventListener('ytify_expand_player', handleExpand);
  }, []);

  return (
    <>
      {/* Hidden YouTube Iframe Audio Engine */}
      <div 
        id="yt-player-container" 
        style={{ 
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          left: '-9999px', 
          top: '-9999px', 
          opacity: 0, 
          pointerEvents: 'none' 
        }}
      >
        <div id="yt-hidden-player"></div>
      </div>

      {/* Conditional Rendering: Show Landing Page for first-time unauthenticated visitors */}
      {!user ? (
        <LandingPage 
          onOpenAuth={handleOpenAuth} 
          onContinueAsGuest={() => {
            // Guest mode: continue to main app
            const guestUser = {
              uid: 'guest_' + Math.random().toString(36).substring(2, 9),
              name: 'Guest Listener',
              email: '',
              photoURL: '',
              isGuest: true
            };
            localStorage.setItem('ytify_current_user', JSON.stringify(guestUser));
            window.location.reload();
          }} 
        />
      ) : (
        <div className="min-h-screen bg-[#030307] text-white flex flex-col relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-white">
          {/* Subtle Ambient Background Lighting Aura */}
          <div className="liquid-mesh pointer-events-none" />

          {/* Top Bar for Desktop Nav & Mobile Profile/Brand Header */}
          <TopBar
            currentTab={currentTab}
            onTabChange={handleTabChange}
            onOpenAuth={handleOpenAuth}
            onOpenProfile={handleOpenProfile}
            userData={userData}
          />

          {/* Main Content Area */}
          <main className="flex-1 overflow-x-hidden relative z-10">
            <div 
              className={
                currentTab === 'home' 
                  ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
                  : 'hidden'
              }
            >
              <Home 
                onPlaySong={handlePlaySong} 
                onPlayPlaylist={handlePlayPlaylist}
                currentSong={currentSong} 
                isPlaying={isPlaying} 
                onNavigateSearch={(genreQuery) => {
                  setCurrentTab('search');
                  if (genreQuery) {
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('ytify_execute_search', { detail: { query: genreQuery } }));
                    }, 50);
                  }
                }}
              />
            </div>
            <div 
              className={
                currentTab === 'search' 
                  ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
                  : 'hidden'
              }
            >
              <Search 
                onPlaySong={handlePlaySong} 
                onPlayPlaylist={handlePlayPlaylist}
                currentSong={currentSong} 
                isPlaying={isPlaying} 
              />
            </div>
            <div 
              className={
                currentTab === 'explore' 
                  ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
                  : 'hidden'
              }
            >
              <Explore onPlaySong={handlePlaySong} currentSong={currentSong} isPlaying={isPlaying} />
            </div>
            <div 
              className={
                currentTab === 'library' 
                  ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
                  : 'hidden'
              }
            >
              <Library onPlaySong={handlePlaySong} onPlayPlaylist={handlePlayPlaylist} currentSong={currentSong} isPlaying={isPlaying} />
            </div>
            <div 
              className={
                currentTab === 'settings' 
                  ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
                  : 'hidden'
              }
            >
              <Settings onOpenTaste={handleOpenTaste} />
            </div>
          </main>

          {/* Floating Bottom Player & Navigation Dock */}
          {isNativePlatform() ? (
            /* Native APK: Only Mini Player at bottom (Nav bar is pinned to top) */
            currentSong && (
              <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-4 px-3.5 select-none">
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030307] via-[#030307]/85 to-transparent pointer-events-none -z-10" />
                <div className="w-full max-w-md pointer-events-auto">
                  <Player
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    onPlayPause={handlePlayPause}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    queue={queue}
                    onPlaySong={handlePlaySong}
                    dolbyEnabled={dolbyEnabled}
                    dolbyProfile={dolbyProfile}
                    autoExpand={autoExpandPlayer}
                    isShuffle={isShuffle}
                    onToggleShuffle={handleToggleShuffle}
                    onShuffleQueue={handleToggleShuffle}
                    onClosePlayer={handleClosePlayer}
                  />
                </div>
              </div>
            )
          ) : (
            /* Web Application: Mobile has floating dock; Desktop has full-width luxury persistent bottom bar & top nav */
            <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-3 md:pb-0 px-3.5 md:px-0 select-none">
              {/* Soft Dark Bottom Gradient Scrim behind the dock on mobile */}
              <div className="md:hidden absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#030307] via-[#030307]/90 to-transparent pointer-events-none -z-10" />

              {/* 1. Player (Mobile mini pill or Desktop full-width persistent dock) */}
              {currentSong && (
                <div className="w-full max-w-md md:max-w-none pointer-events-auto md:mb-0 mb-2">
                  <Player
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    onPlayPause={handlePlayPause}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    queue={queue}
                    onPlaySong={handlePlaySong}
                    dolbyEnabled={dolbyEnabled}
                    dolbyProfile={dolbyProfile}
                    autoExpand={autoExpandPlayer}
                    isShuffle={isShuffle}
                    onToggleShuffle={handleToggleShuffle}
                    onShuffleQueue={handleToggleShuffle}
                    onClosePlayer={handleClosePlayer}
                  />
                </div>
              )}

              {/* 2. Bottom Nav Dock (Rendered on mobile; hidden on desktop because desktop has top bar navigation!) */}
              <div className="w-full max-w-md pointer-events-auto md:hidden">
                <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
              </div>
            </div>
          )}

          {/* Clean Sign-in with Google Only Prompt */}
          <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

          {/* YouTube Music Taste / Artist Onboarding Modal */}
          <TasteOnboardingModal isOpen={showTasteModal} onClose={() => setShowTasteModal(false)} />

          {/* User Profile Details & Settings Modal */}
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            onOpenTaste={handleOpenTaste}
            onNavigateTab={handleTabChange}
            onOpenAuth={handleOpenAuth}
          />
        </div>
      )}
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
