import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Save, Check } from 'lucide-react';
import { uploadLogo, saveBrandingSettings } from '../services/firebase';
import { AppSettings } from '../types';

interface BrandingSettingsProps {
  currentSettings: AppSettings;
  onUpdate: (newSettings: AppSettings) => void;
}

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ currentSettings, onUpdate }) => {
  const [logoPreview, setLogoPreview] = useState<string | undefined>(currentSettings.logoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState(currentSettings.companyName || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        let finalLogoUrl = logoPreview;

        // If a new file was selected, upload it
        if (file) {
            finalLogoUrl = await uploadLogo(file);
        }

        const newSettings: AppSettings = {
            logoUrl: finalLogoUrl,
            companyName
        };

        // FIXED: Always save to persistence layer, regardless of whether it's file or text
        await saveBrandingSettings(newSettings);

        onUpdate(newSettings);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
        console.error(e);
        alert('Failed to save settings. If in demo mode, image might be too large.');
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl text-dark mb-2">Branding Settings</h1>
        <p className="text-cool mb-8">Customize how your publication viewer looks to your audience.</p>

        <div className="bg-white rounded-xl shadow-sm border border-warm/20 p-8 space-y-8">
            
            {/* Logo Section */}
            <div>
                <label className="block text-sm font-semibold text-dark mb-4">Dashboard & Viewer Logo</label>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    
                    {/* Preview Box */}
                    <div className="w-48 h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" className="w-auto h-auto max-w-[80%] max-h-[80%] object-contain" />
                        ) : (
                            <ImageIcon className="text-gray-300 w-12 h-12" />
                        )}
                        <div className="absolute inset-0 bg-dark/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="text-white text-sm font-semibold hover:underline"
                            >
                                Change Image
                            </button>
                        </div>
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 space-y-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-warm/10 p-3 rounded-full text-dark">
                                    <UploadCloud size={24} />
                                </div>
                                <div>
                                    <h4 className="font-medium text-dark">Upload new logo</h4>
                                    <p className="text-sm text-cool">Recommended: High-res PNG with transparent background. Min height 120px for best retina display.</p>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/png, image/jpeg, image/svg+xml"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-cool uppercase tracking-wide mb-2">Company Name (Alt Text)</label>
                            <input 
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-md focus:border-dark outline-none transition-all"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-8 py-3 rounded-full font-semibold transition-all ${
                        success 
                        ? 'bg-green-600 text-white' 
                        : 'bg-dark text-white hover:bg-cool'
                    }`}
                >
                    {saving ? (
                        'Saving...' 
                    ) : success ? (
                        <>
                            <Check size={18} /> Saved
                        </>
                    ) : (
                        <>
                            <Save size={18} /> Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
};

export default BrandingSettings;