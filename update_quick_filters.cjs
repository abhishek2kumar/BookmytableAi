const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

const regex = /const QuickFiltersBar = \(\{\n  activeFilters,\n  setActiveFilters,\n  setIsFilterOpen,\n\}: any\) => \{/;
content = content.replace(regex, `const QuickFiltersBar = ({
  activeFilters,
  setActiveFilters,
  setIsFilterOpen,
  searchQuery,
  setIsSearchOverlayOpen
}: any) => {`);

const returnRegex = /return \(\n    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 mt-4 md:mt-2 max-w-\[100vw\] sm:max-w-none">/;
content = content.replace(returnRegex, `return (
  <div className="sticky top-[64px] z-[53] bg-white pt-2 sm:pt-4 pb-0 -mx-6 px-6 md:-mx-8 md:px-8 border-b border-gray-100 flex items-start gap-4 transition-all">
    <div className="flex-1 overflow-hidden">
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide max-w-[100vw] sm:max-w-none">`);

const closeRegex = /      <\/button>\n    <\/div>\n  \);\n\};/;
content = content.replace(closeRegex, `      </button>
    </div>
    </div>

    {setIsSearchOverlayOpen && (
      <div className="hidden lg:block w-[320px] shrink-0">
        <div className="relative w-full group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-hover:text-brand transition-colors"
            size={18}
          />
          <input
            type="text"
            readOnly
            onClick={() => setIsSearchOverlayOpen(true)}
            placeholder="Search for restaurant and food"
            className="w-full pl-11 pr-4 py-[9px] bg-slate-50 border border-slate-300 hover:bg-white hover:border-brand/20 cursor-pointer rounded-[9px] font-medium shadow-sm transition-all text-[15px] outline-none text-[#363636]"
            value={searchQuery || ""}
          />
        </div>
      </div>
    )}

  </div>
  );
};`);

content = content.replace(/<QuickFiltersBar activeFilters=\{activeFilters\} setActiveFilters=\{setActiveFilters\} setIsFilterOpen=\{setIsFilterOpen\} \/>/g, `<QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} searchQuery={searchQuery} setIsSearchOverlayOpen={setIsSearchOverlayOpen} />`);

fs.writeFileSync('src/components/CityView.tsx', content);
