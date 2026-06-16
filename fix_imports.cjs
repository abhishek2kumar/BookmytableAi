const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/QrMenuView.tsx', 'utf8');
    if(!content.includes('import { useMasterData }')) {
        content = content.replace(/import \{ useAuth \} from "\.\/AuthProvider";/, `import { useAuth } from "./AuthProvider";\nimport { useMasterData } from "./MasterDataContext";`);
    }
    fs.writeFileSync('src/components/QrMenuView.tsx', content);
    
    let content2 = fs.readFileSync('src/components/TakeawayView.tsx', 'utf8');
    if(!content2.includes('import { useMasterData }')) {
        content2 = content2.replace(/import \{ useAuth \} from "\.\/AuthProvider";/, `import { useAuth } from "./AuthProvider";\nimport { useMasterData } from "./MasterDataContext";`);
    }
    fs.writeFileSync('src/components/TakeawayView.tsx', content2);
};

run();
