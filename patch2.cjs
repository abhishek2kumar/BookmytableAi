const fs = require('fs');
let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');
let modals = fs.readFileSync('modals.tsx', 'utf8');

content = content.replace(
  "{hasChanges && (",
  modals + "\n        {hasChanges && ("
);

fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
