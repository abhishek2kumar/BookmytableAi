with open('src/components/PartnerDashboardView.tsx', 'r') as f:
    content = f.read()

target = """{activeTab === 'media' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <ImageUploadInput onError={(msg: string) => showToast(msg, 'error')} label="Primary Image URL" tooltip="The main cover photo displayed on your restaurant's profile and in search results." value={formData.image} onChange={(v:any) => updateForm('image', v)} />
                   {formData.image && <img src={formData.image} alt="Primary" className="w-full max-w-lg h-64 object-cover rounded-xl border border-slate-300 shadow-sm" />}
                   
                   <div className="pt-4 border-t border-slate-300">
                     {renderImageInputList("Food Images", 'foodImages', "Photos of your signature dishes.")}
                   </div>
                   <div className="pt-4 border-t border-slate-300">
                     {renderImageInputList("Ambience Images", 'ambienceImages', "Photos showing the interior, seating, and general atmosphere of your restaurant.")}
                   </div>
                   <div className="pt-4 border-t border-slate-300">
                     {renderImageInputList("Secondary Images", 'secondaryImages', "Additional photos highlighting special features, exterior, or events to give customers a complete feel.")}
                   </div>
                   <div className="pt-4 border-t border-slate-300">
                     {renderImageInputList("Menu Images (Legacy)", 'menuImages', "Photos of your physical menu pages.")}
                   </div>
                   <div className="pt-4 border-t border-slate-300">
                     {renderMenuCategories()}
                   </div>
                 </div>
               )}"""

replacement = """{activeTab === 'media' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   
                   <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
                     <div className="mb-6">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Primary Cover Image</h3>
                       <p className="text-sm text-slate-500 mt-1">The main cover photo displayed on your restaurant's profile and in search results.</p>
                     </div>
                     <div className="flex flex-col lg:flex-row gap-8">
                       <div className="w-full lg:w-1/2">
                         {formData.image ? (
                           <div className="relative group rounded-3xl overflow-hidden shadow-md aspect-video border border-slate-200">
                             <button onClick={() => updateForm('image', '')} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                               <X size={16} />
                             </button>
                             <img src={formData.image} alt="Primary Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                         ) : (
                           <div className="w-full aspect-video bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                               <ImageIcon size={24} />
                             </div>
                             <p className="font-medium text-sm">No cover image set.</p>
                           </div>
                         )}
                       </div>
                       <div className="w-full lg:w-1/2 flex flex-col justify-center">
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           <ImageUploadInput onError={(msg: string) => showToast(msg, 'error')} label="Upload New Cover Image" value={formData.image} onChange={(v:any) => updateForm('image', v)} />
                         </div>
                       </div>
                     </div>
                   </div>

                   {renderImageInputList("Food Images", 'foodImages', "Photos of your signature dishes.")}
                   {renderImageInputList("Ambience Images", 'ambienceImages', "Photos showing the interior, seating, and general atmosphere of your restaurant.")}
                   {renderImageInputList("Secondary Images", 'secondaryImages', "Additional photos highlighting special features, exterior, or events to give customers a complete feel.")}
                   {renderImageInputList("Menu Images (Legacy)", 'menuImages', "Photos of your physical menu pages.")}
                   {renderMenuCategories()}
                 </div>
               )}"""

# Note the whitespace might be different, let's use a more robust replace block by searching for the start and end string
import re
start_str = r"\{activeTab === 'media' && \(\s*<div className=\"space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500\">\s*<ImageUploadInput"
end_str = r"\{renderMenuCategories\(\)\}\s*</div>\s*</div>\s*\)"

pattern = re.compile(start_str + r".*?" + end_str, re.DOTALL)
content = pattern.sub(replacement, content)

with open('src/components/PartnerDashboardView.tsx', 'w') as f:
    f.write(content)

