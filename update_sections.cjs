const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

// The active filters check could just use getActiveFilterCount from QuickFiltersBar?
// Let's define hasActiveFilters at the component level
const activeFiltersDef = `  const [activeFilters, setActiveFilters] = useState({
    openNow: false,
    pureVeg: false,
    servesAlcohol: false,
    bookTable: false,
    delivery: false,
    cuisines: [] as string[],
    minRating: 0,
    onlyWithOffers: false,
    onlyTakeaway: false,
  });

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
  const hasActiveFilters = getActiveFilterCount() > 0;
`;

if (content.includes('const [activeFilters, setActiveFilters] = useState({')) {
  content = content.replace(/const \[activeFilters, setActiveFilters\] = useState\(\{[\s\S]*?\}\);/, activeFiltersDef);
}

// In QuickFiltersBar, use getActiveFilterCount passed as prop or from parent?
// QuickFiltersBar currently defines getActiveFilterCount inside it. We can just leave it there or let it use the prop if we pass it, but changing parent is easier:
content = content.replace(
  `const QuickFiltersBar = ({
  activeFilters,
  setActiveFilters,
  setIsFilterOpen,
}: any) => {
  const getActiveFilterCount = () => {`,
  `const QuickFiltersBar = ({
  activeFilters,
  setActiveFilters,
  setIsFilterOpen,
}: any) => {
  const getActiveFilterCountInner = () => {`
);
content = content.replace(/const count = getActiveFilterCount\(\);/, 'const count = getActiveFilterCountInner();');

// Now, conditionally render sections:
// 1. Cuisine Cards Carousel
content = content.replace(
  `{/* Cuisine Cards Carousel */}`,
  `{/* Cuisine Cards Carousel */}\n          {!hasActiveFilters && (`
);
content = content.replace(
  `</div>\n          </div>\n        </div>\n      </section>\n      )}`,
  `</div>\n          </div>\n          )}\n        </div>\n      </section>\n      )}`
);

// 2. Stories Section
content = content.replace(
  `{(!storiesLoading && usersWithStories.length > 0) && (`,
  `{!hasActiveFilters && (!storiesLoading && usersWithStories.length > 0) && (`
);

// 3. Featured Section
content = content.replace(
  `{!locationSlug && (loading || featuredRestaurants.length > 0) && (`,
  `{!hasActiveFilters && !locationSlug && (loading || featuredRestaurants.length > 0) && (`
);

// 4. Top Discounts
content = content.replace(
  `{!locationSlug && topDiscountRestaurants.length > 0 && (`,
  `{!hasActiveFilters && !locationSlug && topDiscountRestaurants.length > 0 && (`
);

// 5. Nearby Options
content = content.replace(
  `{!locationSlug && nearbyRestaurants.length > 0 && (`,
  `{!hasActiveFilters && !locationSlug && nearbyRestaurants.length > 0 && (`
);

// 6. Famous Locations
content = content.replace(
  `{!locationSlug && !loading && famousLocations.length > 0 && (`,
  `{!hasActiveFilters && !locationSlug && !loading && famousLocations.length > 0 && (`
);

// 7. Famous Locations on Area Page
content = content.replace(
  `{locationSlug && !loading && famousLocations.length > 0 && (`,
  `{!hasActiveFilters && locationSlug && !loading && famousLocations.length > 0 && (`
);

// 8. Takeaway Restaurants
content = content.replace(
  `{!loading && takeawayRestaurants.length > 0 && (`,
  `{!hasActiveFilters && !loading && takeawayRestaurants.length > 0 && (`
);

// Now re-add the Explore All filter button
const exploreAllTitleMatch = `          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl text-[#363636] font-normal leading-[1.2]">
              {searchQuery
                ? \`Search results for "\${searchQuery}"\`
                : \`Explore All in \${cityName}\`}
            </h2>`;
            
const filterBtn = `
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                  hasActiveFilters
                    ? "bg-brand text-white shadow-lg shadow-brand/30"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-brand/30 hover:bg-slate-50",
                )}
              >
                <Filter size={18} />
                Filters
                {hasActiveFilters && (
                  <span className="flex items-center justify-center w-5 h-5 ml-1 bg-white text-brand rounded-full text-xs font-black">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
            </div>`;

if (content.includes(exploreAllTitleMatch)) {
  content = content.replace(exploreAllTitleMatch, exploreAllTitleMatch + filterBtn);
} else {
  console.log("Could not find exploreAllTitleMatch");
}

fs.writeFileSync('src/components/CityView.tsx', content);
