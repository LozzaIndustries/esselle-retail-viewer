import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Booklet, AppSettings } from '../types';

// Safe environment variable access
const getEnv = (key: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

// --- CONFIGURATION ---
// REPLACE THESE with your actual Firebase project settings for live production
const firebaseConfig = {
  apiKey: getEnv('REACT_APP_FIREBASE_API_KEY', "demo-key"),
  authDomain: "lumiere-folio.firebaseapp.com",
  projectId: "lumiere-folio",
  storageBucket: "lumiere-folio.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// --- MOCK DATA FOR DEVELOPMENT ---
const STABLE_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';

const MOCK_BOOKLETS: Booklet[] = [
  {
    id: 'demo-1',
    title: 'Esselle Spring Collection 2025',
    description: 'A curated lookbook of upcoming seasonal trends and retail floor sets.',
    url: STABLE_PDF,
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now() - 86400000 * 2,
    ownerId: 'admin-user',
    stats: { views: 1240, uniqueReaders: 850, avgTimeSeconds: 185, shares: 45 }
  },
  {
    id: 'demo-2',
    title: 'Modern Minimalism: Architecture',
    description: 'Exploring the intersection of structure and light in urban environments.',
    url: STABLE_PDF,
    coverUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now() - 86400000 * 5,
    ownerId: 'admin-user',
    stats: { views: 3205, uniqueReaders: 2900, avgTimeSeconds: 240, shares: 120 }
  },
  {
    id: 'demo-3',
    title: 'Typographic Heritage',
    description: 'The history and evolution of serif typefaces in luxury publishing.',
    url: STABLE_PDF,
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now() - 86400000 * 10,
    ownerId: 'admin-user',
    stats: { views: 89, uniqueReaders: 45, avgTimeSeconds: 60, shares: 2 }
  }
];

// --- INITIALIZATION ---
let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isDemoMode = true; 

try {
  // Check if we have real credentials
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "demo-key" && !firebaseConfig.apiKey.includes("process.env")) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      isDemoMode = false;
      console.log("Firebase initialized in Production Mode.");
  } else {
      console.log("Firebase initialized in Demo Fallback Mode.");
  }
} catch (e) {
  console.warn("Firebase initialization error. Using local fallback.");
}

// ----- AUTH SERVICE -----

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
    if (isDemoMode || !auth) {
        const demoUser = localStorage.getItem('demo_authed');
        setTimeout(() => {
            if (demoUser === 'true') {
                callback({ uid: 'admin-user', email: 'admin@lumiere.com', displayName: 'Admin Publisher' } as any);
            } else {
                callback(null);
            }
        }, 50);
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

export const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    // Logic: If credentials are admin/admin OR we are in demo mode, treat as admin
    if (email === 'admin' && password === 'admin') {
        localStorage.setItem('demo_authed', 'true');
        return { uid: 'admin-user', email: 'admin@lumiere.com', displayName: 'Admin Publisher' };
    }

    if (isDemoMode || !auth) {
        throw new Error("Invalid credentials. Please use admin / admin.");
    }

    return signInWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
    localStorage.removeItem('demo_authed');
    if (auth) await signOut(auth);
    window.location.reload();
};

// ----- DATA SERVICE -----

export const fetchBooklets = async (ownerId?: string): Promise<Booklet[]> => {
    const getLocalData = () => {
        try {
            const local = localStorage.getItem('lumiere_booklets');
            const saved = local ? JSON.parse(local) : [];
            const merged = [...saved];
            MOCK_BOOKLETS.forEach(mock => {
                if (!merged.find(m => m.id === mock.id)) {
                    merged.push(mock);
                }
            });
            return merged.sort((a, b) => b.createdAt - a.createdAt);
        } catch (e) {
            return MOCK_BOOKLETS;
        }
    };

    // If we are explicitly in demo mode or have no DB, return demo content
    if (isDemoMode || !db) return getLocalData();

    try {
        const q = ownerId 
            ? query(collection(db, "booklets"), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"))
            : query(collection(db, "booklets"), orderBy("createdAt", "desc"));
            
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booklet));
        
        // CRITICAL FIX: If in production mode, we DO NOT fall back to demo data.
        // We only show what is actually in the database.
        return data;
    } catch (e) {
        console.error("Fetch error:", e);
        // On error in production, return empty to be safe
        return [];
    }
};

export const getBookletById = async (id: string): Promise<Booklet | null> => {
    if (isDemoMode || !db) {
        const all = await fetchBooklets();
        return all.find(b => b.id === id) || null;
    }

    try {
        const docSnap = await getDoc(doc(db, "booklets", id));
        if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Booklet;
        return null;
    } catch (e) {
        console.error("Get booklet error:", e);
        return null;
    }
};

export const uploadPDF = async (
    file: File, 
    metadata: { title: string; description: string, ownerId: string },
    onProgress: (progress: number) => void
  ): Promise<Booklet> => {
    const fileId = `up_${Date.now()}`;
    
    if (isDemoMode || !storage) {
        return new Promise((resolve) => {
            let p = 0;
            const interval = setInterval(() => {
                p += 20;
                onProgress(p);
                if (p >= 100) {
                    clearInterval(interval);
                    const newBooklet = {
                        id: fileId,
                        title: metadata.title,
                        description: metadata.description,
                        url: STABLE_PDF,
                        createdAt: Date.now(),
                        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800',
                        ownerId: metadata.ownerId,
                        stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
                    };
                    
                    const local = localStorage.getItem('lumiere_booklets');
                    const booklets = local ? JSON.parse(local) : [];
                    localStorage.setItem('lumiere_booklets', JSON.stringify([newBooklet, ...booklets]));
                    resolve(newBooklet);
                }
            }, 100);
        });
    }

    const storageRef = ref(storage, `booklets/${fileId}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                const docRef = await addDoc(collection(db, "booklets"), {
                    ...metadata,
                    url,
                    createdAt: serverTimestamp(),
                    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800',
                    stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
                });
                resolve({ id: docRef.id, ...metadata, url, createdAt: Date.now() });
            }
        );
    });
};

export const saveBrandingSettings = async (settings: AppSettings) => {
    if (isDemoMode || !db) {
        try {
            localStorage.setItem('lumiere_settings', JSON.stringify(settings));
        } catch (e) {
            console.error("Storage quota exceeded or error", e);
            throw new Error("Logo image is too large for browser storage.");
        }
        return;
    }
    await setDoc(doc(db, 'config', 'global_settings'), settings, { merge: true });
};

export const getBrandingSettings = async (): Promise<AppSettings> => {
    if (isDemoMode || !db) {
        try {
            const s = localStorage.getItem('lumiere_settings');
            return s ? JSON.parse(s) : {};
        } catch (e) {
            return {};
        }
    }
    try {
        const snap = await getDoc(doc(db, 'config', 'global_settings'));
        return snap.exists() ? snap.data() as AppSettings : {};
    } catch (e) {
        return {};
    }
};

export const uploadLogo = async (file: File): Promise<string> => {
    if (isDemoMode || !storage) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    }
    const storageRef = ref(storage, `branding/logo_${Date.now()}`);
    await uploadBytesResumable(storageRef, file);
    return getDownloadURL(storageRef);
};

export const recordView = async (id: string) => { 
    if (!isDemoMode && db) {
        updateDoc(doc(db, 'booklets', id), { 'stats.views': increment(1) }).catch(() => {});
    }
};