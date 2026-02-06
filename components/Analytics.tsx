import React from 'react';
import { Booklet } from '../types';
import { Eye, Users, Clock, Share2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsProps {
  booklets: Booklet[];
}

const Analytics: React.FC<AnalyticsProps> = ({ booklets }) => {
  // Aggregate Metrics
  const totalViews = booklets.reduce((acc, curr) => acc + (curr.stats?.views || 0), 0);
  const totalReaders = booklets.reduce((acc, curr) => acc + (curr.stats?.uniqueReaders || 0), 0);
  const totalShares = booklets.reduce((acc, curr) => acc + (curr.stats?.shares || 0), 0);
  
  // Weighted Average for Reading Time
  const avgTime = booklets.length > 0 
    ? Math.round(booklets.reduce((acc, curr) => acc + (curr.stats?.avgTimeSeconds || 0), 0) / booklets.length)
    : 0;

  // Sort top performing booklets
  const topBooklets = [...booklets].sort((a, b) => (b.stats?.views || 0) - (a.stats?.views || 0)).slice(0, 5);

  // Mock Trend Data Generation (Custom SVG Line Chart)
  // Generating a smooth curve
  const points = [10, 25, 18, 40, 35, 60, 55, 80, 75, 90, 85, 100];
  const width = 1000;
  const height = 200;
  const step = width / (points.length - 1);
  
  // Construct path string
  const pathData = points.map((p, i) => {
    const x = i * step;
    const y = height - (p / 100 * height);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const fillPath = `${pathData} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-dark">Analytics</h1>
        <p className="text-cool mt-1">Track engagement across all your publications</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatsCard 
            title="Total Views" 
            value={totalViews.toLocaleString()} 
            icon={<Eye size={20} />} 
            trend="+12%" 
        />
        <StatsCard 
            title="Unique Readers" 
            value={totalReaders.toLocaleString()} 
            icon={<Users size={20} />} 
            trend="+8%" 
        />
        <StatsCard 
            title="Avg. Read Time" 
            value={`${Math.floor(avgTime / 60)}m ${avgTime % 60}s`} 
            icon={<Clock size={20} />} 
            trend="+5%" 
        />
        <StatsCard 
            title="Total Shares" 
            value={totalShares.toLocaleString()} 
            icon={<Share2 size={20} />} 
            trend="+24%" 
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-warm/20 p-8 mb-12 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-xl text-dark">Engagement Trends (30 Days)</h2>
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                <TrendingUp size={16} />
                <span>+22.4% vs last month</span>
            </div>
        </div>
        
        {/* Simple SVG Line Chart */}
        <div className="w-full h-48 relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#bfb8af" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#bfb8af" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Fill Area */}
                <motion.path 
                    d={fillPath} 
                    fill="url(#gradient)" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                />

                {/* Stroke Line */}
                <motion.path 
                    d={pathData} 
                    fill="none" 
                    stroke="#53565a" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Points */}
                {points.map((p, i) => (
                    <motion.circle 
                        key={i}
                        cx={i * step}
                        cy={height - (p / 100 * height)}
                        r="4"
                        fill="#332f21"
                        stroke="white"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1 + (i * 0.1) }}
                    />
                ))}
            </svg>
            
            {/* X-Axis Labels Mockup */}
            <div className="flex justify-between mt-4 text-xs text-cool/60 font-mono">
                <span>Day 1</span>
                <span>Day 7</span>
                <span>Day 14</span>
                <span>Day 21</span>
                <span>Today</span>
            </div>
        </div>
      </div>

      {/* Top Documents Table */}
      <div className="bg-white rounded-xl shadow-sm border border-warm/20 overflow-hidden">
        <div className="px-8 py-6 border-b border-warm/10">
            <h2 className="font-serif text-xl text-dark">Top Performing Publications</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-cool uppercase tracking-wider border-b border-warm/10">
                        <th className="px-8 py-4">Document Title</th>
                        <th className="px-8 py-4">Views</th>
                        <th className="px-8 py-4">Unique Readers</th>
                        <th className="px-8 py-4">Avg. Time</th>
                        <th className="px-8 py-4">Shares</th>
                        <th className="px-8 py-4">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-warm/10">
                    {topBooklets.map((book) => (
                        <tr key={book.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                        {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover" alt="" />}
                                    </div>
                                    <span className="font-medium text-dark">{book.title}</span>
                                </div>
                            </td>
                            <td className="px-8 py-4 text-cool">{book.stats?.views.toLocaleString() || 0}</td>
                            <td className="px-8 py-4 text-cool">{book.stats?.uniqueReaders.toLocaleString() || 0}</td>
                            <td className="px-8 py-4 text-cool">
                                {Math.floor((book.stats?.avgTimeSeconds || 0) / 60)}m {(book.stats?.avgTimeSeconds || 0) % 60}s
                            </td>
                            <td className="px-8 py-4 text-cool">{book.stats?.shares || 0}</td>
                            <td className="px-8 py-4">
                                <a href={`#/view/${book.id}`} target="_blank" className="text-dark hover:text-warm transition-colors inline-flex items-center gap-1 text-sm font-semibold">
                                    View <ArrowUpRight size={14} />
                                </a>
                            </td>
                        </tr>
                    ))}
                    {topBooklets.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-8 py-12 text-center text-cool">
                                No engagement data available yet.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend: string }> = ({ title, value, icon, trend }) => (
    <div className="bg-white p-6 rounded-xl border border-warm/20 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className="p-2 bg-warm/10 rounded-lg text-dark">
                {icon}
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
        </div>
        <div>
            <h3 className="text-3xl font-serif text-dark mb-1">{value}</h3>
            <p className="text-sm text-cool font-medium">{title}</p>
        </div>
    </div>
);

export default Analytics;