import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

# General Tab
general_pattern = re.compile(r"(\{activeTab === 'general' && \(\s*<div className=\"space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500\">\s*)(<div className=\"bg-slate-50 p-6 rounded-2xl border border-slate-300\">\s*<h3 className=\"text-sm uppercase tracking-widest mb-4 text-\[#363636\] font-normal leading-\[1\.2\]\">Basic Details</h3>)", re.DOTALL)
content = general_pattern.sub(r'\1<div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm">\n                     <div className="mb-6 pb-4 border-b border-slate-100">\n                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Basic Details</h3>\n                     </div>', content)

general_address_pattern = re.compile(r"(<div className=\"bg-slate-50 p-6 rounded-2xl border border-slate-300\">\s*<h3 className=\"text-sm uppercase tracking-widest mb-4 text-\[#363636\] font-normal leading-\[1\.2\]\">Address Details</h3>)", re.DOTALL)
content = general_address_pattern.sub(r'<div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm mt-8">\n                     <div className="mb-6 pb-4 border-b border-slate-100">\n                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Address Details</h3>\n                     </div>', content)

general_coord_pattern = re.compile(r"<div className=\"pt-6 border-t border-slate-300\">\s*<div className=\"flex items-center justify-between mb-4\">\s*<h4 className=\"text-xs uppercase tracking-widest text-\[#363636\] font-normal leading-\[1\.2\]\">Coordinates</h4>", re.DOTALL)
content = general_coord_pattern.sub(r'<div className="pt-8 mt-8 border-t border-slate-100">\n                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">\n                         <h4 className="text-sm font-bold text-slate-700">GPS Coordinates</h4>', content)

# Specialties Tab
specialties_pattern = re.compile(r"(\{activeTab === 'specialties' && \(\s*<div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500\">)\s*<div className=\"flex items-center justify-between\">\s*<div>\s*<h3 className=\"text-sm uppercase tracking-widest text-\[#363636\] font-normal leading-\[1\.2\]\">Signature Dishes</h3>\s*<p className=\"text-xs text-slate-500 mt-1\">Highlight your best dishes to attract diners</p>\s*</div>\s*<button onClick=\{\(\) => \{\s*setNewSignatureDish\(\{ name: '', price: 0, description: '' \}\);\s*setAddSignatureDishModal\(true\);\s*\}\} className=\"flex items-center gap-1\.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors\">\s*<Plus size=\{14\} /> Add Signature\s*</button>\s*</div>\s*<div className=\"space-y-4\">\s*\{\(!formData\.signatureDishes \|\| formData\.signatureDishes\.length === 0\) \? \(\s*<div className=\"p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm\">\s*No signature dishes configured\.\s*</div>\s*\) : \(\s*<div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">\s*\{formData\.signatureDishes\.map\(\(item, idx\) => \(\s*<div key=\{idx\} className=\"bg-slate-50 border border-slate-300 px-4 py-2\.5 rounded-xl relative group\">\s*<button onClick=\{\(\) => \{\s*const newSig = \[\.\.\.formData\.signatureDishes!\];\s*newSig\.splice\(idx, 1\);\s*updateForm\('signatureDishes', newSig\);\s*\}\} className=\"absolute top-2 right-2 p-1\.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors\">\s*<X size=\{14\} />\s*</button>\s*<div className=\"space-y-2 mt-1 pr-6\">\s*<input type=\"text\" placeholder=\"Dish Name\" value=\{item\.name\} onChange=\{e => \{\s*const newSig = \[\.\.\.formData\.signatureDishes!\];\s*newSig\[idx\]\.name = e\.target\.value;\s*updateForm\('signatureDishes', newSig\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-bold outline-none\" />\s*<input type=\"number\" placeholder=\"Price \(₹\)\" value=\{item\.price\} onChange=\{e => \{\s*const newSig = \[\.\.\.formData\.signatureDishes!\];\s*newSig\[idx\]\.price = parseInt\(e\.target\.value\) \|\| 0;\s*updateForm\('signatureDishes', newSig\);\s*\}\} className=\"w-32 px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-semibold outline-none\" />\s*<textarea placeholder=\"Description\" value=\{item\.description \|\| ''\} onChange=\{e => \{\s*const newSig = \[\.\.\.formData\.signatureDishes!\];\s*newSig\[idx\]\.description = e\.target\.value;\s*updateForm\('signatureDishes', newSig\);\s*\}\} className=\"w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-medium outline-none resize-none\" rows=\{2\} />\s*</div>\s*</div>\s*\)\)\}\s*</div>\s*\)\}", re.DOTALL)

specialties_replacement = r"""\1
                   <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Signature Dishes</h3>
                        <p className="text-sm text-slate-500 mt-1">Highlight your best dishes to attract diners</p>
                      </div>
                      <button onClick={() => {
                        setNewSignatureDish({ name: '', price: 0, description: '' });
                        setAddSignatureDishModal(true);
                      }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
                        <Plus size={16} /> Add Signature
                      </button>
                    </div>

                    <div>
                      {(!formData.signatureDishes || formData.signatureDishes.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <UtensilsCrossed size={24} />
                          </div>
                          <p>No signature dishes configured.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formData.signatureDishes.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative group hover:shadow-md transition-all">
                              <button onClick={() => {
                                const newSig = [...formData.signatureDishes!];
                                newSig.splice(idx, 1);
                                updateForm('signatureDishes', newSig);
                              }} className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                                <Trash2 size={16} />
                              </button>
                              <div className="space-y-4 pr-10">
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dish Name</label>
                                    <input type="text" placeholder="e.g. Truffle Mushroom Risotto" value={item.name} onChange={e => {
                                      const newSig = [...formData.signatureDishes!];
                                      newSig[idx].name = e.target.value;
                                      updateForm('signatureDishes', newSig);
                                    }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                                  </div>
                                  <div className="w-32">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Price (₹)</label>
                                    <input type="number" placeholder="0" value={item.price} onChange={e => {
                                        const newSig = [...formData.signatureDishes!];
                                        newSig[idx].price = parseInt(e.target.value) || 0;
                                        updateForm('signatureDishes', newSig);
                                      }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                                  <textarea placeholder="Describe the dish, its ingredients and what makes it special..." value={item.description || ''} onChange={e => {
                                    const newSig = [...formData.signatureDishes!];
                                    newSig[idx].description = e.target.value;
                                    updateForm('signatureDishes', newSig);
                                  }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm resize-none" rows={2} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>"""

content = specialties_pattern.sub(specialties_replacement, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)

