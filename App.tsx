import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import FlipbookViewer from './components/FlipbookViewer';
import QRModal from './components/QRModal';
import Login from './components/Login';
import BrandingSettings from './components/BrandingSettings';
import Analytics from './components/Analytics';
import { fetchBooklets, getBookletById, subscribeToAuth, logout, getBrandingSettings } from './services/firebase';
import { Booklet, User, AppSettings } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedBooklet, setSelectedBooklet] = useState<Booklet | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) loadData();
    getBrandingSettings().then(setAppSettings);
  }, [user]);

  const loadData = async () => {
    const data = await fetchBooklets();
    setBooklets(data);
  };

  // Hash Navigation - Only trigger if consciously navigating
  useEffect(() => {
    const checkHash = async () => {
      if (!user) return;
      const hash = window.location.hash;
      if (hash.includes('/view/')) {
        const id = hash.split('/view/')[1].split('?')[0];
        const found = await getBookletById(id);
        if (found) setSelectedBooklet(found);
      } else {
        setSelectedBooklet(null);
      }
    };
    window.addEventListener('hashchange', checkHash);
    checkHash(); // Run once to check initial deep link
    return () => window.removeEventListener('hashchange', checkHash);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (loadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white font-serif text-2xl animate-pulse text-dark">
        Lumière
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLoginSuccess={setUser} /> : <Navigate to="/" />} />
        
        <Route path="/" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Dashboard booklets={booklets} onView={(id) => window.location.hash = `/view/${id}`} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/analytics" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Analytics booklets={booklets} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        <Route path="/branding" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <BrandingSettings currentSettings={appSettings} onUpdate={setAppSettings} />
            </Layout>
          ) : <Navigate to="/login" />
        } />
      </Routes>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadComplete={(b) => { setBooklets([b, ...booklets]); setIsUploadOpen(false); }} 
      />

      {/* Viewer Overlay - Controlled by state, ensuring Dashboard stays loaded underneath */}
      {selectedBooklet && user && (
        <div className="fixed inset-0 z-[100]">
          <FlipbookViewer 
            booklet={selectedBooklet} 
            onClose={() => window.location.hash = '/'} 
            onShare={() => setIsShareOpen(true)}
          />
        </div>
      )}

      {selectedBooklet && (
        <QRModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          url={`${window.location.origin}${window.location.pathname}#/view/${selectedBooklet.id}`}
          title={selectedBooklet.title}
        />
      )}
    </Router>
  );
};

export default App;