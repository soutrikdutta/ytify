import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';

// Official Config from your Firebase Project 'ytify-c18ed'
export const firebaseConfig = {
  projectId: "ytify-c18ed",
  appId: "1:261417286363:web:5b4fd30a6582277fb76afe",
  storageBucket: "ytify-c18ed.firebasestorage.app",
  apiKey: "AIzaSyCnjYRViNVoiSOzl682ISJXb8G2hBddkvc",
  authDomain: "ytify-c18ed.firebaseapp.com",
  messagingSenderId: "261417286363",
  measurementId: "G-QHVT5YZDZG"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to ensure smooth Google OAuth
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  type User,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove 
};
