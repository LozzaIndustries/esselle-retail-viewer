import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Settings, LogOut, Grid, BarChart2, QrCode, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onOpenProfile: () => void;
  logoSrc?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, onOpenProfile, logoSrc }) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-warm/20 flex flex-col z-40 hidden md:flex">
      {/* Brand Section - Updated to match provided brand image exactly */}
      <div className="h-40 flex flex-col items-center justify-center px-8 border-b border-warm/10 bg-white">
         {logoSrc ? (
            <img src={logoSrc} alt="Brand Logo" className="h-16 w-auto object-contain" />
         ) : (
            <div className="flex flex-col items-center text-dark group cursor-default">
                <BookOpen className="h-10 w-10 mb-4 opacity-90" strokeWidth={1} />
                <span className="font-serif text-2xl font-bold tracking-tight text-dark">Esselle Retail</span>
                <span className="text-[8px] mt-4 tracking-[0.3em] uppercase font-bold text-[#8e8d8a] whitespace-nowrap">Premium Publication Platform</span>
            </div>
         )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        <NavLink 
            to="/" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold shadow-sm' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <Grid size={18} />
            <span className="text-sm">Dashboard</span>
        </NavLink>

        <NavLink 
            to="/qrcodes" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold shadow-sm' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <QrCode size={18} />
            <span className="text-sm">QR Codes</span>
        </NavLink>

        <NavLink 
            to="/analytics" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold shadow-sm' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <BarChart2 size={18} />
            <span className="text-sm">Analytics</span>
        </NavLink>
        
        <NavLink 
            to="/branding" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold shadow-sm' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <Settings size={18} />
            <span className="text-sm">Branding</span>
        </NavLink>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-warm/10 bg-gray-50/30">
        <div 
            onClick={onOpenProfile}
            className="flex items-center gap-3 px-4 py-3 mb-2 cursor-pointer hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100 group"
        >
            <div className="w-9 h-9 rounded-full bg-dark text-white flex items-center justify-center text-sm font-bold shadow-md shadow-dark/10 overflow-hidden flex-shrink-0">
                {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    user.email?.charAt(0).toUpperCase()
                )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark truncate leading-none mb-1 group-hover:text-warm transition-colors">{user.displayName || 'Publisher'}</p>
                <p className="text-[10px] text-cool truncate opacity-70 uppercase tracking-tighter">My Account</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-cool hover:text-red-600 py-2 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
        >
            <LogOut size={14} />
            <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;