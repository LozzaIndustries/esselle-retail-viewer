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
}

const Layout: React.FC<LayoutProps> = ({ children, user, onUploadClick, onLogout, logoSrc }) => {
  // If no user, it's public view or login page, render minimal layout or none
  // But wait, the app structure puts Viewer outside of Layout usually.
  // This Layout is primarily for the Dashboard now.
  
  if (!user) {
    // Fallback/Public Header if needed (e.g. viewing a collection publicly)
    // For now, if no user, we assume the specific page handles its own layout or it's the login page
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[#f8f7f5] text-cool">
      
      {/* Sidebar for Desktop */}
      <Sidebar user={user} onLogout={onLogout} logoSrc={logoSrc} />

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
                        <span className="font-serif text-lg font-bold text-dark">Lumière</span>
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