import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate, useParams, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import FlipbookViewer from './components/FlipbookViewer';
import QRModal from './components/QRModal';
import Login from './components/Login';
import BrandingSettings from './components/BrandingSettings';
import Analytics from './components/Analytics';
import QRCodes from './components/QRCodes';
import PublicLibrary from './components/PublicLibrary';
import { fetchBooklets, getBookletById, subscribeToAuth, logout, getBrandingSettings, isAppInDemoMode } from './services/firebase';
import { Booklet, User, AppSettings } from './types';
import { AlertTriangle, Database, LogIn } from 'lucide-react';

// Robust URL Generator
const getShareUrl = (id: string) => {
  const baseUrl = window.location.href.split('#')[0];
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}/#/view/${id}`;
};

// --- Helper Component for the Viewer Route ---
const ViewerRoute = ({ booklets, isPublic }: { booklets: Booklet[], isPublic: boolean }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'error'>('loading');
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadBooklet = async () => {
      if (!id) {
        if (isMounted) setStatus('error');
        return;
      }

      // 1. Optimistic Check: Try to find it in the props list first (Instant)
      const found = booklets.find(b => b.id === id);
      if (found) {
        if (isMounted) {
          setBooklet(found);
          setStatus('found');
        }
        return;
      }

      // 2. Network Fetch: If not in props, fetch directly
      try {
        const fetched = await getBookletById(id);
        if (isMounted) {
          if (fetched) {
            setBooklet(fetched);
            setStatus('found');
          } else {
            setStatus('error');
          }
        }
      } catch (e) {
        console.error("Failed to load booklet", e);
        if (isMounted) setStatus('error');
      }
    };

    loadBooklet();

    return () => { isMounted = false; };
  }, [id, booklets]);

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0d0d] text-white/30 text-sm font-serif tracking-widest uppercase animate-pulse">
        Loading Publication...
      </div>
    );
  }

  if (status === 'error' || !booklet) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-white p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="font-serif text-xl text-white mb-2">Publication Not Found</h2>
        <p className="text-white/40 text-sm max-w-md mb-8">
          The booklet you are looking for has been removed, is set to draft, or is currently unavailable.
        </p>
        <div className="flex gap-4">
            <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest transition-colors"
            >
            Return Home
            </button>
            <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 border border-white/20 hover:bg-white/5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
            <LogIn size={14} /> Admin Login
            </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black">
        <FlipbookViewer 
          booklet={booklet} 
          onClose={() => navigate('/')} 
          onShare={() => setIsShareOpen(true)}
          isPublic={isPublic}
        />
      </div>
      <QRModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={getShareUrl(booklet.id)}
        title={booklet.title}
      />
    </>
  );
};

const DemoBanner = () => {
    if (!isAppInDemoMode()) return null;
    return (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs flex items-center justify-center gap-2 sticky top-0 z-[60]">
            <Database size={14} />
            <span className="font-bold">LOCAL DEMO MODE:</span>
            <span>App is NOT connected to Firebase. Data is saved to this browser only. Shared links will NOT work on other devices.</span>
        </div>
    );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const [editingBooklet, setEditingBooklet] = useState<Booklet | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    getBrandingSettings().then(setAppSettings).catch(console.error);
    
    const loadData = async () => {
        const isPublic = !user;
        const data = await fetchBooklets(undefined, isPublic);
        setBooklets(data);
    };

    if (!loadingAuth) {
        loadData();
    }
  }, [user, loadingAuth]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const handleUploadClick = () => {
    setEditingBooklet(null); 
    setIsUploadOpen(true);
  };

  const handleEditClick = (booklet: Booklet) => {
    setEditingBooklet(booklet);
    setIsUploadOpen(true);
  };

  const handleUploadComplete = (updatedBooklet: Booklet) => {
    setBooklets(prev => {
        const exists = prev.findIndex(b => b.id === updatedBooklet.id);
        if (exists >= 0) {
            const newList = [...prev];
            newList[exists] = updatedBooklet;
            return newList;
        }
        return [updatedBooklet, ...prev];
    });
    setIsUploadOpen(false);
    setEditingBooklet(null);
  };

  if (loadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white font-serif text-2xl animate-pulse text-dark">
        Esselle Retail
      </div>
    );
  }

  return (
    <Router>
      <DemoBanner />
      <Routes>
        <Route path="/view/:id" element={ 
           <ViewerRoute booklets={booklets} isPublic={!user} /> 
        } />

        <Route path="/login" element={!user ? <Login onLoginSuccess={setUser} logoSrc={appSettings.logoUrl} companyName={appSettings.companyName} /> : <Navigate to="/" />} />
        
        <Route path="/" element={
          user ? (
            <Layout user={user} onUploadClick={handleUploadClick} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Dashboard 
                booklets={booklets} 
                onView={(id) => window.location.hash = `/view/${id}`} 
                onEdit={handleEditClick}
              />
            </Layout>
          ) : (
            <PublicLibrary 
               booklets={booklets} 
               appSettings={appSettings}
               onView={(id) => window.location.hash = `/view/${id}`}
            />
          )
        } />

        <Route path="/analytics" element={
          user ? (
            <Layout user={user} onUploadClick={handleUploadClick} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Analytics booklets={booklets} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/qrcodes" element={
          user ? (
            <Layout user={user} onUploadClick={handleUploadClick} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <QRCodes booklets={booklets} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/branding" element={
          user ? (
            <Layout user={user} onUploadClick={handleUploadClick} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <BrandingSettings currentSettings={appSettings} onUpdate={setAppSettings} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {user && (
          <UploadModal 
            isOpen={isUploadOpen} 
            onClose={() => setIsUploadOpen(false)} 
            onUploadComplete={handleUploadComplete}
            initialBooklet={editingBooklet}
          />
      )}
    </Router>
  );
};

export default App;