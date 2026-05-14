import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingRequestView() {
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="bg-gradient-to-br from-brand to-brand-dark p-1 rounded-3xl shadow-2xl">
          <div className="bg-slate-900 rounded-3xl overflow-hidden p-8 md:p-12 text-white">
            {onboardingSubmitted ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-vibrant-success/20 text-vibrant-success rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-display font-black mb-3">Request Received!</h3>
                <p className="text-white/60 mb-8 font-medium">Our team will get in touch with you shortly.</p>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setOnboardingSubmitted(false)}
                    className="text-brand font-bold hover:text-white transition-colors text-sm uppercase tracking-widest px-6 py-3 border border-brand/30 rounded-2xl"
                  >
                    Submit Another
                  </button>
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-brand text-white font-bold transition-transform active:scale-95 text-sm uppercase tracking-widest px-6 py-3 rounded-2xl"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            ) : (
              <form 
                className="space-y-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmittingOnboarding(true);
                  try {
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData.entries());
                    const response = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({...data, subject: 'Onboarding Request'}),
                    });
                    if (response.ok) setOnboardingSubmitted(true);
                  } catch (error) {
                    console.error('Failed to submit', error);
                  } finally {
                    setIsSubmittingOnboarding(false);
                  }
                }}
              >
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-display font-black mb-3 text-white">Partner with us</h3>
                  <p className="text-white/60 text-sm font-medium">Fill out the form below and our team will get in touch.</p>
                </div>
                 
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Owner Name</label>
                  <input required name="name" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-brand transition-colors font-bold text-white placeholder-white/20" placeholder="E.g. John Doe" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Email Address</label>
                  <input required name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-brand transition-colors font-bold text-white placeholder-white/20" placeholder="E.g. john@spice-garden.com" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Restaurant Name</label>
                  <input required name="restaurantName" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-brand transition-colors font-bold text-white placeholder-white/20" placeholder="E.g. Spice Garden" />
                </div>
                 
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Contact Number</label>
                  <div className="flex gap-2">
                    <span className="bg-white/5 px-5 py-4 rounded-xl font-bold border border-white/10 text-white/80">+91</span>
                    <input required name="phone" type="tel" className="flex-grow bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-brand transition-colors font-bold text-white placeholder-white/20" placeholder="9988776655" />
                  </div>
                </div>
                 
                <button 
                  type="submit" 
                  disabled={isSubmittingOnboarding}
                  className="w-full bg-brand py-5 rounded-xl font-black tracking-widest uppercase text-sm mt-6 shadow-[0_0_40px_-10px_rgba(252,128,25,0.5)] hover:shadow-[0_0_60px_-15px_rgba(252,128,25,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-white"
                >
                  {isSubmittingOnboarding ? 'Submitting...' : 'Request Callback'}
                </button>
              </form>
            )}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand/10 rounded-full blur-3xl -z-10"></div>
      </motion.div>
    </div>
  );
}
