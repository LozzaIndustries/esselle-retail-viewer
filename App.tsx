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
import { fetchBooklets, getBookletById, subscribeToAuth, logout, getBrandingSettings } from './services/firebase';
import { Booklet, User, AppSettings } from './types';

// --- Helper Component for the Viewer Route ---
// This grabs the ID from the URL and finds the correct booklet
const ViewerRoute = ({ booklets }: { booklets: Booklet[] }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booklet, setBooklet] = useState<Booklet | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    // 1. Try to find it in the already loaded list
    const found = booklets.find(b => b.id === id);
    if (found) {
      setBooklet(found);
    } else if (id) {
      // 2. If not found (e.g. direct link refresh), fetch it from Firebase
      getBookletById(id).then(b => {
        if (b) setBooklet(b);
        else navigate('/'); // Invalid ID? Go home.
      });
    }
  }, [id, booklets, navigate]);

  if (!booklet) return <div className="h-screen flex items-center justify-center text-white">Loading Viewer...</div>;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black">
        <FlipbookViewer 
          booklet={booklet} 
          onClose={() => navigate('/')} 
          onShare={() => setIsShareOpen(true)}
        />
      </div>
      <QRModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={`${window.location.origin}/#/view/${booklet.id}`}
        title={booklet.title}
      />
    </>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [booklets, setBooklets] = useState<Booklet[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  // Data Loader
  useEffect(() => {
    // FIXED: Always load branding settings regardless of auth state so Login screen can be branded
    getBrandingSettings().then(setAppSettings).catch(console.error);

    if (user) {
      fetchBooklets().then(setBooklets).catch(console.error);
    }
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
        {/* Public Login Route - Now accepts branding props */}
        <Route path="/login" element={!user ? <Login onLoginSuccess={setUser} logoSrc={appSettings.logoUrl} companyName={appSettings.companyName} /> : <Navigate to="/" />} />
        
        {/* Protected Dashboard Route */}
        <Route path="/" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Dashboard booklets={booklets} onView={(id) => window.location.hash = `/view/${id}`} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        {/* Analytics Route */}
        <Route path="/analytics" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <Analytics booklets={booklets} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        {/* Branding Route */}
        <Route path="/branding" element={
          user ? (
            <Layout user={user} onUploadClick={() => setIsUploadOpen(true)} onLogout={handleLogout} logoSrc={appSettings.logoUrl}>
              <BrandingSettings currentSettings={appSettings} onUpdate={setAppSettings} />
            </Layout>
          ) : <Navigate to="/login" />
        } />

        {/* Viewer Route */}
        <Route path="/view/:id" element={
           user ? <ViewerRoute booklets={booklets} /> : <Navigate to="/login" />
        } />

        {/* Catch-all: If route unknown, go Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadComplete={(b) => { setBooklets([b, ...booklets]); setIsUploadOpen(false); }} 
      />
    </Router>
  );
};

export default App;