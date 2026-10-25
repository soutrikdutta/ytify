import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  db, 
  doc, 
  getDoc, 
  setDoc 
} from '../firebase';
import type { Song } from '../types';

export interface UserPreferences {
  artists: string[];
  genres: string[];
  languages: string[];
}

export interface UserData {
  likedSongs: Song[];
  history: Song[];
  playlists: { id: string; name: string; songs: Song[] }[];
  preferences?: UserPreferences;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  userData: UserData;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmailUser: (email: string, name?: string) => void;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  toggleLike: (song: Song) => Promise<void>;
  addToHistory: (song: Song) => Promise<void>;
  isLiked: (videoId: string) => boolean;
  savePreferences: (prefs: UserPreferences) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, song: Song) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
}

const defaultUserData: UserData = {
  likedSongs: [],
  history: [],
  playlists: []
};

const getInitialUserData = (): UserData => {
  try {
    // 1. Dedicated persistent history key so listening history is NEVER lost or refreshed
    const histRaw = localStorage.getItem('ytify_playback_history');
    const dedicatedHistory: Song[] = histRaw ? JSON.parse(histRaw) : [];

    // 2. Dedicated custom playlists key
    const plRaw = localStorage.getItem('ytify_custom_playlists');
    const dedicatedPlaylists: { id: string; name: string; songs: Song[] }[] = plRaw ? JSON.parse(plRaw) : [];

    // 3. Check logged-in user specific cache
    const savedUserStr = localStorage.getItem('ytify_current_user');
    let userSpecificData: UserData | null = null;
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      if (u && u.uid) {
        const raw = localStorage.getItem(`ytify_data_${u.uid}`);
        if (raw) userSpecificData = JSON.parse(raw);
      }
    }

    // 4. Check generic storage
    const genericRaw = localStorage.getItem('ytify_user_data');
    const genericData: UserData = genericRaw ? JSON.parse(genericRaw) : defaultUserData;

    const base = userSpecificData || genericData;
    const history = (base.history && base.history.length > 0) ? base.history : dedicatedHistory;
    const playlists = (base.playlists && base.playlists.length > 0) ? base.playlists : dedicatedPlaylists;

    return {
      likedSongs: base.likedSongs || [],
      history: history || [],
      playlists: playlists || [],
      preferences: base.preferences
    };
  } catch {
    return defaultUserData;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('ytify_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [userData, setUserData] = useState<UserData>(getInitialUserData);

  const [loading, setLoading] = useState(false);

  // Handle mobile redirect auth
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          const profile: UserProfile = {
            uid: result.user.uid,
            name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
            email: result.user.email || '',
            photoURL: result.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.displayName || 'User')}&background=15803d&color=fff&size=128&bold=true`
          };
          setUser(profile);
          localStorage.setItem('ytify_current_user', JSON.stringify(profile));
        }
      })
      .catch((err) => {
        console.warn('Redirect auth notice:', err);
      });
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const profile: UserProfile = {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=15803d&color=fff&size=128&bold=true`
        };
        setUser(profile);
        localStorage.setItem('ytify_current_user', JSON.stringify(profile));

        // Load Firestore data with smart non-destructive merge (never wipes local listening history)
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const remoteData = snap.data() as UserData;
            setUserData((prev) => {
              // Merge local history with remote history so we never lose newly played tracks
              const historyMap = new Map<string, Song>();
              (prev.history || []).forEach(s => historyMap.set(s.videoId, s));
              (remoteData.history || []).forEach(s => {
                if (!historyMap.has(s.videoId)) historyMap.set(s.videoId, s);
              });
              const mergedHistory = Array.from(historyMap.values()).slice(0, 50);

              const likedMap = new Map<string, Song>();
              (prev.likedSongs || []).forEach(s => likedMap.set(s.videoId, s));
              (remoteData.likedSongs || []).forEach(s => {
                if (!likedMap.has(s.videoId)) likedMap.set(s.videoId, s);
              });

              const merged: UserData = {
                likedSongs: Array.from(likedMap.values()),
                history: mergedHistory,
                playlists: remoteData.playlists?.length ? remoteData.playlists : (prev.playlists || []),
                preferences: remoteData.preferences || prev.preferences
              };

              localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(merged));
              localStorage.setItem('ytify_user_data', JSON.stringify(merged));
              localStorage.setItem('ytify_playback_history', JSON.stringify(mergedHistory));
              return merged;
            });
          } else {
            setUserData((prev) => {
              setDoc(userRef, prev).catch(() => {});
              localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(prev));
              return prev;
            });
          }
        } catch (err) {
          console.warn('Firestore offline fallback:', err);
          const cached = localStorage.getItem(`ytify_data_${currentUser.uid}`);
          if (cached) setUserData(JSON.parse(cached));
        }
      } else {
        const localUser = localStorage.getItem('ytify_current_user');
        if (!localUser) {
          setUser(null);
          const cached = localStorage.getItem('ytify_user_data');
          if (cached) setUserData(JSON.parse(cached));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real Google Sign-In with Firebase
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const profile: UserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
          email: result.user.email || '',
          photoURL: result.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.user.displayName || 'User')}&background=15803d&color=fff&size=128&bold=true`
        };
        setUser(profile);
        localStorage.setItem('ytify_current_user', JSON.stringify(profile));
      }
    } catch (err: any) {
      console.warn('Google Sign-In Popup notice:', err);
      if (
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/operation-not-supported-in-this-environment' ||
        err.message?.includes('popup')
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  // Direct Email Login Fallback
  const loginWithEmailUser = (email: string, name?: string) => {
    const derivedName = name || email.split('@')[0];
    const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
    const uid = 'usr_' + btoa(email.toLowerCase()).replace(/=/g, '');

    const profile: UserProfile = {
      uid,
      name: formattedName,
      email: email.trim(),
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=15803d&color=fff&size=128&bold=true`
    };

    setUser(profile);
    localStorage.setItem('ytify_current_user', JSON.stringify(profile));

    const existing = localStorage.getItem(`ytify_data_${uid}`);
    if (existing) {
      setUserData(JSON.parse(existing));
    } else {
      setUserData(defaultUserData);
      localStorage.setItem(`ytify_data_${uid}`, JSON.stringify(defaultUserData));
    }
  };

  // Instant Guest Access for Frictionless Browsing & Playback
  const continueAsGuest = () => {
    const guestProfile: UserProfile = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest Listener',
      email: 'guest@ytify.app',
      photoURL: '',
      isGuest: true
    };
    setUser(guestProfile);
    localStorage.setItem('ytify_current_user', JSON.stringify(guestProfile));
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout error:', e);
    }
    setUser(null);
    localStorage.removeItem('ytify_current_user');
    setUserData(defaultUserData);
  };

  const toggleLike = async (song: Song) => {
    const exists = userData.likedSongs.some(s => s.videoId === song.videoId);
    const updatedLiked = exists 
      ? userData.likedSongs.filter(s => s.videoId !== song.videoId)
      : [song, ...userData.likedSongs];

    const updated = { ...userData, likedSongs: updatedLiked };
    setUserData(updated);

    if (user) {
      localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, updated, { merge: true });
      } catch (e) {
        console.warn('Firestore sync notice:', e);
      }
    } else {
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
    }
  };

  const addToHistory = async (song: Song) => {
    setUserData((prev) => {
      const filtered = (prev.history || []).filter(s => s.videoId !== song.videoId);
      const updatedHistory = [song, ...filtered].slice(0, 50);
      const updated: UserData = { ...prev, history: updatedHistory };

      try {
        localStorage.setItem('ytify_playback_history', JSON.stringify(updatedHistory));
        localStorage.setItem('ytify_user_data', JSON.stringify(updated));
        if (user) {
          localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
        }
      } catch (e) {
        console.warn('Playback history save error:', e);
      }

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }

      return updated;
    });
  };

  const isLiked = (videoId: string) => {
    return userData.likedSongs.some(s => s.videoId === videoId);
  };

  const savePreferences = async (prefs: UserPreferences) => {
    const updated: UserData = { ...userData, preferences: prefs };
    setUserData(updated);

    // Clear feed cache so Home immediately generates personalized feed
    sessionStorage.clear();

    if (user) {
      localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
      try {
        const userRef = doc(db, 'users', user.uid);
        // Non-blocking fire-and-forget to Firestore
        setDoc(userRef, { preferences: prefs }, { merge: true }).catch(() => {});
      } catch (e) {
        console.warn('Firestore preferences sync notice:', e);
      }
    } else {
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
    }
  };

  const createPlaylist = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlaylist = {
      id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      songs: []
    };
    const updatedPlaylists = [newPlaylist, ...(userData.playlists || [])];
    const updated: UserData = { ...userData, playlists: updatedPlaylists };
    setUserData(updated);

    try {
      localStorage.setItem('ytify_custom_playlists', JSON.stringify(updatedPlaylists));
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
      if (user) {
        localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Playlist save notice:', e);
    }
  };

  const deletePlaylist = async (id: string) => {
    const updatedPlaylists = (userData.playlists || []).filter(p => p.id !== id);
    const updated: UserData = { ...userData, playlists: updatedPlaylists };
    setUserData(updated);

    try {
      localStorage.setItem('ytify_custom_playlists', JSON.stringify(updatedPlaylists));
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
      if (user) {
        localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Playlist delete notice:', e);
    }
  };

  const addSongToPlaylist = async (playlistId: string, song: Song) => {
    const updatedPlaylists = (userData.playlists || []).map(p => {
      if (p.id === playlistId) {
        const exists = p.songs.some(s => s.videoId === song.videoId);
        return {
          ...p,
          songs: exists ? p.songs : [song, ...p.songs]
        };
      }
      return p;
    });
    const updated: UserData = { ...userData, playlists: updatedPlaylists };
    setUserData(updated);

    try {
      localStorage.setItem('ytify_custom_playlists', JSON.stringify(updatedPlaylists));
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
      if (user) {
        localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Playlist add notice:', e);
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, videoId: string) => {
    const updatedPlaylists = (userData.playlists || []).map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          songs: p.songs.filter(s => s.videoId !== videoId)
        };
      }
      return p;
    });
    const updated: UserData = { ...userData, playlists: updatedPlaylists };
    setUserData(updated);

    try {
      localStorage.setItem('ytify_custom_playlists', JSON.stringify(updatedPlaylists));
      localStorage.setItem('ytify_user_data', JSON.stringify(updated));
      if (user) {
        localStorage.setItem(`ytify_data_${user.uid}`, JSON.stringify(updated));
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Playlist remove song notice:', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signInWithGoogle,
      loginWithEmailUser,
      continueAsGuest,
      signOut,
      toggleLike,
      addToHistory,
      isLiked,
      savePreferences,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
