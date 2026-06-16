const fs = require('fs');
let content = fs.readFileSync('src/components/MasterDataContext.tsx', 'utf8');

content = content.replace(
    /value=\{\{ cities, cuisines, isComingSoon, loading, seedData, updateComingSoon \}\}/,
    `value={{ cities, cuisines, appSettings, isComingSoon, loading, seedData, updateComingSoon }}`
);

fs.writeFileSync('src/components/MasterDataContext.tsx', content);
