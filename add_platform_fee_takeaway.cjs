const fs = require('fs');

const updateTakeaway = () => {
    let content = fs.readFileSync('src/components/TakeawayView.tsx', 'utf8');

    // Add useMasterData
    if (!content.includes('useMasterData')) {
        content = content.replace(/import \{ useAuth \} from "\\.\/AuthProvider";/, `import { useAuth } from "./AuthProvider";\nimport { useMasterData } from "./MasterDataContext";`);
    }

    content = content.replace(/const \{ user, profile, signInWithGoogle \} = useAuth\(\);/, `const { user, profile, signInWithGoogle } = useAuth();\n  const { appSettings } = useMasterData();`);

    // Replace platformFee: 0 with appSettings.platformFee || 0
    content = content.replace(/platformFee: 0,/g, `platformFee: appSettings?.platformFee || 0,`);

    content = content.replace(/const payableAmount =\n\s*cartTotal \+\n\s*Math\.round\(\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal\) \+\n\s*20;/, 
        `const payableAmount =\n      cartTotal +\n      Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + 20 + (appSettings?.platformFee || 0);`);

    content = content.replace(/cartTotal \+\n\s*Math\.round\(\n\s*cartTotal \*\n\s*\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\),\n\s*\) \+\n\s*20/g,
        `cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100)) + 20 + (appSettings?.platformFee || 0)`);
        
    content = content.replace(/cartTotal \+\n\s*Math\.round\(\n\s*\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal,\n\s*\) \+\n\s*20/g,
        `cartTotal + Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + 20 + (appSettings?.platformFee || 0)`);

    // Add the Platform Fee row back using the dynamic fee
    // In TakeawayView it might already have a dummy platform fee like QrMenu did?
    // Let's replace the fixed 20 platform fee UI in TakeawayView just in case it had it.
    const platform_fee_div1 = /<div className="flex justify-between text-slate-500">\n\s*<span>Platform Fee<\/span>\n\s*<span>₹20<\/span>\n\s*<\/div>/g;
    content = content.replace(platform_fee_div1, `{(appSettings?.platformFee || 0) > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>Platform Fee</span>
                            <span>₹{appSettings?.platformFee}</span>
                          </div>
                        )}`);
                        
    const platform_fee_div2 = /<div className="flex justify-between text-slate-600">\n\s*<span>Platform Fee<\/span>\n\s*<span className="font-medium text-\\[#363636\\]">\n\s*₹20\n\s*<\/span>\n\s*<\/div>/g;
    content = content.replace(platform_fee_div2, `{(appSettings?.platformFee || 0) > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Platform Fee</span>
                          <span className="font-medium text-[#363636]">
                            ₹{appSettings?.platformFee}
                          </span>
                        </div>
                      )}`);

    fs.writeFileSync('src/components/TakeawayView.tsx', content);
};

updateTakeaway();
