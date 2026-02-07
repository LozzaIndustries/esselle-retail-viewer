import React, { useState } from 'react';
import { Booklet } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, ExternalLink, ChevronRight, Palette, Droplets } from 'lucide-react';

interface QRCodesProps {
  booklets: Booklet[];
}

const QRCodes: React.FC<QRCodesProps> = ({ booklets }) => {
  const [selectedId, setSelectedId] = useState<string | null>(booklets.length > 0 ? booklets[0].id : null);
  const [fgColor, setFgColor] = useState('#332f21'); // Default Brand Dark
  const [isTransparent, setIsTransparent] = useState(false);

  const selectedBooklet = booklets.find(b => b.id === selectedId);
  
  // Robust URL Construction
  const getShareUrl = (id: string) => {
    const baseUrl = window.location.href.split('#')[0];
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/#/view/${id}`;
  };

  const qrUrl = selectedBooklet ? getShareUrl(selectedBooklet.id) : '';

  const downloadQR = () => {
    try {
        // We use the hidden high-res canvas for downloading
        const canvas = document.getElementById('high-res-qr') as HTMLCanvasElement;
        
        if (!canvas) {
            console.error("Canvas element not found");
            alert("Error generating QR code. Please try refreshing the page.");
            return;
        }

        const pngUrl = canvas.toDataURL("image/png");
        
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        const safeTitle = selectedBooklet?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'publication';
        downloadLink.download = `${safeTitle}_qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error("QR Download Error:", error);
        alert("Could not download QR Code. This is usually caused by browser security settings preventing canvas export.");
    }
  };

  const colors = [
    '#332f21', // Dark (Brand)
    '#000000', // Black
    '#53565a', // Cool Gray (Brand)
    '#bfb8af', // Warm Gray (Brand)
    '#1d4ed8', // Blue
    '#b91c1c', // Red
    '#047857', // Green
  ];

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Sidebar List */}
      <div className="w-80 border-r border-warm/10 overflow-y-auto bg-white flex-shrink-0">
        <div className="p-6 border-b border-warm/10">
          <h1 className="font-serif text-2xl text-dark">QR Generator</h1>
          <p className="text-xs text-cool mt-1">Select a publication to generate code</p>
        </div>
        
        {booklets.length === 0 ? (
            <div className="p-8 text-center text-cool text-sm">No publications found.</div>
        ) : (
            <div className="divide-y divide-warm/10">
            {booklets.map(b => (
                <div 
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`p-4 cursor-pointer transition-colors flex items-center justify-between group ${selectedId === b.id ? 'bg-warm/10' : 'hover:bg-gray-50'}`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0 border border-gray-100">
                            {b.coverUrl && <img src={b.coverUrl} className="w-full h-full object-cover" alt="" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className={`font-semibold text-sm truncate ${selectedId === b.id ? 'text-dark' : 'text-cool'}`}>{b.title}</h3>
                            <p className="text-[10px] text-cool/60 truncate">{new Date(b.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {selectedId === b.id && <ChevronRight size={16} className="text-dark" />}
                </div>
            ))}
            </div>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 bg-[#f8f7f5] p-8 overflow-y-auto">
        {selectedBooklet ? (
            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
                
                {/* Visual Preview */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-warm/10 flex-1 w-full text-center sticky top-0">
                     <h2 className="font-serif text-xl text-dark mb-6">{selectedBooklet.title}</h2>
                     
                     {/* The Visible Preview QR */}
                     <div className={`flex justify-center mb-8 p-6 border border-gray-100 rounded-xl shadow-inner transition-colors ${isTransparent ? 'bg-[url(https://bg.siteorigin.com/blog/wp-content/uploads/2015/06/patt01.png)]' : 'bg-white'}`}>
                        <QRCodeCanvas 
                            value={qrUrl}
                            size={250}
                            level={"H"}
                            includeMargin={!isTransparent}
                            fgColor={fgColor}
                            bgColor={isTransparent ? "transparent" : "#FFFFFF"}
                            // We keep the icon for the PREVIEW only, as it's just rendering on screen
                            imageSettings={{
                                src: "https://cdn-icons-png.flaticon.com/512/337/337946.png", 
                                x: undefined,
                                y: undefined,
                                height: 50,
                                width: 50,
                                excavate: true,
                            }}
                        />
                    </div>

                    <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                        <p className="text-xs font-semibold text-cool uppercase mb-1">Target URL</p>
                        <div className="flex gap-2">
                             <input type="text" readOnly value={qrUrl} className="flex-1 bg-white border border-gray-200 text-xs px-2 py-1 rounded text-cool" />
                             <button onClick={() => navigator.clipboard.writeText(qrUrl)} className="text-dark hover:text-warm"><Copy size={14}/></button>
                        </div>
                    </div>

                    <button 
                        onClick={downloadQR}
                        className="w-full flex items-center justify-center gap-2 bg-dark text-white py-4 rounded-lg font-semibold hover:bg-cool transition-colors shadow-lg hover:shadow-xl active:scale-95"
                    >
                        <Download size={18} />
                        Download High-Res PNG (300DPI)
                    </button>
                </div>

                {/* Customization Controls */}
                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-warm/20">
                        <div className="flex items-center gap-2 mb-4 text-dark font-serif font-bold">
                            <Palette size={18} />
                            <h3>Customization</h3>
                        </div>

                        {/* Color Picker */}
                        <div className="mb-6">
                            <label className="text-xs font-semibold text-cool uppercase tracking-wide block mb-3">QR Color</label>
                            <div className="flex flex-wrap gap-3">
                                {colors.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFgColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${fgColor === c ? 'border-dark scale-110 shadow-md' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <div className="relative">
                                    <input 
                                        type="color" 
                                        value={fgColor}
                                        onChange={(e) => setFgColor(e.target.value)}
                                        className="w-8 h-8 opacity-0 absolute cursor-pointer"
                                    />
                                    <div className="w-8 h-8 rounded-full border border-gray-200 bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500 flex items-center justify-center pointer-events-none">
                                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[8px] text-dark font-bold">+</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Toggle */}
                        <div className="mb-2">
                            <label className="text-xs font-semibold text-cool uppercase tracking-wide block mb-3">Background</label>
                            <div 
                                onClick={() => setIsTransparent(!isTransparent)}
                                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Droplets size={18} className={isTransparent ? 'text-blue-500' : 'text-gray-400'} />
                                    <span className="text-sm font-medium text-dark">Transparent Background</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${isTransparent ? 'bg-dark' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isTransparent ? 'left-6' : 'left-1'}`} />
                                </div>
                            </div>
                            <p className="text-[10px] text-cool mt-2 leading-relaxed">
                                Enable transparency for placing QR codes on colored marketing materials or dark backgrounds.
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-sm text-blue-900">
                        <p className="font-bold mb-2">Print Quality Ready</p>
                        <p>The download button generates a 2000x2000px PNG file, suitable for high-quality printing on brochures, business cards, and posters.</p>
                    </div>
                </div>

                {/* HIDDEN HIGH RES CANVAS FOR DOWNLOAD */}
                <div style={{ position: 'fixed', top: '-10000px', left: '-10000px', visibility: 'hidden' }}>
                    <QRCodeCanvas 
                        id="high-res-qr"
                        value={qrUrl}
                        size={2000} // High Resolution
                        level={"H"}
                        includeMargin={!isTransparent}
                        fgColor={fgColor}
                        bgColor={isTransparent ? "transparent" : "#FFFFFF"}
                        // REMOVED imageSettings to prevent CORS issues during download
                    />
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-cool opacity-50">
                <p>Select a publication from the left to begin.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default QRCodes;