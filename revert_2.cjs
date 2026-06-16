const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

const regex3 = /<div className="w-full flex justify-end md:hidden">\n\s*<button\n\s*className="p-2 text-vibrant-gray hover:text-brand transition-colors"\n\s*onClick=\{\(\) => setIsSearchOverlayOpen\(true\)\}\n\s*>\n\s*<Search size=\{22\} className="stroke-\[2\.5\]" \/>\n\s*<\/button>\n\s*<\/div>/;

content = content.replace(regex3, `<div className="w-full flex justify-end md:block">
            <div className="hidden md:block relative w-full group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-hover:text-brand transition-colors"
                size={18}
              />
              <input
                type="text"
                readOnly
                onClick={() => setIsSearchOverlayOpen(true)}
                placeholder="Search for restaurant"
                className="w-full pl-12 pr-6 py-2.5 bg-slate-50 border border-slate-300 hover:bg-white hover:border-brand/20 cursor-pointer rounded-xl font-medium shadow-sm transition-all text-sm outline-none text-[#363636]"
                value={searchQuery}
              />
            </div>

            <button
              className="md:hidden p-2 text-vibrant-gray hover:text-brand transition-colors"
              onClick={() => setIsSearchOverlayOpen(true)}
            >
              <Search size={22} className="stroke-[2.5]" />
            </button>
          </div>`);
          
fs.writeFileSync('src/components/CityView.tsx', content);
