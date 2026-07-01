import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAI, getGenerativeModel } from 'firebase/ai';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// App Check must be initialized before other services
if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) {
    console.log('App Check debug token:', import.meta.env.VITE_APPCHECK_DEBUG_TOKEN);
    // Debug token for local development only — never ships to production
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LcGBEAtAAAAABnsoIecw1-Zk_hYwk0ERC2-yqjt'),
    isTokenAutoRefreshEnabled: true,
  });
}

const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

const ai = getAI(app);
const aiModel = getGenerativeModel(ai, {
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

export { app, db, auth, provider, storage, aiModel };
