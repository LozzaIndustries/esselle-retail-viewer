import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Image as ImageIcon, Loader2, RefreshCw, Calendar, EyeOff, Globe, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPDF, updateBooklet, deleteBooklet, isAppInDemoMode } from '../services/firebase';
import { pdfjs } from 'react-pdf';
import { Booklet, User } from '../types';

// Ensure worker is configured for cover generation
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (booklet: Booklet) => void;
  onDeleteComplete?: (id: string) => void;
  initialBooklet?: Booklet | null;
  currentUser?: User | null;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete, onDeleteComplete, initialBooklet, currentUser }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusMode, setStatusMode] = useState<'published' | 'scheduled' | 'draft'>('published');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
  // Cover generation state
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [generatingCover, setGeneratingCover] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!initialBooklet;

  // Pre-fill data when opening in edit mode
  useEffect(() => {
    if (isOpen && initialBooklet) {
        setTitle(initialBooklet.title);
        setDescription(initialBooklet.description);
        setCoverPreview(initialBooklet.coverUrl || null);
        setStatusMode(initialBooklet.status || 'published');
        
        if (initialBooklet.scheduledAt) {
            const date = new Date(initialBooklet.scheduledAt);
            const isoString = date.toISOString().slice(0, 16);
            setScheduleDate(isoString);
            setStatusMode('scheduled');
        } else {
            setScheduleDate('');
        }

        setFile(null); 
    } else if (isOpen && !initialBooklet) {
        resetForm();
    }
  }, [isOpen, initialBooklet]);

  const generateCover = async (pdfFile: File) => {
    setGeneratingCover(true);
    try {
        const url = URL.createObjectURL(pdfFile);
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport } as any).promise;
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
        if (!title.trim() && !isEditMode) {
            setTitle(selectedFile.name.replace('.pdf', ''));
        }
        generateCover(selectedFile);
      } else {
        alert("Please select a valid PDF file.");
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this publication? This action cannot be undone.")) {
        setStatus('uploading');
        try {
            if (initialBooklet && onDeleteComplete) {
                await deleteBooklet(initialBooklet.id);
                onDeleteComplete(initialBooklet.id);
                onClose();
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !file) return;

    setStatus('uploading');
    setProgress(0);

    // CRITICAL FIX: Send null, NOT undefined, to clear the schedule field in Firestore
    const scheduledTimestamp = statusMode === 'scheduled' && scheduleDate 
        ? new Date(scheduleDate).getTime() 
        : null;
        
    const finalStatus = statusMode;

    try {
      let resultBooklet: Booklet;

      const metadata = { 
        title, 
        description,
        status: finalStatus,
        scheduledAt: scheduledTimestamp,
        ownerId: currentUser?.uid || 'anon',
        ownerName: currentUser?.displayName || 'Anonymous'
      };

      if (isEditMode && initialBooklet) {
        // We generally don't overwrite owner on edit unless specified, but let's keep original owner
        // If needed we could update ownerName if the user changes their name, but usually better to keep original
        const updateMeta = {
            ...metadata,
            ownerId: initialBooklet.ownerId || metadata.ownerId, // Preserve original owner
            ownerName: initialBooklet.ownerName || metadata.ownerName
        };

        resultBooklet = await updateBooklet(
            initialBooklet.id,
            file,
            updateMeta,
            (p) => setProgress(p),
            coverPreview
        );
      } else {
        resultBooklet = await uploadPDF(
            file!, 
            metadata, 
            (p) => setProgress(p),
            coverPreview 
        );
      }
      
      setStatus('success');
      setTimeout(() => {
        onUploadComplete(resultBooklet);
        if (!isEditMode) resetForm();
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
    setStatusMode('published');
    setScheduleDate('');
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
            className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <h2 className="font-serif text-2xl text-dark">
                {isEditMode ? 'Edit Publication' : 'Upload Publication'}
              </h2>
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
                  <h3 className="font-serif text-2xl text-dark mb-2">
                      {isEditMode ? 'Updates Saved' : 'Upload Complete'}
                  </h3>
                  <p className="text-cool">
                    {statusMode === 'draft' ? 'Saved as draft. Only admins can see this.' : 
                     statusMode === 'scheduled' ? `Scheduled for release on ${new Date(scheduleDate).toLocaleDateString()}.` : 
                     'Your booklet is now live.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {isEditMode && (
                     <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-900 mb-4">
                        <RefreshCw className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
                        <div className="text-xs">
                            <p className="font-bold mb-1">Editing Mode</p>
                            <p>You are updating <strong>{initialBooklet?.title}</strong>. Changes to metadata or status are instantaneous. Uploading a new PDF will replace the existing file.</p>
                        </div>
                     </div>
                  )}

                  <div className="flex gap-8 flex-col md:flex-row">
                      {/* Left: File & Cover */}
                      <div className="w-full md:w-1/3 flex-shrink-0">
                          <div 
                            className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center text-center transition-colors cursor-pointer relative overflow-hidden mb-2 ${file ? 'border-warm bg-gray-50' : 'border-gray-200 hover:border-warm/50 hover:bg-gray-50'}`}
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
                                        <span className="text-white font-semibold flex items-center gap-2"><UploadCloud size={16}/> {isEditMode ? 'Replace' : 'Change'}</span>
                                    </div>
                                </div>
                            ) : file ? (
                              <div className="flex flex-col items-center gap-2 text-dark p-4">
                                <FileText className="text-warm" size={32} />
                                <span className="font-medium text-sm line-clamp-2">{file.name}</span>
                              </div>
                            ) : (
                              <div className="space-y-2 p-4">
                                <UploadCloud className="mx-auto text-warm" size={36} strokeWidth={1} />
                                <p className="text-sm font-medium text-dark">
                                    {isEditMode ? 'Upload New PDF' : 'Drag PDF Here'}
                                </p>
                              </div>
                            )}
                          </div>
                          {file && <p className="text-xs text-center text-cool">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                      </div>

                      {/* Right: Metadata & Schedule */}
                      <div className="flex-1 space-y-5">
                        <div>
                          <label className="block text-xs font-semibold text-cool uppercase tracking-wide mb-1.5">Title</label>
                          <input 
                            type="text" 
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-md border border-gray-200 focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-serif text-lg placeholder-gray-300"
                            placeholder="e.g., Spring Catalog 2024"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-semibold text-cool uppercase tracking-wide mb-1.5">Description</label>
                          <textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-md border border-gray-200 focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-sans text-sm h-24 resize-none placeholder-gray-300"
                            placeholder="Brief summary..."
                          />
                        </div>

                        {/* Publishing Options */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <label className="block text-xs font-semibold text-cool uppercase tracking-wide mb-3">Publishing Status</label>
                            
                            <div className="flex flex-col gap-3">
                                {/* Option 1: Publish Now */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="status" 
                                        checked={statusMode === 'published'} 
                                        onChange={() => setStatusMode('published')}
                                        className="w-4 h-4 text-dark focus:ring-dark border-gray-300"
                                    />
                                    <div className="flex items-center gap-2 text-dark">
                                        <Globe size={16} className="text-cool group-hover:text-dark" />
                                        <span className="text-sm font-medium">Release Now</span>
                                    </div>
                                </label>

                                {/* Option 2: Schedule */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="status" 
                                        checked={statusMode === 'scheduled'} 
                                        onChange={() => setStatusMode('scheduled')}
                                        className="w-4 h-4 text-dark focus:ring-dark border-gray-300"
                                    />
                                    <div className="flex items-center gap-2 text-dark flex-1">
                                        <Calendar size={16} className="text-cool group-hover:text-dark" />
                                        <span className="text-sm font-medium">Schedule Release</span>
                                    </div>
                                </label>
                                
                                <AnimatePresence>
                                    {statusMode === 'scheduled' && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }} 
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="ml-7 overflow-hidden"
                                        >
                                            <input 
                                                type="datetime-local" 
                                                value={scheduleDate}
                                                onChange={(e) => setScheduleDate(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-cool focus:border-dark outline-none"
                                                min={new Date().toISOString().slice(0, 16)}
                                            />
                                            <p className="text-[10px] text-cool mt-1">Files are hidden from public until this time.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Option 3: Draft */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="status" 
                                        checked={statusMode === 'draft'} 
                                        onChange={() => setStatusMode('draft')}
                                        className="w-4 h-4 text-dark focus:ring-dark border-gray-300"
                                    />
                                    <div className="flex items-center gap-2 text-dark">
                                        <EyeOff size={16} className="text-cool group-hover:text-dark" />
                                        <span className="text-sm font-medium">Save as Draft</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                      </div>
                  </div>

                  {/* Progress Bar (Only visible when uploading) */}
                  {status === 'uploading' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold uppercase text-cool">
                            <span>Processing...</span>
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
                          <span className="text-sm">Operation failed. Please try again.</span>
                      </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex justify-between pt-2 items-center">
                    <div>
                        {isEditMode && (
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-3 rounded-full text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
                            >
                                <Trash2 size={16} /> Delete Publication
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
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
                        disabled={(!file && !isEditMode) || status === 'uploading' || (statusMode === 'scheduled' && !scheduleDate)}
                        className={`px-8 py-3 rounded-full font-semibold transition-all ${
                            (!file && !isEditMode) || status === 'uploading' || (statusMode === 'scheduled' && !scheduleDate)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-dark text-white hover:bg-cool shadow-lg hover:shadow-xl'
                        }`}
                        >
                        {status === 'uploading' ? 'Processing...' : (
                            statusMode === 'draft' ? 'Save Draft' : 
                            statusMode === 'scheduled' ? 'Schedule' : 
                            isEditMode ? 'Save Changes' : 'Publish Now'
                        )}
                        </button>
                    </div>
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