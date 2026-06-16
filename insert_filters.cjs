const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

const QuickFiltersBarComp = `const QuickFiltersBar = ({
  activeFilters,
  setActiveFilters,
  setIsFilterOpen,
}: any) => {
  const getActiveFilterCount = () => {
    let count = activeFilters.cuisines.length;
    if (activeFilters.minRating > 0) count++;
    if (activeFilters.onlyWithOffers) count++;
    if (activeFilters.onlyTakeaway) count++;
    if (activeFilters.openNow) count++;
    if (activeFilters.pureVeg) count++;
    if (activeFilters.servesAlcohol) count++;
    if (activeFilters.bookTable) count++;
    if (activeFilters.delivery) count++;
    return count;
  };

  const count = getActiveFilterCount();

  const toggleFilter = (key: string) => {
    setActiveFilters((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const toggleRating = () => {
    setActiveFilters((prev: any) => ({
      ...prev,
      minRating: prev.minRating === 4.5 ? 0 : 4.5,
    }));
  };

  const buttonClass = (isActive: boolean) => 
    cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-normal transition-all shrink-0", 
        isActive ? "bg-[#ef4f5f] text-white border border-[#ef4f5f]" : "bg-white border border-[#cfcfcf] text-[#696969] hover:border-[#9c9c9c]");

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 mt-4 md:mt-2 max-w-[100vw] sm:max-w-none">
      <button
        onClick={() => setIsFilterOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-normal transition-all bg-white border border-[#cfcfcf] text-[#696969] hover:border-[#9c9c9c] shrink-0"
      >
        {count > 0 ? (
          <span className="w-[20px] h-[20px] flex items-center justify-center bg-[#ef4f5f] text-white rounded-[4px] text-[13px] font-medium leading-none">
            {count}
          </span>
        ) : (
          <Filter size={16} />
        )}
        Filters
      </button>

      <button onClick={() => toggleFilter('onlyWithOffers')} className={buttonClass(activeFilters.onlyWithOffers)}>
        Offers {activeFilters.onlyWithOffers && <X size={16} />}
      </button>

      <button onClick={toggleRating} className={buttonClass(activeFilters.minRating >= 4.5)}>
        Rating: 4.5+ {activeFilters.minRating >= 4.5 && <X size={16} />}
      </button>
      
      <button onClick={() => toggleFilter('openNow')} className={buttonClass(activeFilters.openNow)}>
        Open Now {activeFilters.openNow && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('pureVeg')} className={buttonClass(activeFilters.pureVeg)}>
        Pure Veg {activeFilters.pureVeg && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('servesAlcohol')} className={buttonClass(activeFilters.servesAlcohol)}>
        Serves Alcohol {activeFilters.servesAlcohol && <X size={16} />}
      </button>
      
      <button onClick={() => toggleFilter('bookTable')} className={buttonClass(activeFilters.bookTable)}>
        Book a Table {activeFilters.bookTable && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('onlyTakeaway')} className={buttonClass(activeFilters.onlyTakeaway)}>
        Take Away {activeFilters.onlyTakeaway && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('delivery')} className={buttonClass(activeFilters.delivery)}>
        Delivery {activeFilters.delivery && <X size={16} />}
      </button>
    </div>
  );
};
`;

content = content.replace('export default function CityView() {', QuickFiltersBarComp + '\n\nexport default function CityView() {');

// The area page button removal
const areaPageHeaderRegex = /(<h1 className="text-3xl md:text-4xl mb-2 text-\[#363636\] font-normal leading-\[1\.2\]">[\s\S]*?<\/h1>\s*<div className="flex items-center gap-2 text-slate-500 font-medium">\s*<MapPin size=\{20\} className="text-brand" \/>\s*<span>\{filteredListing\.length\} places to explore<\/span>\s*<\/div>\s*<\/div>)\s*<div className="flex items-center gap-3">[\s\S]*?<\/div>\s*<\/div>/;

if (areaPageHeaderRegex.test(content)) {
    content = content.replace(areaPageHeaderRegex, '$1\n          </div>\n          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />');
} else {
    console.log("Could not find areaPageHeaderRegex");
}

// City page: Remove old filter button from "Explore All" section
const cityPageHeaderRegex = /(<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">[\s\S]*?<\/h2>)\s*<div className="flex items-center gap-3">[\s\S]*?<\/button>\s*<\/div>/;
if (cityPageHeaderRegex.test(content)) {
    content = content.replace(cityPageHeaderRegex, '$1');
} else {
    console.log("Could not find cityPageHeaderRegex");
}


// City page: Add QuickFiltersBar below the Welcome Banner
const welcomeBannerRegex = /(\{\/\* Welcome Banner \*\/\}\s*<div className="relative mb-8 [\s\S]*?<\/div>)/;
if (welcomeBannerRegex.test(content)) {
    content = content.replace(welcomeBannerRegex, '$1\n          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />\n');
} else {
    console.log("Could not find welcomeBannerRegex");
}

fs.writeFileSync('src/components/CityView.tsx', content);
