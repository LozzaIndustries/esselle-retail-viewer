import React from 'react';
import { BookOpen, Upload, User as UserIcon, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onUploadClick: () => void;
  onLogout: () => void;
  logoSrc?: string;
  // This prop is actually passed from App.tsx via a cloneElement or prop drilling if structured differently. 
  // However, in App.tsx we are doing <Layout ...> manually.
  // We need to update App.tsx to pass onOpenProfile prop, but Layout definition needs to accept it first.
}

// In App.tsx, the Layout component is used like:
// <Layout user={user} onUploadClick={handleUploadClick} onLogout={handleLogout} logoSrc={...}>

// We need to modify App.tsx to pass onOpenProfile as well. 
// But first, let's update Layout to accept any additional props or explicitly define onOpenProfile.

// Since I cannot change App.tsx and Layout.tsx simultaneously in one atomic <change> block without returning App.tsx again (which I did above),
// I will assume App.tsx will be updated to pass `onOpenProfile={() => setIsAccountOpen(true)}`.

// Wait, I updated App.tsx in the previous block but I missed adding `onOpenProfile` to the `<Layout>` usage in the JSX.
// I need to correct App.tsx in the next step or re-do App.tsx content.
// Actually, looking at my App.tsx content above, I DID NOT add onOpenProfile to the <Layout> tags.
// I will fix App.tsx in a subsequent step if I can, or re-output App.tsx correctly here.
// To be safe, I will update Layout here to optionally take it, and then re-output App.tsx with the prop passed.

const Layout: React.FC<LayoutProps & { onOpenProfile?: () => void }> = ({ children, user, onUploadClick, onLogout, logoSrc, onOpenProfile }) => {
  
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[#f8f7f5] text-cool">
      
      {/* Sidebar for Desktop */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        logoSrc={logoSrc} 
        onOpenProfile={onOpenProfile || (() => {})} 
      />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-warm/20 flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
                {logoSrc ? (
                    <img src={logoSrc} alt="Logo" className="h-8 w-auto" />
                ) : (
                    <>
                        <BookOpen className="h-6 w-6 text-dark" />
                        <span className="font-serif text-lg font-bold text-dark">Esselle Retail</span>
                    </>
                )}
            </div>
            <button className="p-2 text-dark">
                <Menu size={24} />
            </button>
        </header>

        {/* Desktop Header / Action Bar */}
        <header className="hidden md:flex h-20 items-center justify-between px-8 bg-white/50 backdrop-blur-sm sticky top-0 z-30 border-b border-warm/10">
            <div className="font-serif text-xl text-dark">
                {/* Could be breadcrumbs, currently empty or context aware */}
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={onUploadClick}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark text-white text-sm font-semibold shadow-lg shadow-dark/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                    <Upload className="w-4 h-4" />
                    <span>Upload PDF</span>
                </button>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow w-full overflow-x-hidden">
          {children}
        </main>
      </div>

    </div>
  );
};

export default Layout;