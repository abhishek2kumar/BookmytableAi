const fs = require('fs');

const replaceTheme = (filename) => {
    let content = fs.readFileSync(filename, 'utf8');

    // Replace various instances
    content = content.replace(/bg-brand\/(10|20|30|50)/g, 'bg-blue-600/$1');
    content = content.replace(/bg-brand/g, 'bg-blue-600');
    
    content = content.replace(/text-brand\/(10|20|30|50)/g, 'text-blue-600/$1');
    content = content.replace(/text-brand/g, 'text-blue-600');
    
    content = content.replace(/border-brand\/(10|20|30|50)/g, 'border-blue-600/$1');
    content = content.replace(/border-brand/g, 'border-blue-600');
    
    content = content.replace(/ring-brand\/(10|20|30|50)/g, 'ring-blue-600/$1');
    content = content.replace(/ring-brand/g, 'ring-blue-600');
    
    content = content.replace(/shadow-brand\/(10|20|30|50)/g, 'shadow-blue-600/$1');
    content = content.replace(/shadow-brand/g, 'shadow-blue-600');

    // Check for orange
    content = content.replace(/hover:bg-orange-600/g, 'hover:bg-blue-700');

    fs.writeFileSync(filename, content);
};

replaceTheme('src/components/PartnerLoginView.tsx');
replaceTheme('src/components/PartnerDashboardView.tsx');

console.log("Done");
