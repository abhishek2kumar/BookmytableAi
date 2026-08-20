const fs = require('fs');

let content = fs.readFileSync('src/components/HomeLandingView.tsx', 'utf-8');

const targetStr = `            <div className="relative scale-110 md:translate-x-10">
               <div className="w-64 h-[500px] bg-slate-900 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden group-hover:-translate-y-4 transition-transform duration-700">
                  {/* Phone Notch/Header */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 z-30 flex items-center justify-center">
                     <div className="w-16 h-1 bg-slate-700 rounded-full" />
                  </div>
                  
                  {/* App Content Preview */}
                  <div className="absolute inset-0 bg-white pt-6 overflow-hidden flex flex-col">
                    {/* Tiny App Header */}
                    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-300 bg-white/80 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} className="text-brand" />
                        <span className="text-[9px] font-normal text-[#363636] leading-[1.2]">Pune, Maharashtra</span>
                        <ChevronDown size={8} className="text-slate-400" />
                      </div>
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-brand/20 rounded-full" />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-none pb-12">
                      {/* Tiny App Hero */}
                      <div className="px-3 py-3 space-y-3">
                         <div className="space-y-1">
                           <h4 className="text-[10px] text-[#363636] font-normal leading-[1.2]">Explore the best<br/>dining in Pune</h4>
                           <div className="h-1.5 w-12 bg-brand/20 rounded-full" />
                         </div>
                         <div className="h-7 w-full bg-slate-50 border border-slate-300 rounded-lg flex items-center px-2 shadow-sm">
                            <Search size={10} className="text-slate-300 mr-1.5" />
                            <div className="h-1.5 w-24 bg-slate-200/50 rounded-full" />
                         </div>
                      </div>

                      {/* Tiny Categories */}
                      <div className="px-3 space-y-2 mb-4">
                         <div className="flex justify-between items-center">
                            <span className="text-[8px] font-normal text-[#363636] leading-[1.2] uppercase tracking-wider">Cuisines</span>
                            <div className="h-1 w-6 bg-brand/10 rounded-full" />
                         </div>
                         <div className="flex gap-2 overflow-x-auto scrollbar-none">
                            {['Italian', 'Chinese', 'Indian', 'Bakery'].map((c, i) => (
                              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                                 <div className={cn("w-10 h-10 rounded-lg shadow-sm border border-slate-50", i === 0 ? "bg-brand/10" : "bg-slate-50")} />
                                 <div className="h-1 w-6 bg-slate-200 rounded-full" />
                              </div>
                            ))}
                         </div>
                      </div>

                      {/* Tiny Restaurant List */}
                      <div className="px-3 space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[8px] font-normal text-[#363636] leading-[1.2] uppercase tracking-wider">Trending Now</span>
                         </div>
                         {[1,2,3].map(i => (
                           <div key={i} className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
                              <div className="h-20 w-full bg-slate-100 relative">
                                 <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm flex items-center gap-0.5">
                                    <Star size={6} className="fill-brand text-brand" />
                                    <span className="text-[6px] font-normal leading-[1.2] text-brand">4.5</span>
                                 </div>
                                 <div className="absolute bottom-2 left-2 h-3.5 w-16 bg-brand/90 rounded px-1 flex items-center gap-1">
                                    <Zap size={6} className="text-white fill-white" />
                                    <span className="text-[6px] font-normal leading-[1.2] text-white uppercase">50% OFF</span>
                                 </div>
                              </div>
                              <div className="p-2 space-y-1">
                                 <div className="flex justify-between items-start">
                                    <div className="h-2 w-16 bg-slate-900 rounded-full" />
                                 </div>
                                 <div className="flex justify-between">
                                    <div className="h-1.5 w-12 bg-slate-300 rounded-full" />
                                    <div className="h-1.5 w-8 bg-slate-200 rounded-full" />
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Tiny Bottom Nav */}
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-white border-t border-slate-300 flex items-center justify-around px-2 z-20">
                      {[1,2,3,4].map(i => (
                         <div key={i} className={cn("w-6 h-6 rounded-full", i === 1 ? "bg-brand/20" : "bg-slate-100")} />
                      ))}
                    </div>
                  </div>
               </div>
            </div>`;

const replacement = `            <div className="relative md:translate-x-10 group-hover:-translate-y-4 transition-transform duration-700">
               <img 
                 src="/mobile-app-mockup.png" 
                 alt="Mobile App Preview" 
                 className="w-full max-w-[320px] h-auto object-contain drop-shadow-2xl"
                 onError={(e) => {
                   // Fallback visual if they haven't uploaded the image yet
                   e.currentTarget.style.display = 'none';
                   const fallback = document.getElementById('mockup-fallback');
                   if (fallback) fallback.style.display = 'flex';
                 }}
               />
               <div id="mockup-fallback" className="hidden w-64 h-[500px] bg-slate-800 rounded-[2.5rem] border-[8px] border-slate-700 shadow-2xl relative overflow-hidden flex-col items-center justify-center text-center p-6">
                 <p className="text-white/60 text-sm font-medium mb-4">Awaiting Image Upload</p>
                 <p className="text-white/40 text-xs">Please upload your image as <span className="font-bold text-white">mobile-app-mockup.png</span> in the public folder.</p>
               </div>
            </div>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/components/HomeLandingView.tsx', content);
