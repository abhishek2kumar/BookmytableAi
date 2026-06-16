const fs = require('fs');
let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

content = content.replace(
    /const canvas = document\.getElementById\('qr-canvas-element'\);/g,
    "const canvas = document.getElementById('qr-canvas-element') as HTMLCanvasElement;"
);

fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
