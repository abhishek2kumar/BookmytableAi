const fs = require('fs');
let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');
content = content.replace("                 </div>\n               )}}", "                 </div>\n               )}");
fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
