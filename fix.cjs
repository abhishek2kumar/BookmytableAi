const fs = require('fs');

const path = 'src/components/RestaurantDetailsView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Sidebar Booking Form (from exactly 1324 to recommended section)
const sidebarStart = content.indexOf('        {/* Booking Form in Sidebar */}');
const recommendedStart = content.indexOf('      {/* Recommended Restaurants Sections */}');

if (sidebarStart !== -1 && recommendedStart !== -1) {
  content = content.substring(0, sidebarStart) + content.substring(recommendedStart);
}

// 2. Remove Mobile Booking Drawer
const drawerStart = content.indexOf('      {/* Mobile Booking Drawer (Full Screen) */}');
const floatingBarStart = content.indexOf('      {/* Mobile Floating Action Bar */}');

if (drawerStart !== -1 && floatingBarStart !== -1) {
  content = content.substring(0, drawerStart) + content.substring(floatingBarStart);
}

// 3. Cleanup logic for isMobileBookingOpen wrapper
content = content.replace('{!isMobileBookingOpen && (', '');
content = content.replace(/ \)\}\n *<\/AnimatePresence>\n *<\/div>\n *\);\n\}\n$/, '\n      </AnimatePresence>\n    </div>\n  );\n}\n');

content = content.replace(/const \[isMobileBookingOpen, setIsMobileBookingOpen\] = useState\(false\);\n?/, '');

fs.writeFileSync(path, content);
