import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { Booklet, AppSettings } from '../types';

// --- CONFIGURATION HELPER ---
const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Squelch errors in environments where import.meta is restricted
  }
  return undefined;
};

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// --- MOCK DATA ---
const STABLE_PDF = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800';

const MOCK_BOOKLETS: Booklet[] = [
  {
    id: 'demo-1',
    title: 'Esselle Spring Collection 2025',
    description: 'A curated lookbook of upcoming seasonal trends and retail floor sets.',
    url: STABLE_PDF,
    coverUrl: DEFAULT_COVER,
    createdAt: Date.now() - 86400000 * 2,
    ownerId: 'admin-user',
    status: 'published',
    stats: { views: 1240, uniqueReaders: 850, avgTimeSeconds: 185, shares: 45 }
  }
];

// --- INITIALIZATION ---
let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isDemoMode = true; 

try {
  // Validate essential config
  // We check if the key exists and is not an empty string placeholder
  const hasKeys = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey.length > 0;
  
  if (hasKeys) {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
      isDemoMode = false;
      console.log("🔥 Firebase initialized in PRODUCTION Mode.");
  } else {
      console.group("⚠️ Firebase Config Missing - Falling back to DEMO Mode");
      console.warn("The application is running in local demo mode because Firebase credentials were not found.");
      console.warn("To enable persistence, add VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc. to your .env file.");
      console.groupEnd();
  }
} catch (e) {
  console.error("Firebase initialization critical error:", e);
}

export const isAppInDemoMode = () => isDemoMode;

// ----- AUTH SERVICE -----

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
    if (isDemoMode || !auth) {
        const demoUser = localStorage.getItem('demo_authed');
        // Simulate async behavior
        const tm = setTimeout(() => {
            if (demoUser === 'true') {
                callback({ uid: 'admin-user', email: 'admin@esselleretail.com', displayName: 'Admin Publisher' } as any);
            } else {
                callback(null);
            }
        }, 50);
        return () => clearTimeout(tm);
    }
    return onAuthStateChanged(auth, callback);
};

export const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    // Admin backdoor for demo or fallback
    if (email === 'admin' && password === 'admin') {
        localStorage.setItem('demo_authed', 'true');
        return { uid: 'admin-user', email: 'admin@esselleretail.com', displayName: 'Admin Publisher' };
    }

    if (isDemoMode || !auth) {
        throw new Error("Invalid credentials. In Demo Mode, use admin / admin.");
    }

    return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (emailInput: string, passwordInput: string) => {
    if (isDemoMode || !auth) {
        const email = emailInput.trim().toLowerCase();
        localStorage.setItem('demo_authed', 'true');
        return { uid: `user_${Date.now()}`, email, displayName: email.split('@')[0] };
    }
    const cred = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
    return cred.user;
};

export const logout = async () => {
    localStorage.removeItem('demo_authed');
    if (auth) await signOut(auth);
    window.location.reload();
};

const isAuthenticated = () => {
    if (isDemoMode) return localStorage.getItem('demo_authed') === 'true';
    return !!auth?.currentUser;
};

// ----- DATA SERVICE -----

export const fetchBooklets = async (ownerId?: string, publicOnly: boolean = false): Promise<Booklet[]> => {
    // 1. Fallback / Local Storage
    const getLocalData = () => {
        try {
            const local = localStorage.getItem('lumiere_booklets');
            const saved = local ? JSON.parse(local) : [];
            // Merge with mock if empty for demo purposes
            if (saved.length === 0) return MOCK_BOOKLETS;
            return saved.sort((a: Booklet, b: Booklet) => b.createdAt - a.createdAt);
        } catch (e) {
            return MOCK_BOOKLETS;
        }
    };

    if (isDemoMode || !db) return getLocalData();

    // 2. Production Firestore
    try {
        let q;
        const bookletsRef = collection(db, "booklets");

        if (publicOnly) {
            q = query(bookletsRef, where("status", "in", ["published", "scheduled"]), orderBy("createdAt", "desc"));
        } else {
            q = ownerId 
                ? query(bookletsRef, where("ownerId", "==", ownerId), orderBy("createdAt", "desc"))
                : query(bookletsRef, orderBy("createdAt", "desc"));
        }
            
        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booklet));

        // Filter out future scheduled items on client side
        if (publicOnly) {
            const now = Date.now();
            data = data.filter(b => {
                 if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt > now) return false;
                 return true;
            });
        }

        return data;
    } catch (e) {
        console.error("Fetch error, falling back to local:", e);
        return getLocalData();
    }
};

export const getBookletById = async (id: string): Promise<Booklet | null> => {
    let booklet: Booklet | null = null;

    // 1. Try Firestore
    if (!isDemoMode && db) {
        try {
            const docSnap = await getDoc(doc(db, "booklets", id));
            if (docSnap.exists()) {
                booklet = { id: docSnap.id, ...docSnap.data() } as Booklet;
            }
        } catch (e) {
            console.error("Get booklet error:", e);
        }
    }

    // 2. Try Local/Mock if not found in DB or if in Demo mode
    if (!booklet) {
        const localData = localStorage.getItem('lumiere_booklets');
        const allLocal = localData ? JSON.parse(localData) : MOCK_BOOKLETS;
        booklet = allLocal.find((b: Booklet) => b.id === id) || null;
    }

    if (!booklet) return null;

    // Visibility Check
    if (isAuthenticated()) return booklet;

    if (booklet.status === 'draft') return null;
    if (booklet.status === 'scheduled' && booklet.scheduledAt) {
        if (Date.now() < booklet.scheduledAt) return null;
    }

    return booklet;
};

// Internal helper for demo/mock uploads
const mockUploadProcess = (file: File, id: string, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            let p = 0;
            const interval = setInterval(() => {
                p += 20;
                onProgress(p);
                if (p >= 100) {
                    clearInterval(interval);
                    resolve(reader.result as string);
                }
            }, 100);
        };
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
    });
};

export const uploadPDF = async (
    file: File, 
    metadata: { 
        title: string; 
        description: string; 
        ownerId: string;
        status: 'published' | 'draft' | 'scheduled';
        scheduledAt?: number;
    },
    onProgress: (progress: number) => void,
    coverDataUrl?: string | null
  ): Promise<Booklet> => {
    const fileId = `up_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // DEMO MODE UPLOAD
    if (isDemoMode || !storage) {
        try {
            const pdfDataUrl = await mockUploadProcess(file, fileId, onProgress);
            let finalCoverUrl = DEFAULT_COVER;
            if (coverDataUrl) finalCoverUrl = coverDataUrl;

            const newBooklet: Booklet = {
                id: fileId,
                title: metadata.title,
                description: metadata.description,
                url: pdfDataUrl,
                createdAt: Date.now(),
                coverUrl: finalCoverUrl,
                ownerId: metadata.ownerId,
                status: metadata.status,
                scheduledAt: metadata.scheduledAt,
                stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
            };
            
            try {
                const local = localStorage.getItem('lumiere_booklets');
                const booklets = local ? JSON.parse(local) : [];
                localStorage.setItem('lumiere_booklets', JSON.stringify([newBooklet, ...booklets]));
            } catch (e) { 
                console.error("Storage full or quota exceeded", e);
                throw new Error("Local Demo Storage Full! PDF is too large for browser storage. Please connect to Firebase for unlimited storage.");
            }
            
            return newBooklet;
        } catch (e) {
            throw e;
        }
    }

    // PRODUCTION UPLOAD
    // 1. Upload PDF
    const storageRef = ref(storage, `booklets/${fileId}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                
                // 2. Upload Cover if exists
                let finalCoverUrl = DEFAULT_COVER;
                if (coverDataUrl) {
                    try {
                        const coverRef = ref(storage, `covers/${fileId}.jpg`);
                        await uploadString(coverRef, coverDataUrl, 'data_url');
                        finalCoverUrl = await getDownloadURL(coverRef);
                    } catch (e) {
                        console.error("Cover upload failed", e);
                    }
                }

                // 3. Save Metadata to Firestore
                const docRef = await addDoc(collection(db, "booklets"), {
                    ...metadata,
                    url,
                    createdAt: serverTimestamp(),
                    coverUrl: finalCoverUrl,
                    stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
                });
                
                resolve({ 
                    id: docRef.id, 
                    ...metadata, 
                    url, 
                    createdAt: Date.now(),
                    coverUrl: finalCoverUrl 
                });
            }
        );
    });
};

export const updateBooklet = async (
    bookletId: string,
    file: File | null,
    metadata: { 
        title: string; 
        description: string;
        status?: 'published' | 'draft' | 'scheduled';
        scheduledAt?: number;
    },
    onProgress: (progress: number) => void,
    coverDataUrl?: string | null
): Promise<Booklet> => {
    // 1. Handle Demo Mode Update
    if (isDemoMode || !db) {
        const local = localStorage.getItem('lumiere_booklets');
        if (!local) throw new Error("No local data");
        const booklets: Booklet[] = JSON.parse(local);
        const idx = booklets.findIndex(b => b.id === bookletId);
        if (idx === -1) throw new Error("Booklet not found locally");

        const updated = { ...booklets[idx], ...metadata };
        
        if (file) {
            const pdfData = await mockUploadProcess(file, bookletId, onProgress);
            updated.url = pdfData;
        } else {
            onProgress(100);
        }

        if (coverDataUrl) updated.coverUrl = coverDataUrl;

        try {
            booklets[idx] = updated;
            localStorage.setItem('lumiere_booklets', JSON.stringify(booklets));
        } catch (e) {
             console.error("Storage full or quota exceeded", e);
             throw new Error("Local Demo Storage Full! PDF is too large for browser storage. Please connect to Firebase.");
        }
        return updated;
    }

    // 2. Production Update
    const docRef = doc(db, 'booklets', bookletId);
    const updates: any = { ...metadata };

    if (file) {
        const fileRef = `booklets/${bookletId}_v${Date.now()}`;
        const storageRef = ref(storage, fileRef);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
                (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
                (err) => reject(err),
                async () => {
                    updates.url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve();
                }
            );
        });
    } else {
        onProgress(100);
    }

    if (coverDataUrl) {
        try {
            const coverRef = ref(storage, `covers/${bookletId}_v${Date.now()}.jpg`);
            await uploadString(coverRef, coverDataUrl, 'data_url');
            updates.coverUrl = await getDownloadURL(coverRef);
        } catch (e) {}
    }

    await updateDoc(docRef, updates);
    
    // Return updated object by fetching fresh
    const finalDoc = await getDoc(docRef);
    return { id: finalDoc.id, ...finalDoc.data() } as Booklet;
};

export const saveBrandingSettings = async (settings: AppSettings) => {
    if (isDemoMode || !db) {
        try {
            localStorage.setItem('lumiere_settings', JSON.stringify(settings));
        } catch (e) {
            console.error("Storage quota exceeded", e);
            // We don't throw here to avoid blocking UI for simple settings, but we log it.
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
        } catch (e) { return {}; }
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
        try {
            await updateDoc(doc(db, 'booklets', id), { 'stats.views': increment(1) });
        } catch(e) {}
    }
};