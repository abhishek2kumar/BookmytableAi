const fs = require('fs');

const updateQr = () => {
    let content = fs.readFileSync('src/components/QrMenuView.tsx', 'utf8');

    // Add useMasterData
    if (!content.includes('useMasterData')) {
        content = content.replace(/import \{ useAuth \} from "\\.\/AuthProvider";/, `import { useAuth } from "./AuthProvider";\nimport { useMasterData } from "./MasterDataContext";`);
    }

    content = content.replace(/const \{ user, profile, signInWithGoogle \} = useAuth\(\);/, `const { user, profile, signInWithGoogle } = useAuth();\n  const { appSettings } = useMasterData();`);

    // Replace platformFee: 0 with appSettings.platformFee || 0
    content = content.replace(/platformFee: 0,/g, `platformFee: appSettings?.platformFee || 0,`);

    // Add appSettings?.platformFee || 0 to payableAmount calculation
    // Note: earlier we replaced it to cartTotal + Math.round(...)
    content = content.replace(/const payableAmount =\n\s*cartTotal \+\n\s*Math\.round\(\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal\);/, 
        `const payableAmount =\n      cartTotal +\n      Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + (appSettings?.platformFee || 0);`);

    content = content.replace(/cartTotal \+ Math\.round\(cartTotal \* \(\(restaurant\.gstPercentage \|\| 5\) \/ 100\)\)/g, 
        `cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100)) + (appSettings?.platformFee || 0)`);
        
    content = content.replace(/cartTotal \+ Math\.round\(\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal\)/g, 
        `cartTotal + Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal) + (appSettings?.platformFee || 0)`);

    // Add the Platform Fee row back using the dynamic fee, only if it > 0
    const itemTotalDiv = `<div className="flex justify-between text-slate-500">\n                          <span>Item Total<\/span>\n                          <span>₹\{cartTotal\}<\/span>\n                        <\/div>`;
    const uiRow1 = `<div className="flex justify-between text-slate-500">\n                          <span>Item Total</span>\n                          <span>₹{cartTotal}</span>\n                        </div>\n                        {(appSettings?.platformFee || 0) > 0 && (\n                          <div className="flex justify-between text-slate-500">\n                            <span>Platform Fee</span>\n                            <span>₹{appSettings?.platformFee}</span>\n                          </div>\n                        )}`;
    content = content.replace(new RegExp(itemTotalDiv, 'g'), uiRow1);

    const itemTotalDiv2 = `<div className="flex justify-between text-slate-600">\n                        <span>Item Total<\/span>\n                        <span className="font-medium text-\\[#363636\\]">\n                          ₹\{cartTotal\}\n                        <\/span>\n                      <\/div>`;
    const uiRow2 = `<div className="flex justify-between text-slate-600">\n                        <span>Item Total</span>\n                        <span className="font-medium text-[#363636]">\n                          ₹{cartTotal}\n                        </span>\n                      </div>\n                      {(appSettings?.platformFee || 0) > 0 && (\n                        <div className="flex justify-between text-slate-600">\n                          <span>Platform Fee</span>\n                          <span className="font-medium text-[#363636]">\n                            ₹{appSettings?.platformFee}\n                          </span>\n                        </div>\n                      )}`;
    content = content.replace(new RegExp(itemTotalDiv2, 'g'), uiRow2);

    fs.writeFileSync('src/components/QrMenuView.tsx', content);
};

updateQr();
