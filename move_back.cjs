const fs = require('fs');
let content = fs.readFileSync('src/components/CityView.tsx', 'utf8');

// The Famous Locations section currently starts with:
//        {/* Famous Locations */}
//        {!loading && famousLocations.length > 0 && (
//          <section className="relative group/section">
//            <div className="mb-6">

const famousLocationsRegex = /\s*\{\/\* Famous Locations \*\/\}\s*\{\!loading\s*&&\s*famousLocations\.length\s*>\s*0\s*&&\s*\([\s\S]*?<\/section>\s*\)\}/;
let famousLocationsMatch = content.match(famousLocationsRegex);

if (famousLocationsMatch) {
  let block = famousLocationsMatch[0];
  
  // Replace the original to only show when !locationSlug
  let topBlock = block.replace('{!loading', '{!locationSlug && !loading');
  
  // Create a copy to show when locationSlug
  let bottomBlock = block.replace('{!loading', '{locationSlug && !loading');
  bottomBlock = bottomBlock.replace('Famous Locations', 'Famous Locations on Area Page');
  // Additionally add top margin or something if needed, but it should be fine.
  bottomBlock = bottomBlock.replace('<section className="relative group/section">', '<section className="relative group/section pt-12 border-t border-gray-100">');
  
  content = content.replace(famousLocationsMatch[0], topBlock);
  
  // Now place it after Main Listing Section
  // Find the end of Main Listing Section
  content = content.replace('        </section>\n      </div>\n\n      {/* Filter Drawer */}', '        </section>\n' + bottomBlock + '\n      </div>\n\n      {/* Filter Drawer */}');
  
  fs.writeFileSync('src/components/CityView.tsx', content);
  console.log("Replaced successfully");
} else {
  console.log("Could not find Famous Locations block");
}
