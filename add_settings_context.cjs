const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/MasterDataContext.tsx', 'utf8');

    content = content.replace(
        /cities: City\[\];\n\s*cuisines: Cuisine\[\];\n\s*isComingSoon: boolean;/,
        `cities: City[];\n  cuisines: Cuisine[];\n  appSettings: any;\n  isComingSoon: boolean;`
    );
    
    content = content.replace(
        /const \[isComingSoon, setIsComingSoon\] = useState\(false\);/,
        `const [isComingSoon, setIsComingSoon] = useState(false);\n  const [appSettings, setAppSettings] = useState<any>({ platformFee: 0 });`
    );

    content = content.replace(
        /const unsubCuisines = onSnapshot\(collection\(db, 'cuisines'\), \(snapshot\) => \{/,
        `const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {\n      if (docSnap.exists()) {\n        setAppSettings(docSnap.data());\n      }\n    });\n\n    const unsubCuisines = onSnapshot(collection(db, 'cuisines'), (snapshot) => {`
    );

    content = content.replace(
        /return \(\) => \{\n\s*unsubCities\(\);\n\s*unsubCuisines\(\);\n\s*unsubComingSoon\(\);\n\s*\};/,
        `return () => {\n      unsubCities();\n      unsubCuisines();\n      unsubComingSoon();\n      unsubSettings();\n    };`
    );

    content = content.replace(
        /value=\{\{\n\s*cities,\n\s*cuisines,\n\s*isComingSoon,/,
        `value={{\n        cities,\n        cuisines,\n        appSettings,\n        isComingSoon,`
    );
    
    fs.writeFileSync('src/components/MasterDataContext.tsx', content);
};

run();
