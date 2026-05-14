import { motion } from 'framer-motion';
import { Users, MapPin, Building2, Calendar, Award, Heart, UtensilsCrossed, Globe2 } from 'lucide-react';
import AppIcon from './AppIcon';

export default function AboutView() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-32 md:pb-24">
      {/* Hero Section */}
      <section className="relative px-4 mb-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <AppIcon size={80} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-black text-slate-900 mb-6 tracking-tight"
          >
            Connecting People Over <span className="text-brand">Great Food</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto"
          >
            We are Bookmytable, on a mission to simplify dining out. Discover new flavors, book tables instantly, and enjoy seamless experiences at your favorite restaurants.
          </motion.p>
        </div>
      </section>

      {/* Stats/Info Banner */}
      <section className="bg-white border-y border-slate-200 py-12 mb-20 flex flex-col items-center">
        <div className="max-w-7xl w-full px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
            <motion.div {...fadeIn} className="text-center px-4">
              <div className="text-4xl font-black text-brand mb-2">2017</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Year Founded</div>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="text-center px-4">
              <div className="text-4xl font-black text-slate-900 mb-2 text-center flex justify-center">Pune</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Headquarters</div>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="text-center px-4">
              <div className="text-4xl font-black text-brand mb-2 text-center flex justify-center">1M+</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Diners Served</div>
            </motion.div>
            <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="text-center px-4">
              <div className="text-4xl font-black text-slate-900 mb-2 text-center flex justify-center">10k+</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Partner Restaurants</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Story */}
      <section className="max-w-7xl mx-auto px-4 mb-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeIn}>
            <div className="aspect-[4/3] rounded-[2rem] overflow-hidden bg-slate-200 relative group">
              <img 
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
                alt="Restaurant interior" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-8">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white">
                  <div className="font-bold text-xl mb-1 flex items-center gap-2"><MapPin size={20}/> Heywelt Technologies India Pvt Ltd</div>
                  <div className="text-white/80 text-sm font-medium">Our registered entity</div>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-display font-black text-slate-900 mb-6">Our Story</h2>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
              <p>
                Founded in <strong className="text-slate-900">2017</strong> and headquartered in <strong className="text-slate-900">Pune, Maharashtra, India</strong>, Bookmytable (registered as <em>Heywelt Technologies India Pvt Ltd</em>) emerged from a simple observation: deciding where to eat and securing a table should be as enjoyable as the meal itself.
              </p>
              <p>
                What started as a small team of food enthusiasts in Pune has grown into a leading platform that bridges the gap between passionate diners and exceptional restaurants across the country.
              </p>
              <p>
                We believe that dining out is more than just having a meal; it's about creating memories, celebrating milestones, and connecting with people. Our technology is built to foster these connections seamlessly.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-900 py-24 text-white mx-4 rounded-[3rem]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-black mb-6 text-white">Our Core Values</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">The principles that drive us every day to build the best dining platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
             {[
               { icon: Heart, title: 'Customer First', desc: 'We obsess over the diner\'s experience, ensuring every booking is smooth and every meal is memorable.' },
               { icon: Building2, title: 'Empower Restaurants', desc: 'We provide our restaurant partners with the best tools to grow their business and manage operations efficiently.' },
               { icon: Globe2, title: 'Innovation', desc: 'Constantly pushing the boundaries of technology to solve real-world problems in the hospitality industry.' }
             ].map((value, i) => (
               <motion.div 
                 key={i}
                 {...fadeIn}
                 transition={{ delay: i * 0.1 }}
                 className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-brand/10 transition-colors group"
               >
                 <div className="w-14 h-14 bg-white/10 group-hover:bg-brand/20 text-brand rounded-2xl flex items-center justify-center mb-6 transition-colors">
                   <value.icon size={28} />
                 </div>
                 <h3 className="text-2xl font-black mb-4 text-white">{value.title}</h3>
                 <p className="text-slate-400 leading-relaxed">{value.desc}</p>
               </motion.div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
}
