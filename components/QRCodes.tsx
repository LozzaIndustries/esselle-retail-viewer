import React, { useState } from 'react';
import { Booklet } from '../types';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Copy, ExternalLink, ChevronRight } from 'lucide-react';

interface QRCodesProps {
  booklets: Booklet[];
}

const QRCodes: React.FC<QRCodesProps> = ({ booklets }) => {
  const [selectedId, setSelectedId] = useState<string | null>(booklets.length > 0 ? booklets[0].id : null);

  const selectedBooklet = booklets.find(b => b.id === selectedId);
  const qrUrl = selectedBooklet ? `${window.location.origin}/#/view/${selectedBooklet.id}` : '';

  const downloadQR = () => {
    const canvas = document.getElementById('main-qr') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${selectedBooklet?.title.replace(/\s+/g, '_')}_QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Sidebar List */}
      <div className="w-1/3 border-r border-warm/10 overflow-y-auto bg-white">
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
      <div className="flex-1 bg-[#f8f7f5] flex items-center justify-center p-8">
        {selectedBooklet ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-warm/10 max-w-md w-full text-center">
                <div className="mb-6">
                    <h2 className="font-serif text-xl text-dark mb-2">{selectedBooklet.title}</h2>
                    <p className="text-xs text-cool bg-gray-100 inline-block px-3 py-1 rounded-full border border-gray-200 truncate max-w-full">
                        {qrUrl}
                    </p>
                </div>

                <div className="flex justify-center mb-8 bg-white p-4 border border-gray-100 rounded-xl shadow-inner">
                    <QRCodeCanvas 
                        id="main-qr"
                        value={qrUrl}
                        size={250}
                        level={"H"}
                        includeMargin={true}
                        fgColor="#332f21"
                        imageSettings={{
                            src: "https://cdn-icons-png.flaticon.com/512/337/337946.png", // Or app logo
                            x: undefined,
                            y: undefined,
                            height: 40,
                            width: 40,
                            excavate: true,
                        }}
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={downloadQR}
                        className="flex-1 flex items-center justify-center gap-2 bg-dark text-white py-3 rounded-lg font-semibold hover:bg-cool transition-colors shadow-lg hover:shadow-xl"
                    >
                        <Download size={18} />
                        Download PNG
                    </button>
                    <button 
                        onClick={() => navigator.clipboard.writeText(qrUrl)}
                        className="p-3 bg-gray-100 rounded-lg text-dark hover:bg-gray-200 transition-colors border border-gray-200"
                        title="Copy Link"
                    >
                        <Copy size={18} />
                    </button>
                    <a 
                        href={qrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-gray-100 rounded-lg text-dark hover:bg-gray-200 transition-colors border border-gray-200"
                        title="Test Link"
                    >
                        <ExternalLink size={18} />
                    </a>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-100 text-[10px] text-cool/60 text-left">
                    <p className="font-bold mb-1">PRO TIP:</p>
                    <p>This QR code is linked to the publication ID. Even if you republish or update the PDF file, this code will remain valid and point to the latest version.</p>
                </div>
            </div>
        ) : (
            <div className="text-cool opacity-50 flex flex-col items-center">
                <p>Select a publication to preview</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default QRCodes;