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
    const savedUserStr = localStorage.getItem('ytify_current_user');
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      if (u && u.uid) {
        const raw = localStorage.getItem(`ytify_data_${u.uid}`);
        if (raw) return JSON.parse(raw);
      }
    }
    return defaultUserData;
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

  // Helper to persist data strictly for the active user account
  const persistUserData = (updated: UserData, targetUser: UserProfile | null) => {
    setUserData(updated);
    const targetUid = targetUser?.uid || 'guest_session';
    try {
      localStorage.setItem(`ytify_data_${targetUid}`, JSON.stringify(updated));
      if (targetUser && !targetUser.isGuest) {
        const userRef = doc(db, 'users', targetUser.uid);
        setDoc(userRef, updated, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  };

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

  // Listen to Firebase Auth state (Loads strict per-account data from Firestore & LocalCache)
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

        // 1. Immediately switch to this specific account's cache if available
        const localAccountCache = localStorage.getItem(`ytify_data_${currentUser.uid}`);
        if (localAccountCache) {
          try {
            setUserData(JSON.parse(localAccountCache));
          } catch {
            setUserData(defaultUserData);
          }
        } else {
          setUserData(defaultUserData);
        }

        // 2. Fetch fresh account-specific data from Firestore (NO cross-account merging)
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const remoteData = snap.data() as UserData;
            const accountData: UserData = {
              likedSongs: remoteData.likedSongs || [],
              history: remoteData.history || [],
              playlists: remoteData.playlists || [],
              preferences: remoteData.preferences
            };
            setUserData(accountData);
            localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(accountData));
          } else {
            // Brand new Google account: start clean and write empty initial profile
            const freshData: UserData = {
              likedSongs: [],
              history: [],
              playlists: []
            };
            setUserData(freshData);
            localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(freshData));
            await setDoc(userRef, freshData).catch(() => {});
          }
        } catch (err) {
          console.warn('Firestore offline notice:', err);
        }
      } else {
        const localUser = localStorage.getItem('ytify_current_user');
        if (!localUser) {
          setUser(null);
          setUserData(defaultUserData);
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
    const guestUid = 'guest_session';
    const guestProfile: UserProfile = {
      uid: guestUid,
      name: 'Guest Listener',
      email: 'guest@ytify.app',
      photoURL: '',
      isGuest: true
    };
    setUser(guestProfile);
    localStorage.setItem('ytify_current_user', JSON.stringify(guestProfile));
    const cachedGuest = localStorage.getItem(`ytify_data_${guestUid}`);
    if (cachedGuest) {
      try {
        setUserData(JSON.parse(cachedGuest));
      } catch {
        setUserData(defaultUserData);
      }
    } else {
      setUserData(defaultUserData);
    }
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
    sessionStorage.clear();
    // Signal App.tsx to immediately halt music and reset player
    window.dispatchEvent(new CustomEvent('ytify_signout'));
  };

  const toggleLike = async (song: Song) => {
    const exists = userData.likedSongs.some(s => s.videoId === song.videoId);
    const updatedLiked = exists 
      ? userData.likedSongs.filter(s => s.videoId !== song.videoId)
      : [song, ...userData.likedSongs];

    const updated = { ...userData, likedSongs: updatedLiked };
    persistUserData(updated, user);
  };

  const addToHistory = async (song: Song) => {
    const filtered = (userData.history || []).filter(s => s.videoId !== song.videoId);
    const updatedHistory = [song, ...filtered].slice(0, 50);
    const updated: UserData = { ...userData, history: updatedHistory };
    persistUserData(updated, user);
  };

  const isLiked = (videoId: string) => {
    return userData.likedSongs.some(s => s.videoId === videoId);
  };

  const savePreferences = async (prefs: UserPreferences) => {
    const updated: UserData = { ...userData, preferences: prefs };
    persistUserData(updated, user);
    sessionStorage.clear();
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
    persistUserData(updated, user);
  };

  const deletePlaylist = async (id: string) => {
    const updatedPlaylists = (userData.playlists || []).filter(p => p.id !== id);
    const updated: UserData = { ...userData, playlists: updatedPlaylists };
    persistUserData(updated, user);
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
    persistUserData(updated, user);
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
    persistUserData(updated, user);
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
