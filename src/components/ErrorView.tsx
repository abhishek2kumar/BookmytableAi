import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowLeft, Home, Search } from 'lucide-react';
import { motion } from 'motion/react';

export default function ErrorView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const city = searchParams.get('city');
  const type = searchParams.get('type');

  const isInvalid = type === 'invalid';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-24 bg-slate-50">
      <div className="max-w-md w-full text-center">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="bg-white rounded-[2.5rem] shadow-2xl p-12 relative overflow-hidden"
        >
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/10 rounded-full -ml-16 -mb-16 blur-2xl" />

          <div className="relative z-10">
            <div className="w-24 h-24 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
               <MapPin size={48} className="text-brand" />
            </div>

            <h1 className="text-3xl font-display font-black text-slate-900 mb-4 leading-tight">
              {isInvalid 
                ? "Are you sure you entered the right location?" 
                : city 
                  ? `Oops! We aren't in ${city} yet.` 
                  : 'Search Error'}
            </h1>
            
            <p className="text-slate-500 font-medium mb-12 text-lg">
              {isInvalid 
                ? "We couldn't find this location. Please check the spelling or try searching for a major city."
                : "We're rapidly expanding to new cities across India. Stay tuned as we bring curated dining experiences to your neighborhood!"}
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-2xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
              >
                <Home size={20} />
                Back to Home
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-slate-100 text-slate-900 py-4 md:py-5 rounded-2xl font-black text-lg hover:bg-brand/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <Search size={20} />
                Try Another Search
              </button>
            </div>
          </div>
        </motion.div>

        <p className="mt-8 text-slate-400 font-bold text-sm uppercase tracking-widest">
           Coming Soon to your city
        </p>
      </div>
    </div>
  );
}
