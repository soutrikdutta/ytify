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
      setCurrentTime(0);
      setQueue([]);
      setQueueIndex(-1);
    };

    window.addEventListener('ytify_signout', handleResetAudio);

    if (prevUserUidRef.current !== undefined && prevUserUidRef.current !== user?.uid) {
      handleResetAudio();
    }
    prevUserUidRef.current = user?.uid;

    return () => {
      window.removeEventListener('ytify_signout', handleResetAudio);
    };
  }, [user?.uid]);

  // Dolby Atmos Live State
  const [dolbyEnabled, setDolbyEnabled] = useState(() => {
    const s = localStorage.getItem('ytify_dolby_enabled');
    return s !== null ? s === 'true' : true;
  });
  const [dolbyProfile, setDolbyProfile] = useState(() => {
    return localStorage.getItem('ytify_dolby_profile') || 'music';
  });

  // Listen to Dolby Atmos changes from Settings
  useEffect(() => {
    const handleDolbyUpdate = () => {
      const s = localStorage.getItem('ytify_dolby_enabled');
      setDolbyEnabled(s !== null ? s === 'true' : true);
      setDolbyProfile(localStorage.getItem('ytify_dolby_profile') || 'music');
    };
    window.addEventListener('ytify_dolby_updated', handleDolbyUpdate);
  return () => window.removeEventListener('ytify_dolby_updated', handleDolbyUpdate);
  }, []);

  // Shared Link Receiver: /?v=<videoId>&play=1 -> loads, plays & opens full screen player
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedVid = params.get('v');
      const shouldPlay = params.get('play');
      if (sharedVid && sharedVid.length === 11) {
        fetch(apiUrl(`/api/search?q=${encodeURIComponent(sharedVid)}`))
          .then(r => r.json())
          .then(data => {
            const track = data.songs?.[0] || {
              type: 'SONG',
              videoId: sharedVid,
              name: 'Shared Track',
              artist: { name: 'ytify' },
              thumbnails: [{ url: `https://i.ytimg.com/vi/${sharedVid}/hqdefault.jpg` }]
            };
            handlePlaySong(track);
            if (shouldPlay === '1') {
              setAutoExpandPlayer(true);
            }
          })
          .catch(() => {
            const fallbackSong: Song = {
              videoId: sharedVid,
              name: 'Shared Track',
              artist: { name: 'ytify' },
              thumbnails: [{ url: `https://i.ytimg.com/vi/${sharedVid}/hqdefault.jpg` }]
            };
            handlePlaySong(fallbackSong);
            if (shouldPlay === '1') {
              setAutoExpandPlayer(true);
            }
          });
      }
    } catch (e) {
      console.warn('Shared link error:', e);
    }
  }, []);

  const handleShuffleQueue = () => {
    if (queue.length <= 1) return;
    setQueue(prev => {
      if (!currentSong) return prev;
      const current = prev.find(s => s.videoId === currentSong.videoId) || currentSong;
      const others = prev.filter(s => s.videoId !== currentSong.videoId);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      return [current, ...others];
    });
    setQueueIndex(0);
  };

  // Initialize YouTube Iframe Engine (Enhanced for 100% Instant Desktop & Mobile Web Playback)
  const initPlayer = () => {
    const el = document.getElementById('yt-audio-player');
    if (!el || ytPlayerRef.current) return;

    if (!window.YT) {
      if (!document.getElementById('yt-iframe-api-tag')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-tag';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      return;
    }

    if (window.YT && window.YT.Player && !ytPlayerRef.current) {
      try {
        ytPlayerRef.current = new window.YT.Player('yt-audio-player', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            widget_referrer: window.location.href
          },
          events: {
            onReady: () => {
              isPlayerReadyRef.current = true;
              try {
                const iframe = document.querySelector('#yt-audio-player') as HTMLIFrameElement;
                if (iframe) {
                  iframe.setAttribute('allow', 'autoplay; encrypted-media; gyroscope; picture-in-picture');
                }
                ytPlayerRef.current.unMute?.();
                ytPlayerRef.current.setVolume?.(volume || 100);
              } catch {}
              if (pendingSongRef.current) {
                const s = pendingSongRef.current;
                pendingSongRef.current = null;
                try {
                  ytPlayerRef.current.unMute?.();
                  ytPlayerRef.current.setVolume?.(volume || 100);
                  ytPlayerRef.current.loadVideoById({
                    videoId: s.videoId,
                    startSeconds: 0,
                    suggestedQuality: 'small'
                  });
                  ytPlayerRef.current.unMute?.();
                  ytPlayerRef.current.playVideo?.();
                  setIsPlaying(true);
                } catch (e) {
                  console.error('onReady play error:', e);
                }
              }
            },
            onStateChange: (event: any) => {
              // States: -1 (unstarted), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
              if (event.data === 1 || event.data === 3 || event.data === 5 || event.data === -1) {
                try {
                  ytPlayerRef.current?.unMute?.();
                  ytPlayerRef.current?.setVolume?.(volume || 100);
                  if (ytPlayerRef.current?.isMuted && ytPlayerRef.current.isMuted()) {
                    ytPlayerRef.current.unMute();
                  }
                } catch (e) {}
              }
              if (event.data === 1) {
                setIsPlaying(true);
                if (ytPlayerRef.current?.getDuration) {
                  setDuration(ytPlayerRef.current.getDuration() || 0);
                }
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                handleNext();
              }
            },
            onError: async (event: any) => {
              console.warn('YouTube Player error code:', event.data);
              // Errors 150 / 101 (embed restricted on 3rd party domain), 100 (private/removed), 2 (invalid id)
              if (event.data === 150 || event.data === 101 || event.data === 100 || event.data === 2) {
                const s = currentSongRef.current;
                if (s && !(s as any)._triedAlt) {
                  (s as any)._triedAlt = true;
                  try {
                    const artist = typeof s.artist === 'string' ? s.artist : s.artist?.name || '';
                    const altRes = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(s.name + ' ' + artist + ' audio')}`));
                    const altData = await altRes.json();
                    const alt = altData.songs?.find((item: Song) => item.videoId && item.videoId !== s.videoId && item.videoId.length === 11);
                    if (alt && alt.videoId) {
                      console.log('Switching to non-restricted audio version:', alt.videoId);
                      if (ytPlayerRef.current?.loadVideoById) {
                        ytPlayerRef.current.loadVideoById({
                          videoId: alt.videoId,
                          startSeconds: 0,
                          suggestedQuality: 'small'
                        });
                        ytPlayerRef.current.unMute?.();
                        ytPlayerRef.current.playVideo?.();
                        setIsPlaying(true);
                        return;
                      }
                    }
                  } catch (e) {
                    console.warn('Alternative search error:', e);
                  }
                }
                handleNext();
              }
            }
          }
        });
      } catch (e) {
        console.warn('YT player init error:', e);
      }
    }
  };

  useEffect(() => {
    initPlayer();
    if (window.YT && typeof (window.YT as any).ready === 'function') {
      (window.YT as any).ready(initPlayer);
    }
    window.onYouTubeIframeAPIReady = initPlayer;

    // Polling failsafe to guarantee player initializes immediately on initial load
    const checkTimer = setInterval(() => {
      if (!ytPlayerRef.current) {
        initPlayer();
      } else {
        clearInterval(checkTimer);
      }
    }, 100);
    const stopTimer = setTimeout(() => clearInterval(checkTimer), 15000);

    return () => {
      clearInterval(checkTimer);
      clearTimeout(stopTimer);
    };
  }, []);

  // Global user gesture audio unblocker: un-mutes and restores volume on user click/interaction
  useEffect(() => {
    const unlockSound = () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(volume || 100);
        } catch {}
      }
    };
    window.addEventListener('click', unlockSound, { passive: true });
    window.addEventListener('keydown', unlockSound, { passive: true });
    return () => {
      window.removeEventListener('click', unlockSound);
      window.removeEventListener('keydown', unlockSound);
    };
  }, [volume]);

  // Progress time loop for YouTube Player
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (t && !isNaN(t)) setCurrentTime(t);
          if (d && !isNaN(d)) setDuration(d);
        }
      }, 200);
    }
  return () => clearInterval(interval);
  }, [isPlaying]);



  // Prompt YouTube Music Taste Onboarding only once ever across sessions
  useEffect(() => {
    try {
      const hasCompletedTaste = localStorage.getItem('ytify_taste_completed');
      if (!hasCompletedTaste && user && (!userData.preferences || userData.preferences.artists.length === 0)) {
        setShowTasteModal(true);
        localStorage.setItem('ytify_taste_completed', 'true');
      }
    } catch {}
  }, [user, userData.preferences]);

  // Synchronous, instant playback trigger (guarantees browser user-activation is never lost)
  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    currentSongRef.current = song;
    addToHistory(song);
    setCurrentTime(0);

    if (!queue.find((s) => s.videoId === song.videoId)) {
      setQueue((prev) => [...prev, song]);
      setQueueIndex(queue.length);
    } else {
      setQueueIndex(queue.findIndex((s) => s.videoId === song.videoId));
    }

    const playVideoId = (vid: string) => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.setVolume?.(volume || 100);
          ytPlayerRef.current.loadVideoById({
            videoId: vid,
            startSeconds: 0,
            suggestedQuality: 'small'
          });
          ytPlayerRef.current.unMute?.();
          ytPlayerRef.current.playVideo?.();
          setIsPlaying(true);
          return;
        } catch (err) {
          console.warn('Direct playback call error:', err);
        }
      }

      // If player not initialized yet, kick off initialization right now
      initPlayer();

      pendingSongRef.current = { ...song, videoId: vid };
      let attempts = 0;
      const pollTimer = setInterval(() => {
        attempts++;
        if (!ytPlayerRef.current) {
          initPlayer();
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          clearInterval(pollTimer);
          try {
            ytPlayerRef.current.unMute?.();
            ytPlayerRef.current.setVolume?.(volume || 100);
            ytPlayerRef.current.loadVideoById({
              videoId: vid,
              startSeconds: 0,
              suggestedQuality: 'small'
            });
            ytPlayerRef.current.unMute?.();
            ytPlayerRef.current.playVideo?.();
            setIsPlaying(true);
            pendingSongRef.current = null;
          } catch (e) {
            console.warn('Deferred playback error:', e);
          }
        } else if (attempts > 80) {
          clearInterval(pollTimer);
        }
      }, 50);
    };

    // If already a valid 11-character YouTube videoId, play immediately
    if (song.videoId && song.videoId.length === 11 && !song.videoId.includes('itunes')) {
      playVideoId(song.videoId);
    } else {
      // Resolve valid 11-char YouTube ID for uncommon or external results
      const artistStr = typeof song.artist === 'string' ? song.artist : song.artist?.name || '';
      fetch(apiUrl(`/api/search?q=${encodeURIComponent(song.name + ' ' + artistStr)}`))
        .then(r => r.json())
        .then(data => {
          if (data.songs?.[0]?.videoId && data.songs[0].videoId.length === 11) {
            playVideoId(data.songs[0].videoId);
          }
        })
        .catch(console.error);
    }
  };

  const handlePlayPlaylist = (playlistSongs: Song[], startIndex: number = 0) => {
    if (!playlistSongs || playlistSongs.length === 0) return;
    setQueue(playlistSongs);
    setQueueIndex(startIndex);
    handlePlaySong(playlistSongs[startIndex]);
  };

  const handleClosePlayer = () => {
    try {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.pauseVideo?.();
        ytPlayerRef.current.stopVideo?.();
      }
    } catch (e) {}
    setIsPlaying(false);
    setCurrentSong(null);
  };

  const handlePlayPause = () => {
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.unMute?.();
        ytPlayerRef.current.setVolume?.(volume || 100);
        ytPlayerRef.current.playVideo?.();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Play/pause toggle error:', e);
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    const nextIdx = (queueIndex + 1) % queue.length;
    setQueueIndex(nextIdx);
    const nextSong = queue[nextIdx];
    if (nextSong) {
      handlePlaySong(nextSong);
    }
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1 < 0 ? queue.length - 1 : queueIndex - 1;
    setQueueIndex(prevIdx);
    const prevSong = queue[prevIdx];
    if (prevSong) {
      handlePlaySong(prevSong);
    }
  };

  const handleSeek = (time: number) => {
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (ytPlayerRef.current) {
      try {
        if (vol > 0) {
          ytPlayerRef.current.unMute?.();
        }
        ytPlayerRef.current.setVolume?.(vol);
      } catch (e) {}
    }
  };

  return (
    <>
      {/* Permanent YouTube Audio/Media Engine Element (Rendered at opacity 1 behind dark canvas - ALWAYS mounted in DOM from initial page load) */}
      <div
        id="yt-audio-player-container"
        className="fixed bottom-0 right-0 pointer-events-none select-none overflow-hidden"
        style={{
          width: 320,
          height: 240,
          opacity: 1,
          zIndex: -20
        }}
      >
        <div id="yt-audio-player" className="w-full h-full" />
      </div>

      {!user ? (
        <LandingPage />
      ) : (
        <div className="min-h-screen bg-[#030307] text-white flex flex-col font-sans selection:bg-[#15803d] selection:text-white relative overflow-hidden">
          {/* Animated Liquid Background Refraction Mesh */}
          <div className="liquid-mesh" />

      {/* Top Fixed Navigation for Native Android APK */}
      {isNativePlatform() ? (
        <div className="fixed top-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pt-[max(env(safe-area-inset-top),10px)] pb-2 px-3.5 select-none bg-gradient-to-b from-[#030307] via-[#030307]/95 to-transparent">
          <div className="w-full max-w-md pointer-events-auto">
            <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
          </div>
        </div>
      ) : (
        /* Floating Rounded Liquid Glass Capsule Top Bar - Stuck at the top while scrolling */
        <TopBar
          onOpenProfile={handleOpenProfile}
          onOpenAuth={handleOpenAuth}
          user={user}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />
      )}

      {/* Main View Area with Responsive Full Width on PC/Laptop & Smooth Animated Transitions */}
      <main className={`flex-1 w-full max-w-7xl mx-auto relative z-10 px-3 sm:px-6 lg:px-8 ${isNativePlatform() ? 'pt-20 pb-32' : 'pt-3 pb-36'}`}>
        <div 
          className={
            currentTab === 'home' 
              ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
              : 'hidden'
          }
        >
          <Home 
            onPlaySong={handlePlaySong} 
            currentSong={currentSong} 
            isPlaying={isPlaying}
            onOpenAuth={handleOpenAuth} 
            onOpenTaste={handleOpenTaste}
            onOpenProfile={handleOpenProfile}
          />
        </div>
        <div 
          className={
            currentTab === 'search' 
              ? `block ${transitionDirection === 'forward' ? 'tab-pane-enter-forward' : 'tab-pane-enter-backward'}` 
              : 'hidden'
          }
        >
          <Search onPlaySong={handlePlaySong} onPlayPlaylist={handlePlayPlaylist} currentSong={currentSong} isPlaying={isPlaying} />
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
                onShuffleQueue={handleShuffleQueue}
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
                onShuffleQueue={handleShuffleQueue}
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
