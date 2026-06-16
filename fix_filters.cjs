const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

content = content.replace(
  'const [activeFilters, setActiveFilters] = useState({',
  `const [activeFilters, setActiveFilters] = useState({
    openNow: false,
    pureVeg: false,
    servesAlcohol: false,
    bookTable: false,
    delivery: false,`
);

content = content.replace(
  'import {\n  cn,\n  handleImageError,\n  RESTAURANT_IMAGE_FALLBACK,\n  getRestaurantUrl,\n  getRatingColor,\n  isTakeawayAvailable,\n} from "../lib/utils";',
  `import {\n  cn,\n  handleImageError,\n  RESTAURANT_IMAGE_FALLBACK,\n  getRestaurantUrl,\n  getRatingColor,\n  isTakeawayAvailable,\n  getRestaurantStatus,\n} from "../lib/utils";`
);

const filterLogicOld = `        const matchesTakeaway = \n          !activeFilters.onlyTakeaway || \n          (res.liveMenu && res.liveMenu.length > 0);\n\n        return matchesCuisine && matchesRating && matchesOffers && matchesTakeaway;`;

const filterLogicNew = `        const matchesTakeaway = \n          !activeFilters.onlyTakeaway || \n          (res.liveMenu && res.liveMenu.length > 0);\n          \n        const status = getRestaurantStatus(res);\n        const matchesOpenNow = !activeFilters.openNow || status.isOpen;\n        \n        const matchesPureVeg = !activeFilters.pureVeg || res.facilities?.includes("Vegetarian Friendly") || res.isVeg === true;\n        const matchesAlcohol = !activeFilters.servesAlcohol || res.facilities?.includes("Bar") || res.facilities?.includes("Serves Alcohol");\n        const matchesBookTable = !activeFilters.bookTable || res.isBookingEnabled;\n        const matchesDelivery = !activeFilters.delivery || res.facilities?.includes("Home Delivery");\n\n        return matchesCuisine && matchesRating && matchesOffers && matchesTakeaway && matchesOpenNow && matchesPureVeg && matchesAlcohol && matchesBookTable && matchesDelivery;`;

content = content.replace(filterLogicOld, filterLogicNew);

fs.writeFileSync('src/components/CityView.tsx', content);
