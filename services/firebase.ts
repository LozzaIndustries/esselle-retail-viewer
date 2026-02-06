import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { Booklet, AppSettings } from '../types';

// Safe environment variable access
const getEnv = (key: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

// Check if we are in a development/preview environment
const isPreviewEnv = () => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || 
           h === '127.0.0.1' || 
           h.includes('webcontainer') || 
           h.includes('stackblitz') || 
           h.includes('bolt.new') ||
           h.includes('preview');
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
  },
  {
    id: 'demo-2',
    title: 'Modern Minimalism: Architecture',
    description: 'Exploring the intersection of structure and light in urban environments.',
    url: STABLE_PDF,
    coverUrl: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&q=80&w=800',
    createdAt: Date.now() - 86400000 * 5,
    ownerId: 'admin-user',
    status: 'published',
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
    status: 'draft',
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

export const isAppInDemoMode = () => isDemoMode;

// ----- AUTH SERVICE -----

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
    if (isDemoMode || !auth) {
        const demoUser = localStorage.getItem('demo_authed');
        setTimeout(() => {
            if (demoUser === 'true') {
                callback({ uid: 'admin-user', email: 'admin@esselleretail.com', displayName: 'Admin Publisher' } as any);
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
        return { uid: 'admin-user', email: 'admin@esselleretail.com', displayName: 'Admin Publisher' };
    }

    if (isDemoMode || !auth) {
        throw new Error("Invalid credentials. Please use admin / admin.");
    }

    return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    
    if (isDemoMode || !auth) {
        // Mock registration in demo mode
        localStorage.setItem('demo_authed', 'true');
        return { uid: `user_${Date.now()}`, email, displayName: email.split('@')[0] };
    }

    const cred = await createUserWithEmailAndPassword(auth, email, passwordInput);
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
    const getLocalData = () => {
        try {
            const local = localStorage.getItem('lumiere_booklets');
            const saved = local ? JSON.parse(local) : [];
            let merged = [...saved];
            
            // Only merge mocks if we are in a preview/development environment.
            if (isPreviewEnv()) {
                MOCK_BOOKLETS.forEach(mock => {
                    if (!merged.find(m => m.id === mock.id)) {
                        merged.push(mock);
                    }
                });
            }
            
            let results = merged.sort((a, b) => b.createdAt - a.createdAt);

            if (publicOnly) {
                const now = Date.now();
                results = results.filter(b => {
                    if (b.status === 'draft') return false;
                    if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt > now) return false;
                    return true;
                });
            }

            return results;
        } catch (e) {
            return isPreviewEnv() ? MOCK_BOOKLETS : [];
        }
    };

    // If we are explicitly in demo mode or have no DB, return demo content
    if (isDemoMode || !db) return getLocalData();

    try {
        let q;

        if (publicOnly) {
            // For production public fetch, we just fetch published items
            // Note: Scheduled items that have passed their date need a specific query or client-side filtering.
            // For simplicity in this structure, we'll fetch 'published' and client-side filter scheduled.
            q = query(collection(db, "booklets"), where("status", "in", ["published", "scheduled"]), orderBy("createdAt", "desc"));
        } else {
            // Admin Dashboard fetches everything
            q = ownerId 
                ? query(collection(db, "booklets"), where("ownerId", "==", ownerId), orderBy("createdAt", "desc"))
                : query(collection(db, "booklets"), orderBy("createdAt", "desc"));
        }
            
        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booklet));

        // Strict client-side filter for public views (handling scheduled times)
        if (publicOnly) {
            const now = Date.now();
            data = data.filter(b => {
                 if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt > now) return false;
                 return true;
            });
        }

        return data;
    } catch (e) {
        console.error("Fetch error:", e);
        return [];
    }
};

export const getBookletById = async (id: string): Promise<Booklet | null> => {
    let booklet: Booklet | null = null;

    // 1. Force check Mock Data in Preview Environment
    if (isPreviewEnv()) {
        const mock = MOCK_BOOKLETS.find(b => b.id === id);
        if (mock) booklet = mock;
    }

    // 2. Local Fallback / Demo Mode Check
    if (!booklet && (isDemoMode || !db)) {
        const all = await fetchBooklets();
        booklet = all.find(b => b.id === id) || null;
    }

    // 3. Firestore Production Check
    if (!booklet && !isDemoMode && db) {
        try {
            const docSnap = await getDoc(doc(db, "booklets", id));
            if (docSnap.exists()) booklet = { id: docSnap.id, ...docSnap.data() } as Booklet;
        } catch (e) {
            console.error("Get booklet error:", e);
        }
    }

    if (!booklet) return null;

    // --- SECURITY & VISIBILITY CHECK ---
    // If user is logged in (admin), they can see everything.
    if (isAuthenticated()) return booklet;

    // If public:
    // 1. Must NOT be 'draft'
    // 2. If 'scheduled', date must be in past
    if (booklet.status === 'draft') return null;
    
    if (booklet.status === 'scheduled' && booklet.scheduledAt) {
        if (Date.now() < booklet.scheduledAt) return null; // Not yet released
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
    const fileId = `up_${Date.now()}`;
    
    // DEMO MODE UPLOAD
    if (isDemoMode || !storage) {
        try {
            const pdfDataUrl = await mockUploadProcess(file, fileId, onProgress);
            let finalCoverUrl = DEFAULT_COVER;
            if (coverDataUrl && coverDataUrl.length < 2000000) { 
                finalCoverUrl = coverDataUrl;
            }

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
            } catch (e) { console.warn("Storage full"); }
            
            return newBooklet;
        } catch (e) {
            throw e;
        }
    }

    // PRODUCTION UPLOAD
    const storageRef = ref(storage, `booklets/${fileId}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            (err) => reject(err),
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                let finalCoverUrl = DEFAULT_COVER;
                if (coverDataUrl) {
                    try {
                        const coverRef = ref(storage, `covers/${fileId}.jpg`);
                        await uploadString(coverRef, coverDataUrl, 'data_url');
                        finalCoverUrl = await getDownloadURL(coverRef);
                    } catch (e) {}
                }

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
        
        // If updating file
        if (file) {
            const pdfData = await mockUploadProcess(file, bookletId, onProgress);
            updated.url = pdfData;
        } else {
            onProgress(100);
        }

        if (coverDataUrl) updated.coverUrl = coverDataUrl;

        booklets[idx] = updated;
        localStorage.setItem('lumiere_booklets', JSON.stringify(booklets));
        return updated;
    }

    // 2. Production Update
    const docRef = doc(db, 'booklets', bookletId);
    const updates: any = { ...metadata };

    if (file) {
        // We upload to a NEW path to avoid cache issues, but associate it with the SAME doc ID
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
    
    // Return updated object
    const finalDoc = await getDoc(docRef);
    return { id: finalDoc.id, ...finalDoc.data() } as Booklet;
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