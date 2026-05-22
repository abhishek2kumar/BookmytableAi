import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  CheckCircle2, 
  ChevronRight, 
  LayoutDashboard, 
  Menu as MenuIcon, 
  QrCode, 
  CreditCard, 
  CalendarCheck, 
  TrendingUp,
  Mail,
  ArrowRight
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import AppIcon from "./AppIcon";

interface ComingSoonViewProps {
  onContactClick?: () => void;
  onPartnerClick?: () => void;
}

export default function ComingSoonView({ onContactClick, onPartnerClick }: ComingSoonViewProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      await addDoc(collection(db, "subscriptions"), {
        email,
        createdAt: serverTimestamp(),
      });
      setStatus("success");
      setEmail("");
    } catch (err: any) {
      console.error("Subscription error:", err);
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const handlePartnerClick = () => {
    if (onPartnerClick) {
      onPartnerClick();
    } else {
      navigate('/onboarding-request');
    }
  };

  const handleContactClick = () => {
    if (onContactClick) {
      onContactClick();
    } else {
      navigate('/contact-us');
    }
  };

  const features = [
    { icon: LayoutDashboard, title: "Admin dashboard", desc: "Complete control over your restaurant operations." },
    { icon: MenuIcon, title: "Menu management", desc: "Update items, prices, and availability in real-time." },
    { icon: CalendarCheck, title: "Booking management", desc: "Digital reservation log with automated confirmations." },
    { icon: QrCode, title: "QR scan & order", desc: "Contactless dining and digital menus for your tables." },
    { icon: CreditCard, title: "Instant payments", desc: "Secure and fast billing with multiple payment options." },
    { icon: TrendingUp, title: "Growth analytics", desc: "Actionable insights to scale your business." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col font-sans">
      {/* Hero Banner with Background Image */}
      <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden rounded-b-[40px] md:rounded-b-[60px] shadow-sm">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2000")',
          }}
        >
          {/* Subtle grain and gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900/90 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-center items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-10 w-full max-w-4xl pt-8"
          >
            {/* Logo at the Top */}
            <div className="relative group inline-block hover:scale-105 transition-transform duration-500">
              <div className="absolute -inset-12 bg-white/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <img 
                src="/logo-full.png" 
                alt="BookMyTable" 
                className="h-28 md:h-44 object-contain relative z-10 drop-shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-4 px-4">
              <h2 className="text-xl md:text-2xl font-medium text-slate-300 tracking-wide">
                Something delicious is coming back...
              </h2>
              <h3 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                We’re setting the table <br className="hidden md:block" /> for something bigger.
              </h3>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content section */}
      <div className="relative -mt-16 pb-24 px-6 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white border border-slate-100 text-slate-800 px-6 py-2.5 rounded-full text-sm font-semibold mb-12 shadow-md hover:shadow-lg transition-shadow"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Relaunching on 1st June 2026
            </motion.div>

            <div className="mb-14 space-y-6">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-5xl text-slate-900 font-bold leading-tight tracking-tight"
              >
                A better way to reserve, discover & dine.
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg md:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl mx-auto"
              >
                We’re working behind the scenes using cutting-edge technology to deliver a faster, cleaner, and more premium platform for food lovers and restaurants.
                <br className="hidden md:block mt-2" />
                <span className="text-slate-800 font-medium">We’re coming back smarter, faster & tastier.</span>
              </motion.p>
            </div>

            {/* Subscription Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-md mx-auto"
            >
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-green-50 border border-green-100 p-8 rounded-3xl flex flex-col items-center text-center gap-4 shadow-sm"
                  >
                    <div className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-md">
                      <CheckCircle2 size={28} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-green-900 font-semibold text-xl">You're on the list!</h3>
                      <p className="text-green-700 text-sm">We'll notify you the moment we launch.</p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubscribe} className="relative group">
                    <div className="relative flex flex-col gap-4 bg-white p-3 rounded-[28px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="relative flex-grow">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="email" 
                          placeholder="Enter your email address"
                          className="w-full pl-14 pr-4 py-4 bg-transparent border-none outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-base"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={status === "loading"}
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-medium text-base shadow-md active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
                      >
                        {status === "loading" ? "Joining..." : "Notify me"}
                      </button>
                    </div>
                    {status === "error" && (
                      <p className="mt-4 text-red-500 text-sm font-medium text-center">
                        {errorMsg}
                      </p>
                    )}
                  </form>
                )}
              </AnimatePresence>
              
              <div className="mt-8 flex flex-row items-center justify-center gap-6 text-sm">
                <button 
                  onClick={handlePartnerClick}
                  className="text-slate-500 hover:text-slate-900 font-medium transition-colors hover:underline underline-offset-4"
                >
                  Partner with us
                </button>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <button 
                  onClick={handleContactClick}
                  className="text-slate-500 hover:text-slate-900 font-medium transition-colors hover:underline underline-offset-4"
                >
                  Contact support
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Restaurant Owner Section */}
      <div className="py-24 bg-white border-t border-slate-100 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Designed for restaurant success</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Empower your restaurant with our next-gen management suite. hover over features to discover.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 bg-slate-50 hover:bg-slate-100 rounded-3xl transition-all duration-300 border border-slate-100"
              >
                <div className="w-12 h-12 bg-white group-hover:bg-slate-900 group-hover:text-white transition-colors rounded-xl flex items-center justify-center shadow-sm text-slate-700 mb-6 border border-slate-100">
                  <feature.icon size={22} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <button 
              onClick={handlePartnerClick}
              className="inline-flex items-center gap-2 text-slate-900 font-semibold text-lg hover:gap-4 transition-all group border-b border-transparent hover:border-slate-900 pb-1"
            >
              Partner with BookMyTable <span className="transform transition-transform text-orange-500 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

