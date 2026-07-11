import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Users, FileText, HeadphonesIcon, Check, Settings2, User as UserIcon, LayoutDashboard, ShoppingBag, Calendar, Utensils, QrCode, Star, ImageIcon, Store, Tag, Megaphone } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import AppIcon from './AppIcon';

export default function OnboardingRequestView() {
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRestaurantName = searchParams.get('restaurantName') || '';
  const { user, profile } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 md:px-8 py-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="group-hover:scale-110 transition-transform drop-shadow-lg">
             <AppIcon size={40} />
          </div>
          <span className="hidden sm:block text-2xl font-bold leading-[1.2] text-white tracking-tighter drop-shadow-md">
            Bookmy<span className="text-brand">Table</span>
          </span>
        </Link>
        {user && (
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur-md px-2 py-2 pr-4 rounded-full transition-colors border border-white/20 text-white font-bold text-sm shadow-sm hover:shadow-md">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white shrink-0 overflow-hidden shadow-inner border border-white/10">
                {profile?.photoURL || user.photoURL ? (
                  <img src={profile?.photoURL || user.photoURL || ''} alt={profile?.displayName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} />
                )}
              </div>
              <span className="hidden sm:inline-block max-w-[120px] truncate drop-shadow-sm">{profile?.displayName || user.displayName || "Dashboard"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-32">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover" 
            alt="Food background" 
          />
          <div className="absolute inset-0 bg-slate-900/85"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl md:text-[44px] font-display font-normal text-white tracking-tight mb-8">
              Partner with BookmyTable and<br/>grow your business
            </h1>
            
            <div className="inline-flex items-center gap-3 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-full pr-6 pl-2 py-2 mb-8 shadow-lg">
              <span className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-[11px] font-normal text-white">
                %
              </span>
              <span className="text-sm font-normal">
                0% commission for 6 months
                <span className="opacity-60 font-normal text-xs ml-2 hidden sm:inline">Only valid for new restaurant partners</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative z-20 container mx-auto px-4 -mt-20 sm:-mt-24 mb-4">
          <motion.div 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl text-left text-[#363636] border border-slate-100">
              <div className="p-8 md:p-12">
                <h2 className="text-2xl font-normal text-slate-900 mb-2">Get started: It only takes 10 minutes</h2>
                <p className="text-slate-500 text-sm mb-8 font-normal">Please keep these documents and details ready for a smooth sign-up</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mb-8">
                  <div className="flex items-start gap-2.5 text-sm font-normal text-slate-700">
                    <CheckCircle className="text-[#0b8a4a] shrink-0 mt-0.5 fill-[#0b8a4a]/10" size={18} /> PAN card
                  </div>
                  <div className="flex items-start gap-2.5 text-sm font-normal text-slate-700">
                    <CheckCircle className="text-[#0b8a4a] shrink-0 mt-0.5 fill-[#0b8a4a]/10" size={18} /> GST number, if applicable
                  </div>
                  <div className="flex items-start gap-2.5 text-sm font-normal text-slate-700">
                    <CheckCircle className="text-[#0b8a4a] shrink-0 mt-0.5 fill-[#0b8a4a]/10" size={18} /> FSSAI license
                  </div>
                  <div className="flex items-start gap-2.5 text-sm font-normal text-slate-700">
                    <CheckCircle className="text-[#0b8a4a] shrink-0 mt-0.5 fill-[#0b8a4a]/10" size={18} /> Bank account details
                  </div>
                </div>

                <div className="h-px bg-slate-200 mb-8"></div>
                
                {onboardingSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-[#0b8a4a]/10 text-[#0b8a4a] rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl mb-3 font-normal text-slate-900 leading-[1.2]">Request Received!</h3>
                    <p className="text-slate-500 mb-8 font-normal">Our team will get in touch with you shortly.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={() => setOnboardingSubmitted(false)}
                        className="text-slate-600 font-normal hover:bg-slate-50 transition-colors text-sm uppercase tracking-widest px-6 py-3 border border-slate-200 rounded-xl"
                      >
                        Submit Another
                      </button>
                      <button 
                        onClick={() => navigate('/')}
                        className="bg-brand text-white font-normal transition-transform active:scale-95 text-sm uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-brand-dark"
                      >
                        Back to Home
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-normal mb-6">Partner Details</h3>
                    <form 
                      className="space-y-5"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSubmittingOnboarding(true);
                        try {
                          const formData = new FormData(e.currentTarget);
                          const data = Object.fromEntries(formData.entries());
                          
                          // Add address to message output nicely
                          const enhancedMessage = `
Address: ${data.address}
                          `.trim();
                          
                          const response = await fetch('/api/contact', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({...data, message: enhancedMessage, subject: 'Onboarding Request'}),
                          });
                          if (response.ok) setOnboardingSubmitted(true);
                        } catch (error) {
                          console.error('Failed to submit', error);
                        } finally {
                          setIsSubmittingOnboarding(false);
                        }
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2 block">Owner Name *</label>
                          <input required name="name" type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-normal text-slate-700 placeholder-slate-400" placeholder="John Doe" />
                        </div>

                        <div>
                          <label className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2 block">Email Address *</label>
                          <input required name="email" type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-normal text-slate-700 placeholder-slate-400" placeholder="john@example.com" />
                        </div>

                        <div>
                          <label className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2 block">Restaurant Name *</label>
                          <input required name="restaurantName" defaultValue={defaultRestaurantName} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-normal text-slate-700 placeholder-slate-400" placeholder="Spice Garden" />
                        </div>
                        
                        <div>
                          <label className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2 block">Contact Number *</label>
                          <div className="flex gap-2">
                            <span className="bg-slate-100 border border-slate-200 px-4 py-3.5 rounded-xl font-normal text-slate-500 shrink-0">+91</span>
                            <input required name="phone" type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-normal text-slate-700 placeholder-slate-400" placeholder="9988776655" />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2 block">Restaurant Address *</label>
                          <input required name="address" type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-normal text-slate-700 placeholder-slate-400" placeholder="Enter complete address..." />
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <button 
                          type="submit" 
                          disabled={isSubmittingOnboarding}
                          className="w-full bg-brand py-4 rounded-xl font-normal tracking-widest uppercase text-sm shadow-[0_0_40px_-10px_rgba(252,128,25,0.5)] hover:shadow-[0_0_60px_-15px_rgba(252,128,25,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 text-white"
                        >
                          {isSubmittingOnboarding ? 'Sumitting...' : 'Submit Request'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
      </div>

      {/* Why Partner Section */}
      <div className="bg-white pt-8 pb-24 relative z-10 border-t border-slate-100">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12 relative mt-4">
            <h2 className="text-3xl lg:text-4xl font-display font-normal text-[#363636] relative z-10 bg-white inline-block px-6">
              Why should you partner with BookmyTable?
            </h2>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -z-10"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 text-center">
            <div className="group">
              <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-normal mb-3 text-slate-800">Attract & Grow</h3>
              <p className="text-slate-500 text-sm font-normal leading-relaxed px-4">Reach millions of diners by running targeted ads, creating custom promotional offers, and highlighting your signature dishes.</p>
            </div>
            
            <div className="group">
              <div className="w-20 h-20 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={32} />
              </div>
              <h3 className="text-xl font-normal mb-3 text-slate-800">Unified Operations</h3>
              <p className="text-slate-500 text-sm font-normal leading-relaxed px-4">Get complete control with a powerful dashboard to manage real-time table bookings, live orders, dynamic menus, and custom QR codes.</p>
            </div>
            
            <div className="group">
              <div className="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Store size={32} />
              </div>
              <h3 className="text-xl font-normal mb-3 text-slate-800">Engage Your Audience</h3>
              <p className="text-slate-500 text-sm font-normal leading-relaxed px-4">Build brand loyalty by uploading interactive stories, managing vibrant media galleries, and delivering a seamless digital dining experience.</p>
            </div>
          </div>

          <div className="mt-24 mb-8">
            <div className="text-center mb-12 relative mt-4">
              <h2 className="text-3xl lg:text-4xl font-display font-normal text-[#363636] relative z-10 bg-white inline-block px-6">
                Explore the Partner Dashboard Features
              </h2>
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -z-10"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: LayoutDashboard,
                  title: 'Operations Center',
                  desc: 'A complete overview of your daily performance, bookings, and active orders.'
                },
                {
                  icon: ShoppingBag,
                  title: 'Live Orders',
                  desc: 'Track and manage food delivery and takeaway orders in real-time.'
                },
                {
                  icon: Calendar,
                  title: 'Table Bookings',
                  desc: 'View, accept, and manage upcoming and past table reservations effortlessly.'
                },
                {
                  icon: Utensils,
                  title: 'Live Menu Management',
                  desc: 'Add, edit, and toggle availability for menu items instantly. No app updates required.'
                },
                {
                  icon: QrCode,
                  title: 'QR Codes',
                  desc: 'Generate distinct QR codes for table dining, takeaways, and easy menu access.'
                },
                {
                  icon: Star,
                  title: 'Signature Dishes',
                  desc: 'Highlight and promote your specialty dishes to catch the attention of more diners.'
                },
                {
                  icon: ImageIcon,
                  title: 'Media & Images',
                  desc: 'Manage your restaurant gallery, ambiance photos, and promotional banners.'
                },
                {
                  icon: Store,
                  title: 'Stories',
                  desc: 'Upload engaging stories to share moments and daily specials with your audience.'
                },
                {
                  icon: Settings2,
                  title: 'Advanced Settings',
                  desc: 'Complete control over operational hours, booking settings, and general restaurant info.'
                },
                {
                  icon: Tag,
                  title: 'Offers & Promos',
                  desc: 'Create and run custom discount campaigns and offers to attract new customers.'
                },
                {
                  icon: Megaphone,
                  title: 'Ads Management',
                  desc: 'Run targeted ad campaigns within the platform to boost your visibility.'
                }
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:shadow-lg hover:border-slate-200 transition-all group">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                    <feature.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
