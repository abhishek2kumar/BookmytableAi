const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

    content = content.replace(/let tableName = qrTableTarget \? \`Table \$\{qrTableTarget\}\` : 'Generic Menu';/, 
        "let tableName = qrTableTarget ? `Table ${qrTableTarget}` : 'Table ____';\n                                    const addressParts = [selectedRes?.name || 'Restaurant', selectedRes?.location, selectedRes?.city].filter(Boolean);\n                                    const resAddressStr = addressParts.join(', ');");

    content = content.replace(/<h1>\$\{selectedRes\?\.name \|\| 'Restaurant'\}<\/h1>/,
        "<h1>${resAddressStr}</h1>");

    fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
};

run();
