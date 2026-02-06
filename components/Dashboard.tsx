import React from 'react';
import { Booklet } from '../types';
import { motion } from 'framer-motion';
import { Eye, Clock, FileText, ChevronRight } from 'lucide-react';

interface DashboardProps {
  booklets: Booklet[];
  onView: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ booklets, onView }) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-dark mb-2">My Publications</h1>
          <p className="text-cool/70 font-medium">Manage and monitor your digital folio performance.</p>
        </div>
        <div className="flex gap-4 text-sm font-semibold uppercase tracking-widest text-cool/50">
          <span>{booklets.length} Documents</span>
        </div>
      </header>

      {booklets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm/20 p-20 text-center shadow-sm">
          <FileText className="mx-auto text-warm/30 mb-6" size={64} strokeWidth={1} />
          <h2 className="font-serif text-2xl text-dark mb-2">Folio is Empty</h2>
          <p className="text-cool max-w-sm mx-auto mb-8">Ready to transform your PDFs into high-fidelity digital booklets?</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-16">
          {booklets.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              className="group cursor-pointer"
              onClick={() => onView(item.id)}
            >
              {/* Premium Card Cover */}
              <div className="relative aspect-[3/4] mb-6 shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-dark/20 group-hover:-translate-y-2">
                <div className="absolute inset-0 bg-dark/5 group-hover:bg-dark/0 transition-colors z-10" />
                
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
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <div className="bg-white/95 backdrop-blur-sm text-dark px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                    <Eye size={18} />
                    View Edition
                  </div>
                </div>
              </div>

              {/* Meta Data */}
              <div className="space-y-2 px-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-warm uppercase tracking-[0.2em]">
                  <Clock size={10} />
                  {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </div>
                <h3 className="font-serif text-xl text-dark leading-snug group-hover:text-cool transition-colors truncate">
                  {item.title}
                </h3>
                <p className="text-sm text-cool/60 line-clamp-2 leading-relaxed h-10">
                  {item.description}
                </p>
                <div className="pt-4 flex items-center gap-1 text-xs font-bold text-dark opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Analytics <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;