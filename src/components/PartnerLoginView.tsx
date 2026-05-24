import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import AppIcon from './AppIcon';

export default function PartnerLoginView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      const credentials = await signInWithPopup(auth, provider);
      const user = credentials.user;
      
      // Check if user has any associated restaurant
      if (!user.email) {
        setError("Could not get email from Google Login.");
        return;
      }
      
      const q = query(collection(db, 'restaurants'), where('partnerEmails', 'array-contains', user.email));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        navigate('/partners/dashboard');
      } else {
        setError(`Your email ${user.email} is not linked to any restaurant. Please contact admin.`);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Helmet>
        <title>Partner Dashboard - Bookmytable</title>
      </Helmet>
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-[60] h-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
           <div className="flex items-center justify-between h-full">
               <div className="flex items-center gap-3">
                 <AppIcon size={44} />
                 <span className="hidden sm:block text-2xl font-display font-black text-vibrant-dark tracking-tighter">
                   Bookmy<span className="text-brand">Table</span>
                 </span>
                 <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest ml-2 hidden sm:block">Partner</span>
               </div>
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-8 md:pt-16 p-6 text-center">
        {/* Illustration - Using a relevant placeholder or abstract culinary svg */}
        <div className="w-80 h-48 mb-8 relative">
           <img 
            src="https://i.pinimg.com/736x/69/65/c6/6965c665a5ace34c69bdd6224d8ca9f1.jpg?w=800&auto=format&fit=crop&q=80" 
            alt="Chef Cooking" 
            className="w-full h-full object-cover rounded-3xl shadow-lg"
           />
        </div>

        <h1 className="text-lg md:text-2xl font-bold md:font-black text-slate-800 mb-8 max-w-[280px] sm:max-w-none mx-auto leading-tight">
          Bookmytable Restaurant Partner dashboard
        </h1>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#1A73E8] hover:bg-[#1557B0] text-white py-3.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            <span>Login with Google</span>
          </button>

          <a
            href="mailto:contact@bookmytable.co.in"
            className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3.5 rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center block"
          >
            Register
          </a>

          {error && (
            <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="pt-6">
            <p className="text-sm font-medium text-gray-600">
              Contact Us <a href="tel:+918639636729" className="text-[#1A73E8] hover:underline font-bold">+91 8639636729</a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-gray-200 bg-white">
        <p className="text-xs font-bold text-gray-500 mb-2">By continuing, you agree to our</p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600 transition-colors border-b border-gray-300 border-dashed pb-0.5">Terms of service</a>
          <span>|</span>
          <a href="#" className="hover:text-gray-600 transition-colors border-b border-gray-300 border-dashed pb-0.5">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="hover:text-gray-600 transition-colors border-b border-gray-300 border-dashed pb-0.5">Code of Conduct</a>
        </div>
      </footer>
    </div>
  );
}
