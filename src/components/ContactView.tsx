import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function ContactView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    <div className="bg-vibrant-bg min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-black text-vibrant-dark mb-4"
          >
            Get in Touch
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-vibrant-gray max-w-2xl mx-auto"
          >
            Have a question or feedback? We'd love to hear from you. Our team is here to help you get the most out of your dining experience.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-vibrant">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Email Us</h3>
                  <p className="text-lg font-bold text-vibrant-dark">bookmytableindia@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Call Us</h3>
                  <p className="text-lg font-bold text-vibrant-dark">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Office</h3>
                  <p className="text-lg font-bold text-vibrant-dark">Mumbai, India</p>
                </div>
              </div>
            </div>

            <div className="bg-vibrant-dark p-8 rounded-[2.5rem] text-white shadow-xl overflow-hidden relative">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Mail size={120} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-xl font-display font-bold mb-2">Partner with us</h3>
                 <p className="text-white/60 text-sm font-medium mb-6">Want to list your restaurant? Reach out to our sales team.</p>
                 <button className="bg-brand text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all">
                    Register Hospital
                 </button>
               </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-vibrant h-full">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-20"
                >
                  <div className="w-20 h-20 bg-vibrant-success/10 text-vibrant-success rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-3xl font-display font-bold text-vibrant-dark mb-2">Message Sent!</h2>
                  <p className="text-vibrant-gray font-medium">Thank you for reaching out. We'll get back to you shortly at bookmytableindia@gmail.com.</p>
                  <button 
                    onClick={() => setSubmitted(false)}
                    className="mt-8 text-brand font-bold hover:underline"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Full Name</label>
                      <input 
                        required
                        name="name"
                        type="text" 
                        placeholder="John Doe"
                        className="w-full p-5 bg-slate-50 border-none focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-2xl outline-none text-base font-medium transition-all shadow-inner-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Email Address</label>
                      <input 
                        required
                        name="email"
                        type="email" 
                        placeholder="john@example.com"
                        className="w-full p-5 bg-slate-50 border-none focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-2xl outline-none text-base font-medium transition-all shadow-inner-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Subject</label>
                    <input 
                      required
                      name="subject"
                      type="text" 
                      placeholder="How can we help?"
                      className="w-full p-5 bg-slate-50 border-none focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-2xl outline-none text-base font-medium transition-all shadow-inner-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Message</label>
                    <textarea 
                      required
                      name="message"
                      rows={6}
                      placeholder="Tell us more about your inquiry..."
                      className="w-full p-6 bg-slate-50 border-none focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-3xl outline-none text-base font-medium transition-all resize-none shadow-inner-sm"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand text-white py-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-brand-dark transition-all disabled:opacity-50 active:scale-[0.98] shadow-2xl shadow-brand/20 uppercase tracking-widest"
                  >
                    {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
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
