import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  setDoc,
  onSnapshot
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
  searchHistory?: string[];
  playlists: { id: string; name: string; songs: Song[] }[];
  preferences?: UserPreferences;
  premiumExpiresAt?: number;
  premiumUtr?: string;
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
  addSearchHistory: (term: string) => Promise<void>;
  removeSearchHistory: (term: string) => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  activateAccountPremium: (utr: string) => Promise<void>;
}

const defaultUserData: UserData = {
  likedSongs: [],
  history: [],
  searchHistory: [],
  playlists: [],
  preferences: { artists: [], genres: [], languages: [] },
  premiumExpiresAt: 0
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
  const firestoreUnsubRef = useRef<(() => void) | null>(null);

  // Helper to persist data strictly for the active user account in Firestore & LocalCache
  const persistUserData = (updated: UserData, targetUser: UserProfile | null) => {
    setUserData(updated);
    const targetUid = targetUser?.uid || 'guest_session';
    try {
      localStorage.setItem(`ytify_data_${targetUid}`, JSON.stringify(updated));
      if (targetUser && !targetUser.isGuest) {
        const userRef = doc(db, 'users', targetUser.uid);
        setDoc(userRef, updated, { merge: true }).catch((err) => {
          console.warn('Firestore write sync error:', err);
        });
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

  // Listen to Firebase Auth state with REAL-TIME MULTI-DEVICE FIRESTORE SYNC
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous real-time listener if switching accounts
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }

      if (currentUser) {
        const profile: UserProfile = {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=15803d&color=fff&size=128&bold=true`
        };
        setUser(profile);
        localStorage.setItem('ytify_current_user', JSON.stringify(profile));

        // Real-time Firestore snapshot listener for this user
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          firestoreUnsubRef.current = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const remoteData = docSnap.data() as UserData;
              const merged: UserData = {
                likedSongs: remoteData.likedSongs || [],
                history: remoteData.history || [],
                searchHistory: remoteData.searchHistory || [],
                playlists: remoteData.playlists || [],
                preferences: remoteData.preferences || { artists: [], genres: [], languages: [] },
                premiumExpiresAt: remoteData.premiumExpiresAt || 0,
                premiumUtr: remoteData.premiumUtr || undefined
              };
              setUserData(merged);
              localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(merged));
            } else {
              // Initial document creation for new user
              setDoc(userDocRef, defaultUserData, { merge: true }).catch(() => {});
              setUserData(defaultUserData);
              localStorage.setItem(`ytify_data_${currentUser.uid}`, JSON.stringify(defaultUserData));
            }
          }, (err) => {
            console.warn('Firestore onSnapshot listener error:', err);
          });
        } catch (err) {
          console.warn('Firestore sync init error:', err);
        }
      } else {
        // User signed out or guest mode
        setUser(null);
        localStorage.removeItem('ytify_current_user');
        setUserData(defaultUserData);
      }
    });

    return () => {
      unsubscribeAuth();
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
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
      }
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        console.warn('Google sign in notice:', error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailUser = (email: string, name?: string) => {
    const uid = 'usr_' + btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    const displayName = name || email.split('@')[0];
    const profile: UserProfile = {
      uid,
      name: displayName,
      email,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=15803d&color=fff&size=128&bold=true`
    };
    setUser(profile);
    localStorage.setItem('ytify_current_user', JSON.stringify(profile));

    const saved = localStorage.getItem(`ytify_data_${uid}`);
    if (saved) {
      try {
        setUserData(JSON.parse(saved));
      } catch {
        setUserData(defaultUserData);
      }
    } else {
      setUserData(defaultUserData);
    }
  };

  const continueAsGuest = () => {
    const guestUser: UserProfile = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest Listener',
      email: '',
      photoURL: '',
      isGuest: true
    };
    setUser(guestUser);
    localStorage.setItem('ytify_current_user', JSON.stringify(guestUser));
    setUserData(defaultUserData);
  };

  const signOut = async () => {
    try {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      await fbSignOut(auth);
    } catch {}
    setUser(null);
    localStorage.removeItem('ytify_current_user');
    setUserData(defaultUserData);
  };

  const toggleLike = async (song: Song) => {
    const isAlreadyLiked = userData.likedSongs.some(s => s.videoId === song.videoId);
    const updatedLiked = isAlreadyLiked
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

  const addSearchHistory = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const current = userData.searchHistory || [];
    const updated = [trimmed, ...current.filter(i => i.toLowerCase() !== trimmed.toLowerCase())].slice(0, 20);
    const updatedData: UserData = { ...userData, searchHistory: updated };
    persistUserData(updatedData, user);
  };

  const removeSearchHistory = async (term: string) => {
    const current = userData.searchHistory || [];
    const updated = current.filter(i => i !== term);
    const updatedData: UserData = { ...userData, searchHistory: updated };
    persistUserData(updatedData, user);
  };

  const clearSearchHistory = async () => {
    const updatedData: UserData = { ...userData, searchHistory: [] };
    persistUserData(updatedData, user);
  };

  const activateAccountPremium = async (utr: string) => {
    if (!user || user.isGuest) {
      throw new Error('Please sign in with Google to link your 2-month Premium subscription.');
    }
    const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + twoMonthsMs;
    const updated: UserData = {
      ...userData,
      premiumExpiresAt: expiresAt,
      premiumUtr: utr
    };
    persistUserData(updated, user);

    try {
      const subRef = doc(db, 'premium_subscriptions', utr);
      await setDoc(subRef, {
        utr,
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.name || 'User',
        amount: 10,
        plan: '2_months',
        upiId: '8902281688@mbk',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        status: 'active'
      }, { merge: true });
    } catch (e) {
      console.warn('Subscription ledger error:', e);
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
      removeSongFromPlaylist,
      addSearchHistory,
      removeSearchHistory,
      clearSearchHistory,
      activateAccountPremium
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
