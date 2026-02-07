import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User as UserIcon, Camera, Save, Check, FileText, Upload } from 'lucide-react';
import { User } from '../types';
import { updateUserProfile } from '../services/firebase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  publicationCount: number;
  onProfileUpdate: (updatedUser: User) => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user, publicationCount, onProfileUpdate }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.photoURL || null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const updated = await updateUserProfile(user.uid, displayName, file || undefined);
        onProfileUpdate(updated);
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            onClose();
        }, 1000);
    } catch (err) {
        console.error(err);
        alert('Failed to update profile.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
          >
             <div className="bg-dark text-white px-6 py-4 flex justify-between items-center">
                <h2 className="font-serif text-lg">Account Profile</h2>
                <button onClick={onClose} className="text-white/70 hover:text-white">
                    <X size={20} />
                </button>
             </div>

             <div className="p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 overflow-hidden relative">
                            {preview ? (
                                <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-warm text-white">
                                    <UserIcon size={40} />
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Camera size={24} />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-dark text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                            <Upload size={12} />
                        </div>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    
                    <div className="mt-4 flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                        <FileText size={14} className="text-warm" />
                        <span className="text-sm font-semibold text-dark">{publicationCount} Publications</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-cool uppercase tracking-wide mb-1.5">Full Name</label>
                        <input 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-md border border-gray-200 focus:border-dark outline-none font-serif text-lg text-dark"
                            placeholder="Your Name"
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-semibold text-cool uppercase tracking-wide mb-1.5">Email Address</label>
                         <input 
                            type="email" 
                            value={user.email || ''} 
                            disabled 
                            className="w-full px-4 py-2.5 rounded-md border border-gray-200 bg-gray-50 text-cool text-sm"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-full font-semibold transition-all mt-6 flex items-center justify-center gap-2 ${
                            success ? 'bg-green-600 text-white' : 'bg-dark text-white hover:bg-cool'
                        }`}
                    >
                        {loading ? 'Saving...' : success ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Changes</>}
                    </button>
                </form>
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AccountModal;