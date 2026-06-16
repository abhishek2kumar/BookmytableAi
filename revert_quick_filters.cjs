const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

const regex = /return \(\n\s*<div className="sticky top-\[63px\] md:top-\[63px\] z-\[53\] bg-white pt-2 sm:pt-4 pb-0 border-b border-gray-100 flex justify-center transition-all w-full shadow-sm">\n\s*<div className="flex-1 overflow-hidden max-w-7xl mx-auto px-6 md:px-8 flex items-start gap-4">\n\s*<div className="flex-1 flex gap-3 overflow-x-auto pb-4 scrollbar-hide max-w-\[100vw\] sm:max-w-none -mx-6 px-6 md:mx-0 md:px-0">/;
content = content.replace(regex, `return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 mt-4 md:mt-2 max-w-[100vw] sm:max-w-none">`);

const regex2 = /<\/button>\n\s*<\/div>\n\n\s*\{setIsSearchOverlayOpen && \([\s\S]*?\}\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\};/;

content = content.replace(regex2, `</button>\n    </div>\n  );\n};`);

const removeQuickFiltersBar = `      {/* QUICK FILTERS BAR */}
      <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} searchQuery={searchQuery} setIsSearchOverlayOpen={setIsSearchOverlayOpen} />`;

content = content.replace(removeQuickFiltersBar, "");

const welcomeHtml = `              </>
            )}
          </div>`;

content = content.replace(welcomeHtml, welcomeHtml + `\n          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />`);

const areaPageHeaderRegex = /(<div className="flex items-center justify-between gap-4">[\s\S]*?<MapPin size=\{20\} className="text-brand" \/>\s*<span>\{filteredListing\.length\} places to explore<\/span>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/;

content = content.replace(areaPageHeaderRegex, `$1\n          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />`);

// Remove searchQuery and setIsSearchOverlayOpen props
content = content.replace(/searchQuery=\{searchQuery\} setIsSearchOverlayOpen=\{setIsSearchOverlayOpen\}/g, "");
content = content.replace(/setIsSearchOverlayOpen\n\}: any\) => \{/, `}: any) => {`);
content = content.replace(/searchQuery,\n\s*/, "");

fs.writeFileSync('src/components/CityView.tsx', content);
