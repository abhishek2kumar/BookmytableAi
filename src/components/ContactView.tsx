import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function ContactView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-vibrant-bg min-h-screen pt-12 md:pt-16 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-10">
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-normal leading-[1.2] text-[#363636] mb-3 mt-4 md:mt-0"
          >
            Get in Touch
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base text-vibrant-gray max-w-2xl mx-auto"
          >
            Have a question or feedback? We'd love to hear from you. Our team is here to help you get the most out of your dining experience.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-vibrant">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Email Us</h3>
                  <p className="text-base font-medium text-[#363636]">contact@bookmytable.co.in</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Call Us</h3>
                  <p className="text-base font-medium text-[#363636]">+91 8639636729</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center text-brand shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Head Office</h3>
                  <p className="text-base font-medium text-[#363636]">Pune, India</p>
                </div>
              </div>
            </div>

            <div className="bg-vibrant-dark p-6 md:p-8 rounded-xl text-white shadow-xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                 <Mail size={80} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-lg md:text-xl mb-2 font-normal leading-[1.2]">Partner with us</h3>
                 <p className="text-white/70 text-sm font-medium mb-5 max-w-xs">Want to list your restaurant? Reach out to our sales team.</p>
                 <button onClick={() => {
                   navigate('/onboarding-request');
                 }} className="bg-brand text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all">
                    Register Restaurant
                 </button>
               </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-vibrant h-full">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-16"
                >
                  <div className="w-16 h-16 bg-vibrant-success/10 text-vibrant-success rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">Message Sent!</h2>
                  <p className="text-vibrant-gray text-sm md:text-base font-medium">Thank you for reaching out. We'll get back to you shortly!</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-brand font-bold text-sm hover:underline"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Name</label>
                      <input 
                        required
                        name="name"
                        type="text" 
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-sm md:text-base transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
                      <input 
                        required
                        name="email"
                        type="email" 
                        placeholder="john@example.com"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-sm md:text-base transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Contact Number</label>
                      <div className="flex gap-2">
                         <span className="px-4 py-3 bg-slate-50 text-slate-500 font-bold rounded-xl border border-slate-200 flex items-center justify-center text-sm md:text-base">+91</span>
                         <input 
                           required
                           name="phone"
                           type="tel" 
                           placeholder="9988776655"
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-sm md:text-base transition-all"
                         />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Subject</label>
                      <input 
                        required
                        name="subject"
                        type="text" 
                        placeholder="How can we help?"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-sm md:text-base transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Message</label>
                    <textarea 
                      required
                      name="message"
                      rows={5}
                      placeholder="Tell us more about your inquiry..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-brand/40 focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-sm md:text-base transition-all resize-y"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-brand-dark transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-brand/20 uppercase tracking-widest mt-2"
                  >
                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
