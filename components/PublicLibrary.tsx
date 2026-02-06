import React from 'react';
import { Booklet, AppSettings } from '../types';
import { motion } from 'framer-motion';
import { Eye, Clock, FileText, BookOpen, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PublicLibraryProps {
  booklets: Booklet[];
  appSettings: AppSettings;
  onView: (id: string) => void;
}

const PublicLibrary: React.FC<PublicLibraryProps> = ({ booklets, appSettings, onView }) => {
  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col">
      {/* Public Header */}
      <header className="bg-white border-b border-warm/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {appSettings.logoUrl ? (
                <img src={appSettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
             ) : (
                <BookOpen className="h-8 w-8 text-dark" strokeWidth={1} />
             )}
             <span className="font-serif text-xl font-bold text-dark hidden sm:block">
                {appSettings.companyName || "Esselle Retail"}
             </span>
          </div>
          
          <Link to="/login" className="flex items-center gap-2 text-sm font-semibold text-cool hover:text-dark transition-colors px-4 py-2 rounded-full hover:bg-gray-50">
            <LogIn size={16} />
            <span>Admin Login</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-white pb-12 pt-16 px-6 text-center border-b border-warm/10">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
        >
            <h1 className="font-serif text-4xl md:text-5xl text-dark mb-4">Publication Library</h1>
            <p className="text-cool text-lg leading-relaxed">
                Browse our collection of digital catalogs, lookbooks, and reports.
            </p>
        </motion.div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {booklets.length === 0 ? (
            <div className="text-center py-20">
                <FileText className="mx-auto text-warm/30 mb-4" size={48} strokeWidth={1} />
                <p className="text-cool">No public publications available at the moment.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-16">
            {booklets.map((item, index) => (
                <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.5 }}
                className="group relative"
                >
                {/* Card Cover */}
                <div 
                    className="relative aspect-[3/4] mb-6 shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-dark/20 group-hover:-translate-y-2 cursor-pointer bg-white"
                    onClick={() => onView(item.id)}
                >
                    <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/5 transition-colors z-10" />
                    
                    {/* Book Spine Effect */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/10 z-20 shadow-inner" />
                    
                    {item.coverUrl ? (
                    <img 
                        src={item.coverUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover rounded-sm"
                    />
                    ) : (
                    <div className="w-full h-full bg-warm/20 flex items-center justify-center">
                        <span className="font-serif text-xl text-cool/40 uppercase tracking-tighter">Edition</span>
                    </div>
                    )}
                    
                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 gap-3">
                    <div className="bg-white/95 backdrop-blur-sm text-dark px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                        <Eye size={18} />
                        Read Now
                    </div>
                    </div>
                </div>

                {/* Meta Data */}
                <div className="space-y-2 px-1 pointer-events-none">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-warm uppercase tracking-[0.2em]">
                    <Clock size={10} />
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                    <h3 className="font-serif text-xl text-dark leading-snug truncate">
                    {item.title}
                    </h3>
                    <p className="text-sm text-cool/60 line-clamp-2 leading-relaxed h-10">
                    {item.description}
                    </p>
                </div>
                </motion.div>
            ))}
            </div>
        )}
      </div>

      <footer className="bg-white py-8 border-t border-warm/10 text-center">
        <p className="text-[10px] text-cool uppercase tracking-widest opacity-60">
            Powered by {appSettings.companyName || "Esselle Retail"}
        </p>
      </footer>
    </div>
  );
};

export default PublicLibrary;