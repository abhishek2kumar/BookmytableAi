import re

with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

# Replace renderImageInputList
pattern_img_list = re.compile(r"const renderImageInputList = \(label: string, field: 'secondaryImages' \| 'menuImages' \| 'foodImages' \| 'ambienceImages', tooltip\?: string\) => \{.*?return \(\s*<div>.*?</div>\s*\);\s*\};", re.DOTALL)

replacement_img_list = """const renderImageInputList = (label: string, field: 'secondaryImages' | 'menuImages' | 'foodImages' | 'ambienceImages', tooltip?: string) => {
    const isStringArrayOnly = field === 'foodImages' || field === 'ambienceImages';
    return (
    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
        <div>
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{label}</h3>
           {tooltip && <p className="text-sm text-slate-500 mt-1">{tooltip}</p>}
        </div>
        <button onClick={() => {
          setNewImageForm({ url: '', category: '' });
          setAddImageModal({ field, label, isStringArrayOnly });
        }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
          <Plus size={16} /> Add Image
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(!formData[field] || formData[field].length === 0) ? (
           <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
               <ImageIcon size={24} />
             </div>
             <p>No images added yet.</p>
           </div>
        ) : formData[field].map((item: any, idx: number) => {
          const urlStr = typeof item === 'string' ? item : item.url;
          const categoryStr = typeof item === 'string' ? '' : (item.category || '');

          return (
          <div key={idx} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
             <button onClick={() => handleDeleteImage(field, idx, urlStr, label)} className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                <Trash2 size={16} />
             </button>
             {urlStr ? (
               <img src={urlStr} alt={`Preview ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                 <ImageIcon size={28} />
                 <span className="text-xs font-medium">Empty</span>
               </div>
             )}
             {!isStringArrayOnly && (
               <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <input
                    type="text"
                    placeholder="Set category..."
                    value={categoryStr}
                    onChange={(e) => {
                      const arr = [...formData[field]!];
                      arr[idx] = { url: urlStr, category: e.target.value };
                      updateForm(field, arr as any);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-xs font-medium backdrop-blur-md"
                  />
               </div>
             )}
             {!isStringArrayOnly && categoryStr && (
               <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
                  <span className="text-xs font-bold text-white drop-shadow-sm truncate">{categoryStr}</span>
               </div>
             )}
          </div>
        )})}
      </div>
    </div>
  );
  };"""

content = pattern_img_list.sub(replacement_img_list, content)

# Replace renderMenuCategories
pattern_menu = re.compile(r"const renderMenuCategories = \(\) => \(\s*<div>.*?</div>\s*\);\s*const renderBookingsTab = \(\) =>", re.DOTALL)

replacement_menu = """const renderMenuCategories = () => (
    <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
        <div>
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Menu Categories</h3>
           <p className="text-sm text-slate-500 mt-1">Organize your menu images into categories like 'Starters', 'Main Course', 'Desserts', etc.</p>
        </div>
        <button onClick={() => {
          setNewMenuCategoryName('');
          setAddMenuCategoryModal(true);
        }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="space-y-8">
        {(!formData.menuCategories || formData.menuCategories.length === 0) ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
               <ImageIcon size={24} />
             </div>
             <p>No menu categories added yet.</p>
          </div>
        ) : formData.menuCategories.map((cat, catIdx) => (
          <div key={cat.id || catIdx} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 relative group transition-all hover:shadow-sm">
             <button onClick={() => {
                const arr = [...formData.menuCategories!];
                arr.splice(catIdx, 1);
                updateForm('menuCategories', arr);
             }} className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                <Trash2 size={16} />
             </button>
             
             <div className="mb-6 pr-12">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunday brunch"
                  value={cat.name}
                  onChange={(e) => {
                    const arr = [...formData.menuCategories!];
                    arr[catIdx] = { ...cat, name: e.target.value };
                    updateForm('menuCategories', arr);
                  }}
                  className="w-full lg:w-1/2 px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium bg-white"
                />
             </div>
             
             <div className="flex items-center justify-between mb-4 border-t border-slate-200 pt-6">
               <h4 className="text-sm font-bold text-slate-700">Category Images</h4>
               <button onClick={() => {
                  setNewImageForm({ url: '', category: '' });
                  setAddImageModal({ field: 'menuCategories', label: 'Image for ' + cat.name, isStringArrayOnly: true, catIdx: catIdx } as any);
               }} className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm shadow-blue-100">
                  <Plus size={14} /> Add Image
               </button>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {(!cat.images || cat.images.length === 0) ? (
                   <div className="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 font-medium text-xs">
                     No images in this category.
                   </div>
                ) : cat.images.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} className="group/img relative aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                     <button onClick={() => handleDeleteCategoryImage(catIdx, imgIdx, imgUrl, cat.name)} className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover/img:opacity-100 scale-90 group-hover/img:scale-100">
                        <Trash2 size={16} />
                     </button>
                     {imgUrl ? (
                       <img src={imgUrl} alt={`Preview ${imgIdx}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                         <ImageIcon size={24} />
                         <span className="text-xs font-medium">Empty</span>
                       </div>
                     )}
                  </div>
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBookingsTab = () =>"""

content = pattern_menu.sub(replacement_menu, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)
