const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/MasterDataContext.tsx', 'utf8');

    content = content.replace(
        /const unsubSettings = onSnapshot\(doc\(db, 'settings', 'global'\), \(docSnap\) => \{\n\s*if \(docSnap\.exists\(\)\) \{\n\s*setAppSettings\(docSnap\.data\(\)\);\n\s*\}\n\s*\}\);\n\n\s*const unsubCuisines/g,
        `const unsubGlobalSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data());
      }
    });

    const unsubCuisines`
    );

    content = content.replace(
        /unsubCities\(\);\n\s*unsubCuisines\(\);\n\s*unsubSettings\(\);\n\s*\};\n\s*\}, \[\]\);/g,
        `unsubCities();
      unsubCuisines();
      unsubGlobalSettings();
      unsubSettings();
    };
  }, []);`
    );
    
    // Also fix the context value error
    // Error was: Property 'appSettings' is missing in type '{ cities: City[]; cuisines: Cuisine[]; isComingSoon: boolean; loading: boolean; seedData: () => Promise<void>; updateComingSoon: (status: boolean) => Promise<void>; }'
    
    content = content.replace(
        /value=\{\{\n\s*cities,\n\s*cuisines,\n\s*isComingSoon,/g,
        `value={{\n        cities,\n        cuisines,\n        appSettings,\n        isComingSoon,`
    );

    fs.writeFileSync('src/components/MasterDataContext.tsx', content);
};

run();
