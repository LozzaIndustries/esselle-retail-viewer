import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Settings, LogOut, Grid, BarChart2 } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  logoSrc?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, logoSrc }) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-warm/20 flex flex-col z-40 hidden md:flex">
      {/* Brand */}
      <div className="h-20 flex items-center px-8 border-b border-warm/10">
         {logoSrc ? (
            <img src={logoSrc} alt="Brand Logo" className="h-8 w-auto object-contain" />
         ) : (
            <div className="flex items-center gap-2 text-dark">
                <BookOpen className="h-6 w-6" strokeWidth={1} />
                <span className="font-serif text-xl font-bold tracking-tight">Lumière</span>
            </div>
         )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-8 space-y-2">
        <NavLink 
            to="/" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <Grid size={20} />
            <span>Dashboard</span>
        </NavLink>

        <NavLink 
            to="/analytics" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <BarChart2 size={20} />
            <span>Analytics</span>
        </NavLink>
        
        <NavLink 
            to="/branding" 
            className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-warm/10 text-dark font-semibold' : 'text-cool hover:bg-gray-50 hover:text-dark'
                }`
            }
        >
            <Settings size={20} />
            <span>Branding</span>
        </NavLink>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-warm/10">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-dark text-white flex items-center justify-center text-xs font-bold">
                {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-dark truncate">{user.displayName || 'Publisher'}</p>
                <p className="text-xs text-cool truncate">{user.email}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-cool hover:text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors"
        >
            <LogOut size={16} />
            <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;