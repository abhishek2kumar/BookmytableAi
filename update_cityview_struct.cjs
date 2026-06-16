const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

// 1. Remove the QuickFiltersBar from line ~589 inside Categories & Cuisines
const regex1 = /          <\/div>\n          <QuickFiltersBar[\s\S]*?\/>\n\n\n          \{\/\* Cuisine Cards Carousel \*\/\}/;
if (regex1.test(content)) {
    content = content.replace(regex1, `          </div>
        </div>
      </section>
      )}

      {/* QUICK FILTERS BAR */}
      <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} searchQuery={searchQuery} setIsSearchOverlayOpen={setIsSearchOverlayOpen} />

      {/* CUISINE CAROUSEL */}
      {!locationSlug && !hasActiveFilters && (
      <section className="relative bg-white pb-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          {/* Cuisine Cards Carousel */}`);
} else {
    console.log("Failed to match regex1");
}

// 2. Remove the QuickFiltersBar from the area page
const regex2 = /              <\/div>\n            <\/div>\n          <\/div>\n          <QuickFiltersBar[\s\S]*?\/>\n        <\/div>\n      \)\}/;
if (regex2.test(content)) {
    content = content.replace(regex2, `              </div>
            </div>
          </div>
        </div>
      )}`);
} else {
    console.log("Failed to match regex2");
}

// 3. Update the sticky class on QuickFiltersBar
const oldQuickDiv = `return (\n  <div className="sticky top-[64px] z-[53] bg-white pt-2 sm:pt-4 pb-0 -mx-6 px-6 md:-mx-8 md:px-8 border-b border-gray-100 flex items-start gap-4 transition-all">\n    <div className="flex-1 overflow-hidden">\n    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide max-w-[100vw] sm:max-w-none">`;
const newQuickDiv = `return (
  <div className="sticky top-[63px] md:top-[63px] z-[53] bg-white pt-2 sm:pt-4 pb-0 border-b border-gray-100 flex justify-center transition-all w-full shadow-sm">
    <div className="flex-1 overflow-hidden max-w-7xl mx-auto px-6 md:px-8 flex items-start gap-4">
    <div className="flex-1 flex gap-3 overflow-x-auto pb-4 scrollbar-hide max-w-[100vw] sm:max-w-none -mx-6 px-6 md:mx-0 md:px-0">`;

if (content.includes(oldQuickDiv)) {
    content = content.replace(oldQuickDiv, newQuickDiv);
    // Also we need to fix the closing tags to match the new structure
    content = content.replace(/      <\/button>\n    <\/div>\n    <\/div>\n\n    \{setIsSearchOverlayOpen/, `      </button>
    </div>

    {setIsSearchOverlayOpen`);
    
    content = content.replace(/      <\/div>\n    \)\}\n\n  <\/div>\n  \);\n\};/, `      </div>
    )}
    </div>
  </div>
  );
};`);
} else {
    console.log("Failed to match oldQuickDiv");
}


fs.writeFileSync('src/components/CityView.tsx', content);
