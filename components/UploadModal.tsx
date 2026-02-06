import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPDF } from '../services/firebase';
import { pdfjs } from 'react-pdf';

// Ensure worker is configured for cover generation
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (booklet: any) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
  // Cover generation state
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateCover = async (pdfFile: File) => {
    setGeneratingCover(true);
    try {
        const url = URL.createObjectURL(pdfFile);
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // Get first page
        
        // Render at reasonable quality
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setCoverPreview(dataUrl);
        }
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error generating cover:", err);
    } finally {
        setGeneratingCover(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        
        // Only auto-fill title if empty to prevent overwriting user input
        if (!title.trim()) {
            setTitle(selectedFile.name.replace('.pdf', ''));
        }

        // Generate cover immediately
        generateCover(selectedFile);
      } else {
        alert("Please select a valid PDF file.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('uploading');
    setProgress(0);

    try {
      const booklet = await uploadPDF(
        file, 
        { title, description, ownerId: 'demo-user' }, 
        (p) => setProgress(p),
        coverPreview // Pass the generated cover
      );
      
      setStatus('success');
      setTimeout(() => {
        onUploadComplete(booklet);
        resetForm();
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCoverPreview(null);
    setProgress(0);
    setStatus('idle');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h2 className="font-serif text-2xl text-dark">Upload Publication</h2>
              <button onClick={onClose} className="text-cool hover:text-dark transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto">
              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4"
                  >
                    <CheckCircle size={32} />
                  </motion.div>
                  <h3 className="font-serif text-2xl text-dark mb-2">Upload Complete</h3>
                  <p className="text-cool">Your booklet is being processed...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="flex gap-6 flex-col md:flex-row">
                      {/* File Drop / Preview Area */}
                      <div className="flex-1">
                          <div 
                            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center text-center transition-colors cursor-pointer relative overflow-hidden ${file ? 'border-warm bg-gray-50' : 'border-gray-200 hover:border-warm/50 hover:bg-gray-50'}`}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="application/pdf" 
                              onChange={handleFileChange}
                            />
                            
                            {generatingCover ? (
                                <div className="flex flex-col items-center text-cool">
                                    <Loader2 className="animate-spin mb-2" size={32} />
                                    <span className="text-xs font-semibold uppercase tracking-wider">Generating Preview...</span>
                                </div>
                            ) : coverPreview ? (
                                <div className="absolute inset-0 w-full h-full group">
                                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-contain p-4" />
                                    <div className="absolute inset-0 bg-dark/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-semibold flex items-center gap-2"><UploadCloud size={16}/> Change PDF</span>
                                    </div>
                                </div>
                            ) : file ? (
                              <div className="flex flex-col items-center gap-2 text-dark p-4">
                                <FileText className="text-warm" size={32} />
                                <span className="font-medium text-sm line-clamp-2">{file.name}</span>
                                <span className="text-xs text-cool">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            ) : (
                              <div className="space-y-2 p-4">
                                <UploadCloud className="mx-auto text-warm" size={48} strokeWidth={1} />
                                <p className="text-lg font-medium text-dark">Browse or Drag PDF</p>
                                <p className="text-xs text-cool">Max quality, no size limit</p>
                              </div>
                            )}
                          </div>
                      </div>

                      {/* Metadata Inputs */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-cool uppercase tracking-wide mb-1">Title</label>
                          <input 
                            type="text" 
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-md border border-gray-200 focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-serif text-lg placeholder-gray-300"
                            placeholder="e.g., Spring Catalog 2024"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-cool uppercase tracking-wide mb-1">Description</label>
                          <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 rounded-md border border-gray-200 focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-sans text-base h-32 resize-none placeholder-gray-300"
                            placeholder="Brief summary..."
                          />
                        </div>
                      </div>
                  </div>

                  {/* Progress Bar (Only visible when uploading) */}
                  {status === 'uploading' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold uppercase text-cool">
                            <span>Uploading...</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-warm"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {status === 'error' && (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-md">
                          <AlertCircle size={18} />
                          <span className="text-sm">Upload failed. Please try again.</span>
                      </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={onClose}
                      className="px-6 py-3 rounded-full text-cool hover:bg-gray-100 font-semibold transition-colors"
                      disabled={status === 'uploading'}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={!file || status === 'uploading'}
                      className={`px-8 py-3 rounded-full font-semibold transition-all ${
                        !file || status === 'uploading' 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-dark text-white hover:bg-cool shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {status === 'uploading' ? 'Uploading...' : 'Publish Now'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;