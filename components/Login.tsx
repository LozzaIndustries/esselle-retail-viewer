import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, AlertCircle, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { loginWithEmail, registerWithEmail } from '../services/firebase';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  logoSrc?: string;
  companyName?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, logoSrc, companyName }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
          const result = await registerWithEmail(email, password);
          onLoginSuccess(result);
      } else {
          const result = await loginWithEmail(email, password);
          onLoginSuccess(result);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isRegistering ? "Registration failed." : "Invalid credentials."));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setEmail('admin');
    setPassword('admin');
    setLoading(true);
    try {
        const result = await loginWithEmail('admin', 'admin');
        onLoginSuccess(result);
    } catch (err: any) {
        setError(err.message);
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f5] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-warm/20"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          {logoSrc ? (
              <img src={logoSrc} alt={companyName || "Logo"} className="h-20 w-auto mb-4 object-contain" />
          ) : (
              <>
                <BookOpen className="h-10 w-10 text-dark mb-4" strokeWidth={1} />
                <h1 className="font-serif text-4xl text-dark tracking-tight">{companyName || "Esselle Retail"}</h1>
              </>
          )}
          
          <p className="text-[#8e8d8a] text-[9px] mt-4 tracking-[0.25em] uppercase font-semibold">Premium Publication Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-cool uppercase tracking-wider mb-2">Username / Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-sans"
              placeholder={isRegistering ? "you@example.com" : "admin"}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cool uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-dark focus:ring-1 focus:ring-dark outline-none transition-all font-sans"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-dark text-white rounded-lg font-semibold hover:bg-cool transition-colors flex items-center justify-center gap-2 group disabled:opacity-70 shadow-lg shadow-dark/10"
          >
            {loading ? (isRegistering ? 'Creating Account...' : 'Authenticating...') : (isRegistering ? 'Create Account' : 'Enter Dashboard')}
            {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4 text-center">
             <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                className="text-sm text-cool hover:text-dark underline decoration-gray-300 underline-offset-4"
             >
                {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
             </button>

            {!isRegistering && (
                <div className="pt-6 border-t border-gray-100 mt-2">
                    <button 
                        onClick={handleQuickDemo}
                        className="flex items-center justify-center gap-2 w-full py-3 border border-dark/20 rounded-lg text-sm text-dark hover:bg-dark hover:text-white transition-all font-medium"
                    >
                        <ShieldCheck size={14} />
                        <span>Use Admin Access</span>
                    </button>
                    <p className="text-[10px] text-cool uppercase tracking-widest opacity-60 mt-3">Credentials: admin / admin</p>
                </div>
            )}
        </div>
      </motion.div>
      
      <p className="mt-8 text-cool/50 text-xs font-serif italic">
        The benchmark for digital booklets.
      </p>
    </div>
  );
};

export default Login;