// @ts-ignore
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, updateProfile } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, updateDoc, increment, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { Booklet, AppSettings } from '../types';

// --- CONFIGURATION ---
// We are HARDCODING the keys to ensure it connects to the live project.
const firebaseConfig = {
  apiKey: "AIzaSyD_3FRdlXO9dQEGNXXIRIllqKoOO-2tT8Q",
  authDomain: "esselle-publisher-b3bbf.firebaseapp.com",
  projectId: "esselle-publisher-b3bbf",
  storageBucket: "esselle-publisher-b3bbf.firebasestorage.app",
  messagingSenderId: "958825934813",
  appId: "1:958825934813:web:81d9fe905c96284ab91034"
};

// --- CONSTANTS ---
const LS_USER_KEY = 'esselle_demo_user';
const LS_DATA_KEY = 'esselle_demo_booklets';
const LS_SETTINGS_KEY = 'esselle_demo_settings';

// Fallback PDF for demo mode (Mozilla's PDF.js sample)
const DEMO_PDF_URL = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800';

// --- INITIALIZATION STATE ---
let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isDemo = false;

try {
    // 1. Initialize App
    // We check getApps() to ensure we don't double-initialize if HMR runs this module twice.
    // @ts-ignore
    const apps = typeof getApps === 'function' ? getApps() : [];
    
    // @ts-ignore
    app = !apps.length ? initializeApp(firebaseConfig) : (typeof getApp === 'function' ? getApp() : apps[0]);
    
    // 2. Initialize Services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    console.log("🔥 Firebase initialized successfully.");
} catch (e) {
    console.warn("⚠️ Firebase initialization failed. Switching to LOCAL DEMO MODE.", e);
    isDemo = true;
}

// Global accessor for UI to know if we are in demo mode
export const isAppInDemoMode = () => isDemo;

// --- UTILS ---
const cleanData = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            cleaned[key] = data[key];
        }
    });
    return cleaned;
};

// --- MOCK LOCALSTORAGE HELPERS ---
const getLocalBooklets = (): Booklet[] => {
    try {
        const str = localStorage.getItem(LS_DATA_KEY);
        return str ? JSON.parse(str) : [];
    } catch { return []; }
};

const setLocalBooklets = (data: Booklet[]) => {
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
};

// ----- AUTH SERVICE -----

export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
    if (isDemo || !auth) {
        // Fallback: Check localStorage for a fake user
        const checkLocal = () => {
            const stored = localStorage.getItem(LS_USER_KEY);
            if (stored) {
                callback(JSON.parse(stored));
            } else {
                callback(null);
            }
        };
        
        // Check immediately
        checkLocal();
        
        // Listen for login/logout events within the app
        window.addEventListener('esselle-auth-change', checkLocal);
        
        return () => {
            window.removeEventListener('esselle-auth-change', checkLocal);
        };
    }
    
    // Real Firebase Auth
    return onAuthStateChanged(auth, callback);
};

export const loginWithEmail = async (emailInput: string, passwordInput: string) => {
    if (isDemo || !auth) {
        // Mock Login
        if (emailInput === 'admin' && passwordInput === 'admin') {
            const fakeUser = { 
                uid: 'demo-admin-123', 
                email: 'admin@demo.local', 
                displayName: 'Demo Admin' 
            };
            localStorage.setItem(LS_USER_KEY, JSON.stringify(fakeUser));
            window.dispatchEvent(new Event('esselle-auth-change'));
            return fakeUser;
        }
        throw new Error("Demo Mode: Use 'admin' / 'admin'");
    }
    
    // Real Login
    // Admin backdoor for convenience in hybrid mode
    if (emailInput === 'admin' && passwordInput === 'admin') {
         return { uid: 'admin-user', email: 'admin@esselleretail.com', displayName: 'Admin Publisher' };
    }
    return signInWithEmailAndPassword(auth, emailInput, passwordInput);
};

export const registerWithEmail = async (emailInput: string, passwordInput: string, nameInput: string) => {
    if (isDemo || !auth) {
        const fakeUser = { 
            uid: `demo-user-${Date.now()}`, 
            email: emailInput, 
            displayName: nameInput 
        };
        localStorage.setItem(LS_USER_KEY, JSON.stringify(fakeUser));
        window.dispatchEvent(new Event('esselle-auth-change'));
        return fakeUser;
    }
    const cred = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
    await updateProfile(cred.user, { displayName: nameInput });
    return { ...cred.user, displayName: nameInput };
};

export const logout = async () => {
    if (isDemo || !auth) {
        localStorage.removeItem(LS_USER_KEY);
        window.dispatchEvent(new Event('esselle-auth-change'));
        window.location.reload();
        return;
    }
    await signOut(auth);
    window.location.reload();
};

// ----- DATA SERVICE -----

export const fetchBooklets = async (ownerId?: string, publicOnly: boolean = false): Promise<Booklet[]> => {
    if (isDemo || !db) {
        // Return local data
        let data = getLocalBooklets();
        if (publicOnly) {
            const now = Date.now();
            data = data.filter(b => {
                 if (b.status === 'draft') return false;
                 if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt > now) return false;
                 return true;
            });
        }
        // Sort desc
        return data.sort((a, b) => b.createdAt - a.createdAt);
    }

    try {
        const bookletsRef = collection(db, "booklets");
        const q = query(bookletsRef, orderBy("createdAt", "desc"));
            
        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booklet));

        if (publicOnly) {
            const now = Date.now();
            data = data.filter(b => {
                 if (b.status === 'draft') return false;
                 if (b.status === 'scheduled' && b.scheduledAt && b.scheduledAt > now) return false;
                 return true;
            });
        } else if (ownerId) {
            data = data.filter(b => b.ownerId === ownerId);
        }

        return data;
    } catch (e) {
        console.error("Fetch error, fallback to empty:", e);
        return [];
    }
};

export const getBookletById = async (id: string): Promise<Booklet | null> => {
    if (isDemo || !db) {
        const data = getLocalBooklets();
        const found = data.find(b => b.id === id);
        if (found) {
             if (found.status === 'draft') return null; // Simulate permission check?
             return found;
        }
        return null;
    }

    try {
        const docSnap = await getDoc(doc(db, "booklets", id));
        if (docSnap.exists()) {
             const booklet = { id: docSnap.id, ...docSnap.data() } as Booklet;
             if (booklet.status === 'draft') return null;
             if (booklet.status === 'scheduled' && booklet.scheduledAt) {
                if (Date.now() < booklet.scheduledAt) return null;
             }
             return booklet;
        }
        return null;
    } catch (e) {
        console.error("Get booklet error:", e);
        return null;
    }
};

export const uploadPDF = async (
    file: File, 
    metadata: { 
        title: string; 
        description: string; 
        ownerId: string;
        ownerName?: string;
        status: 'published' | 'draft' | 'scheduled';
        scheduledAt?: number | null;
    },
    onProgress: (progress: number) => void,
    coverDataUrl?: string | null
  ): Promise<Booklet> => {
    
    // --- DEMO MODE UPLOAD ---
    if (isDemo || !storage || !db) {
        return new Promise((resolve) => {
            // Simulate upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                onProgress(progress);
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    const newBooklet: Booklet = {
                        id: `local_${Date.now()}`,
                        title: metadata.title,
                        description: metadata.description,
                        status: metadata.status,
                        scheduledAt: metadata.scheduledAt,
                        createdAt: Date.now(),
                        ownerId: metadata.ownerId,
                        ownerName: metadata.ownerName,
                        // Use the stable PDF so it works across refreshes in demo mode
                        url: DEMO_PDF_URL, 
                        coverUrl: coverDataUrl || DEFAULT_COVER,
                        stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
                    };
                    
                    const current = getLocalBooklets();
                    setLocalBooklets([newBooklet, ...current]);
                    
                    resolve(newBooklet);
                }
            }, 200);
        });
    }

    // --- REAL UPLOAD ---
    const fileId = `up_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

                const finalMetadata = { ...metadata };
                if (finalMetadata.status !== 'scheduled') {
                    finalMetadata.scheduledAt = null;
                }

                const docRef = await addDoc(collection(db, "booklets"), cleanData({
                    ...finalMetadata,
                    url,
                    createdAt: serverTimestamp(),
                    coverUrl: finalCoverUrl,
                    stats: { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 }
                }));
                
                resolve({ 
                    id: docRef.id, 
                    ...finalMetadata, 
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
        scheduledAt?: number | null;
    },
    onProgress: (progress: number) => void,
    coverDataUrl?: string | null
): Promise<Booklet> => {
    
    // --- DEMO MODE UPDATE ---
    if (isDemo || !db) {
        const booklets = getLocalBooklets();
        const index = booklets.findIndex(b => b.id === bookletId);
        if (index === -1) throw new Error("Booklet not found locally");
        
        const updated = { ...booklets[index], ...cleanData(metadata) };
        
        if (file) {
            // Simulate file swap
            updated.url = DEMO_PDF_URL;
            onProgress(100);
        }
        if (coverDataUrl) {
            updated.coverUrl = coverDataUrl;
        }
        
        booklets[index] = updated;
        setLocalBooklets(booklets);
        return updated;
    }

    // --- REAL UPDATE ---
    if (!db) throw new Error("Database unavailable");
    const docRef = doc(db, 'booklets', bookletId);
    
    // 1. Prepare Updates
    const updates: any = { ...metadata };

    if (updates.status && updates.status !== 'scheduled') {
        updates.scheduledAt = null; 
    }

    const cleanedUpdates = cleanData(updates);

    // 2. Handle File Upload
    if (file) {
        if (!storage) throw new Error("Storage unavailable");
        const fileRef = `booklets/${bookletId}_v${Date.now()}`;
        const storageRef = ref(storage, fileRef);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed',
                (snap) => onProgress((snap.bytesTransferred / snap.totalBytes) * 100),
                (err) => reject(err),
                async () => {
                    cleanedUpdates.url = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve();
                }
            );
        });
    } else {
        onProgress(100);
    }

    if (coverDataUrl && storage) {
        try {
            const coverRef = ref(storage, `covers/${bookletId}_v${Date.now()}.jpg`);
            await uploadString(coverRef, coverDataUrl, 'data_url');
            cleanedUpdates.coverUrl = await getDownloadURL(coverRef);
        } catch (e) {}
    }

    await updateDoc(docRef, cleanedUpdates);
    
    const finalDoc = await getDoc(docRef);
    return { id: finalDoc.id, ...finalDoc.data() } as Booklet;
};

export const saveBrandingSettings = async (settings: AppSettings) => {
    if (isDemo || !db) {
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
        return;
    }
    await setDoc(doc(db, 'config', 'global_settings'), cleanData(settings), { merge: true });
};

export const getBrandingSettings = async (): Promise<AppSettings> => {
    if (isDemo || !db) {
        const str = localStorage.getItem(LS_SETTINGS_KEY);
        return str ? JSON.parse(str) : {};
    }
    try {
        const snap = await getDoc(doc(db, 'config', 'global_settings'));
        return snap.exists() ? snap.data() as AppSettings : {};
    } catch (e) {
        return {};
    }
};

export const uploadLogo = async (file: File): Promise<string> => {
    if (isDemo || !storage) {
        // Return a data URL for local storage
        return new Promise((resolve) => {
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
    if (isDemo || !db) {
        const booklets = getLocalBooklets();
        const index = booklets.findIndex(b => b.id === id);
        if (index !== -1) {
            const b = booklets[index];
            if (!b.stats) b.stats = { views: 0, uniqueReaders: 0, avgTimeSeconds: 0, shares: 0 };
            b.stats.views++;
            booklets[index] = b;
            setLocalBooklets(booklets);
        }
        return;
    }
    updateDoc(doc(db, 'booklets', id), { 'stats.views': increment(1) }).catch(() => {});
};
