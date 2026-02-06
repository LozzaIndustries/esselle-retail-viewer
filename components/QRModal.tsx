import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, url, title }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
           <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl text-center z-[10001]"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-cool hover:text-dark">
                <X size={20} />
            </button>

            <h3 className="font-serif text-2xl text-dark mb-2">Share Booklet</h3>
            <p className="text-cool text-sm mb-6 line-clamp-1">{title}</p>

            <div className="flex justify-center mb-6 p-4 bg-white border border-gray-100 rounded-lg shadow-inner">
                <QRCodeCanvas 
                    value={url} 
                    size={200} 
                    level={"H"}
                    fgColor={"#332f21"} // Brand Black
                    imageSettings={{
                        src: "https://cdn-icons-png.flaticon.com/512/337/337946.png", // Generic pdf icon or logo
                        x: undefined,
                        y: undefined,
                        height: 24,
                        width: 24,
                        excavate: true,
                    }}
                />
            </div>

            <p className="text-xs text-cool mb-4">Scan to view on mobile</p>

            <div className="flex gap-2">
                <button 
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-dark py-3 rounded-lg font-semibold transition-colors text-sm"
                >
                    <Copy size={16} /> Copy Link
                </button>
                <a 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-dark hover:bg-cool text-white py-3 rounded-lg font-semibold transition-colors text-sm"
                >
                    <ExternalLink size={16} /> Open
                </a>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QRModal;