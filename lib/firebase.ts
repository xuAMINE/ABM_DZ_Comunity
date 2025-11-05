// lib/firebase.ts
import { Platform } from 'react-native';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCeFl_K7F3rLL-g8pqo0Aqr8gP7ZcljOMo',
  authDomain: 'dzcommunity-d1f7e.firebaseapp.com',
  projectId: 'dzcommunity-d1f7e',
  storageBucket: 'dzcommunity-d1f7e.firebasestorage.app',
  messagingSenderId: '1079855544105',
  appId: '1:1079855544105:web:10df32d23ce18637922938',
};

const app: FirebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

let auth: Auth;

if (Platform.OS === 'web') {
  // Web: normal browser persistence
  auth = getAuth(app);
} else {
  // Native (Expo Go): initialize auth with AsyncStorage persistence
  // NOTE: use the main 'firebase/auth' (NOT the '/react-native' subpath)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fallback (no persistent login) if HMR re-runs or require fails
    auth = getAuth(app);
  }
}

const db: Firestore = getFirestore(app);

export { app, auth, db };
