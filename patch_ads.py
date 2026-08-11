import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

ads_pattern = re.compile(r"(\{activeTab === 'ads' && \(\s*<div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500\">)\s*<div className=\"flex items-center justify-between\">\s*<div>\s*<h3 className=\"text-sm uppercase tracking-widest text-\[#363636\] font-normal leading-\[1\.2\]\">Advertisement Campaigns</h3>\s*<p className=\"text-xs text-slate-500 mt-1\">Manage visual ads and video promos</p>\s*</div>\s*<button onClick=\{\(\) => \{\s*setNewAdForm\(\{ title: '', description: '', image: '', validFrom: new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\] \}\);\s*setAddAdModal\(true\);\s*\}\} className=\"flex items-center gap-1\.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors\">\s*<Plus size=\{14\} /> Create New Ad\s*</button>\s*</div>\s*<div className=\"space-y-4\">\s*\{\(!formData\.advertisements \|\| formData\.advertisements\.length === 0\) \? \(\s*<div className=\"p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm\">\s*No active advertisements\.\s*</div>\s*\) : \(\s*<div className=\"grid grid-cols-1 gap-6\">\s*\{formData\.advertisements\.map\(\(ad, idx\) => \(\s*<div key=\{`\$\{ad\.id \|\| 'ad'\}-\$\{idx\}`\} className=\"bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6\">\s*<div className=\"flex items-start justify-between\">\s*<div className=\"space-y-6 flex-grow mr-6 text-left\">\s*<div className=\"flex items-center justify-between\">\s*<div className=\"flex items-center gap-3\">\s*<span className=\{cn\(\"w-3 h-3 rounded-full animate-pulse\", ad\.active \? \"bg-green-500\" : \"bg-slate-300\"\)\} />\s*<h4 className=\"text-sm uppercase tracking-widest text-\[#363636\] font-normal leading-\[1\.2\]\">Ad Slot #\{idx \+ 1\}</h4>\s*</div>\s*<button type=\"button\" onClick=\{\(\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\[idx\]\.active = !ad\.active;\s*updateForm\('advertisements', newAds\);\s*\}\} className=\{cn\(\"px-4 py-1\.5 rounded-lg text-\[10px\] font-black uppercase tracking-widest transition-all\", ad\.active \? \"bg-green-100 text-green-600\" : \"bg-slate-200 text-slate-400\"\)\}>\s*\{ad\.active \? \"Active\" : \"Paused\"\}\s*</button>\s*</div>\s*<div className=\"space-y-4\">\s*<div className=\"space-y-2\">\s*<label className=\"text-\[10px\] font-black text-slate-400 uppercase tracking-widest px-1\">Campaign Title</label>\s*<input className=\"w-full px-4 py-2\.5 bg-white border border-slate-200 rounded-xl font-normal text-\[#363636\] leading-\[1\.2\] focus:border-blue-600 outline-none\" value=\{ad\.title\} onChange=\{\(e\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\[idx\]\.title = e\.target\.value;\s*updateForm\('advertisements', newAds\);\s*\}\} placeholder=\"Monsoon Special Ad\.\.\.\" />\s*</div>\s*<div className=\"space-y-2\">\s*<label className=\"text-\[10px\] font-black text-slate-400 uppercase tracking-widest px-1\">Ad Description / Target URL</label>\s*<input className=\"w-full px-4 py-2\.5 bg-white border border-slate-200 rounded-xl font-normal text-\[#363636\] leading-\[1\.2\] focus:border-blue-600 outline-none\" value=\{ad\.description\} onChange=\{\(e\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\[idx\]\.description = e\.target\.value;\s*updateForm\('advertisements', newAds\);\s*\}\} placeholder=\"https://\.\.\.\" />\s*</div>\s*</div>\s*</div>\s*<div className=\"w-48 h-32 bg-slate-200 rounded-xl overflow-hidden shrink-0 relative group/img\">\s*\{ad\.image \? \(\s*<img src=\{ad\.image\} alt=\"Ad\" className=\"w-full h-full object-cover\" />\s*\) : \(\s*<div className=\"w-full h-full flex flex-col items-center justify-center text-slate-400\">\s*<ImagePlus size=\{24\} className=\"mb-2\" />\s*<span className=\"text-\[10px\] uppercase tracking-widest font-black\">No Image</span>\s*</div>\s*\)\}\s*<button onClick=\{\(\) => \{\s*setAdUploadIndex\(idx\);\s*if \(adFileInputRef\.current\) \{\s*adFileInputRef\.current\.click\(\);\s*\}\s*\}\} className=\"absolute inset-0 bg-black/50 text-white flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity flex\">\s*<Upload size=\{20\} className=\"mb-1\" />\s*<span className=\"text-xs font-medium\">Change</span>\s*</button>\s*</div>\s*</div>\s*<div className=\"flex items-center justify-between pt-6 border-t border-slate-200\">\s*<div className=\"flex gap-4\">\s*<div className=\"space-y-1\">\s*<label className=\"text-\[10px\] font-black text-slate-400 uppercase tracking-widest px-1\">Start Date</label>\s*<input type=\"date\" value=\{ad\.validFrom\} onChange=\{\(e\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\[idx\]\.validFrom = e\.target\.value;\s*updateForm\('advertisements', newAds\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none\" />\s*</div>\s*<div className=\"space-y-1\">\s*<label className=\"text-\[10px\] font-black text-slate-400 uppercase tracking-widest px-1\">End Date</label>\s*<input type=\"date\" value=\{ad\.validUntil\} onChange=\{\(e\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\[idx\]\.validUntil = e\.target\.value;\s*updateForm\('advertisements', newAds\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none\" />\s*</div>\s*</div>\s*<button type=\"button\" onClick=\{\(\) => \{\s*const newAds = \[\.\.\.formData\.advertisements!\];\s*newAds\.splice\(idx, 1\);\s*updateForm\('advertisements', newAds\);\s*\}\} className=\"p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors\">\s*<Trash2 size=\{18\} />\s*</button>\s*</div>\s*</div>\s*\)\)\}\s*</div>\s*\)\}", re.DOTALL)

ads_replacement = r"""\1
                   <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Advertisement Campaigns</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage visual ads and video promos</p>
                      </div>
                      <button onClick={() => {
                        setNewAdForm({ title: '', description: '', image: '', validFrom: new Date().toISOString().split('T')[0] });
                        setAddAdModal(true);
                      }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
                        <Plus size={16} /> Create New Ad
                      </button>
                    </div>

                    <div>
                      {(!formData.advertisements || formData.advertisements.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <Megaphone size={24} />
                          </div>
                          <p>No active advertisements.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {formData.advertisements.map((ad, idx) => (
                            <div key={`${ad.id || 'ad'}-${idx}`} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6 hover:shadow-md transition-all group">
                              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                <div className="space-y-6 flex-grow text-left w-full md:w-auto">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className={cn("w-3 h-3 rounded-full animate-pulse", ad.active ? "bg-green-500" : "bg-slate-300")} />
                                      <h4 className="text-sm font-bold text-slate-700">Ad Slot #{idx + 1}</h4>
                                    </div>
                                    <button type="button" onClick={() => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].active = !ad.active;
                                      updateForm('advertisements', newAds);
                                    }} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", ad.active ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500")}>
                                      {ad.active ? "Active" : "Paused"}
                                    </button>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Campaign Title</label>
                                      <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" value={ad.title} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].title = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} placeholder="Monsoon Special Ad..." />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ad Description / Target URL</label>
                                      <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" value={ad.description} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].description = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} placeholder="https://..." />
                                    </div>
                                  </div>
                                </div>
                                <div className="w-full md:w-56 h-40 bg-white rounded-2xl border border-slate-200 overflow-hidden shrink-0 relative group/img shadow-sm flex-shrink-0">
                                  {ad.image ? (
                                    <img src={ad.image} alt="Ad" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                      <ImagePlus size={32} className="mb-2" />
                                      <span className="text-[10px] uppercase tracking-widest font-black">No Image</span>
                                    </div>
                                  )}
                                  <button onClick={() => {
                                    setAdUploadIndex(idx);
                                    if (adFileInputRef.current) {
                                      adFileInputRef.current.click();
                                    }
                                  }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm text-white flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all flex">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs font-bold">Change Image</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-slate-200 gap-4">
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                  <div className="flex-1 sm:flex-none">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                                    <input type="date" value={ad.validFrom} onChange={(e) => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].validFrom = e.target.value;
                                      updateForm('advertisements', newAds);
                                    }} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none shadow-sm" />
                                  </div>
                                  <div className="flex-1 sm:flex-none">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                                    <input type="date" value={ad.validUntil} onChange={(e) => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].validUntil = e.target.value;
                                      updateForm('advertisements', newAds);
                                    }} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none shadow-sm" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const newAds = [...formData.advertisements!];
                                  newAds.splice(idx, 1);
                                  updateForm('advertisements', newAds);
                                }} className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors self-end sm:self-auto w-full sm:w-auto shadow-sm sm:shadow-none bg-white sm:bg-transparent border border-red-100 sm:border-none">
                                  <Trash2 size={18} />
                                  <span className="ml-2 text-sm font-bold sm:hidden">Remove Ad</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>"""

content = ads_pattern.sub(ads_replacement, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)

