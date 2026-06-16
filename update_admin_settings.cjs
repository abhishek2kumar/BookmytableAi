const fs = require('fs');

const updateAdmin = () => {
    let content = fs.readFileSync('src/components/AdminDashboardView.tsx', 'utf8');

    // Make sure we have appSettings from useMasterData
    if (!content.includes('appSettings')) {
        content = content.replace(/const \{ cities, cuisines, isComingSoon, seedData, updateComingSoon \} = useMasterData\(\);/,
        `const { cities, cuisines, isComingSoon, appSettings, seedData, updateComingSoon } = useMasterData();\n  const [platformFee, setPlatformFee] = useState(0);\n  useEffect(() => { if (appSettings?.platformFee !== undefined) setPlatformFee(appSettings.platformFee); }, [appSettings]);`);
    }

    // Add function to save platform fee
    if (!content.includes('savePlatformFee')) {
        content = content.replace(/const updateComingSoon = async/, 
            `const savePlatformFee = async () => {\n    try {\n      await setDoc(doc(db, 'settings', 'global'), { platformFee }, { merge: true });\n      alert('Platform fee updated');\n    } catch (e) { console.error(e); }\n  };\n\n  const updateComingSoon = async`);
    }
    
    // Add UI to the Inventory Tab (Master Data)
    const citiesHeader = `<div className="flex justify-between items-center mb-6">\n                            <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Cities</h3>`;
    
    content = content.replace(citiesHeader, `<div className="mb-8 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-bold text-[#363636] mb-1">Global Platform Fee</h3>
                                <p className="text-sm text-slate-500">This fee is charged to users for takeaway and dine-in orders.</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-lg">₹</span>
                                <input type="number" value={platformFee} onChange={e => setPlatformFee(Number(e.target.value))} className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
                                <button onClick={savePlatformFee} className="px-6 py-2 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-all">Save</button>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Cities</h3>`);

    fs.writeFileSync('src/components/AdminDashboardView.tsx', content);
};

updateAdmin();
