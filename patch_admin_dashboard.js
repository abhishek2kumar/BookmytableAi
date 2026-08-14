const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboardView.tsx', 'utf-8');

const targetStr = `                  <div className="bg-white p-8 rounded-[40px] border border-slate-300 shadow-vibrant flex flex-col justify-center opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                        <Settings size={24} />
                      </div>
                      <div>
                        <p className="font-normal leading-[1.2] text-slate-400 text-lg uppercase tracking-tight">
                          Advanced System Lockdown
                        </p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                          Read-Only Mode (TBD)
                        </p>
                      </div>
                    </div>
                  </div>`;

const replacement = `                  <div className="bg-white p-8 rounded-[40px] border border-slate-300 shadow-vibrant space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Image size={24} />
                      </div>
                      <div>
                        <p className="font-normal leading-[1.2] text-[#363636] text-lg uppercase tracking-tight">
                          Home Hero Image
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Applies to Landing Page
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <input 
                        type="text" 
                        value={appSettings?.homeHeroImage || ""}
                        onChange={(e) => updateGlobalSettings({ homeHeroImage: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-medium text-slate-700"
                      />
                    </div>
                  </div>`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/components/AdminDashboardView.tsx', content);
