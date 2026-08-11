import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

offers_pattern = re.compile(r"(\{activeTab === 'offers' && \(\s*<div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500\">)\s*<div className=\"flex items-center justify-between\">\s*<div>\s*<h3 className=\"text-sm uppercase tracking-widest text-\[#363636\] font-normal leading-\[1\.2\]\">Ongoing Offers</h3>\s*<p className=\"text-xs text-slate-500 mt-1\">Manage discounts and seasonal promotions</p>\s*</div>\s*<button onClick=\{\(\) => \{\s*setNewOffer\(\{ title: '', description: '', validFrom: '', validUntil: '' \}\);\s*setAddOfferModal\(true\);\s*\}\} className=\"flex items-center gap-1\.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors\">\s*<Plus size=\{14\} /> Add Offer\s*</button>\s*</div>\s*<div className=\"space-y-4\">\s*\{\(!formData\.offers \|\| formData\.offers\.length === 0\) \? \(\s*<div className=\"p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm\">\s*No active offers\.\s*</div>\s*\) : \(\s*<div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\s*\{formData\.offers\.map\(\(item, idx\) => \(\s*<div key=\{idx\} className=\"bg-amber-50/50 border border-amber-100 p-4 rounded-xl relative group\">\s*<button onClick=\{\(\) => \{\s*const newOffers = \[\.\.\.formData\.offers!\];\s*newOffers\.splice\(idx, 1\);\s*updateForm\('offers', newOffers\);\s*\}\} className=\"absolute top-2 right-2 p-1\.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors\">\s*<X size=\{14\} />\s*</button>\s*<div className=\"space-y-2 mt-1 pr-6\">\s*<input type=\"text\" placeholder=\"Offer Title\" value=\{item\.title\} onChange=\{e => \{\s*const newOffers = \[\.\.\.formData\.offers!\];\s*newOffers\[idx\]\.title = e\.target\.value;\s*updateForm\('offers', newOffers\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-bold outline-none\" />\s*<div className=\"flex gap-3\">\s*<div className=\"flex-1\">\s*<span className=\"text-\[10px\] text-amber-700 font-black mb-1 block uppercase\">Valid From</span>\s*<input type=\"date\" value=\{item\.validFrom\} onChange=\{e => \{\s*const newOffers = \[\.\.\.formData\.offers!\];\s*newOffers\[idx\]\.validFrom = e\.target\.value;\s*updateForm\('offers', newOffers\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none\" />\s*</div>\s*<div className=\"flex-1\">\s*<span className=\"text-\[10px\] text-amber-700 font-black mb-1 block uppercase\">Valid Until</span>\s*<input type=\"date\" value=\{item\.validUntil\} onChange=\{e => \{\s*const newOffers = \[\.\.\.formData\.offers!\];\s*newOffers\[idx\]\.validUntil = e\.target\.value;\s*updateForm\('offers', newOffers\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none\" />\s*</div>\s*</div>\s*<textarea placeholder=\"Description \(e\.g\. 20% off on bills above ₹1000\)\" value=\{item\.description \|\| ''\} onChange=\{e => \{\s*const newOffers = \[\.\.\.formData\.offers!\];\s*newOffers\[idx\]\.description = e\.target\.value;\s*updateForm\('offers', newOffers\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none resize-none\" rows=\{2\} />\s*</div>\s*</div>\s*\)\)\}\s*</div>\s*\)\}", re.DOTALL)

offers_replacement = r"""\1
                   <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Ongoing Offers</h3>
                        <p className="text-sm text-slate-500 mt-1">Manage discounts and seasonal promotions</p>
                      </div>
                      <button onClick={() => {
                        setNewOffer({ title: '', description: '', validFrom: '', validUntil: '' });
                        setAddOfferModal(true);
                      }} className="flex items-center justify-center gap-2 bg-amber-50 text-amber-600 hover:bg-amber-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-amber-100">
                        <Plus size={16} /> Add Offer
                      </button>
                    </div>

                    <div>
                      {(!formData.offers || formData.offers.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <Tag size={24} />
                          </div>
                          <p>No active offers configured.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formData.offers.map((item, idx) => (
                            <div key={idx} className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl relative group hover:shadow-md transition-all">
                              <button onClick={() => {
                                const newOffers = [...formData.offers!];
                                newOffers.splice(idx, 1);
                                updateForm('offers', newOffers);
                              }} className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                                <Trash2 size={16} />
                              </button>
                              <div className="space-y-4 pr-10">
                                <div>
                                  <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Offer Title</label>
                                  <input type="text" placeholder="e.g. 20% Off Weekend" value={item.title} onChange={e => {
                                    const newOffers = [...formData.offers!];
                                    newOffers[idx].title = e.target.value;
                                    updateForm('offers', newOffers);
                                  }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                </div>
                                
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Valid From</label>
                                    <input type="date" value={item.validFrom} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validFrom = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Valid Until</label>
                                    <input type="date" value={item.validUntil} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validUntil = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Description</label>
                                  <textarea placeholder="e.g. 20% off on bills above ₹1000" value={item.description || ''} onChange={e => {
                                    const newOffers = [...formData.offers!];
                                    newOffers[idx].description = e.target.value;
                                    updateForm('offers', newOffers);
                                  }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-medium text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm resize-none" rows={2} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>"""

content = offers_pattern.sub(offers_replacement, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)

