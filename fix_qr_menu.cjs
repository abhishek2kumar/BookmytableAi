const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/QrMenuView.tsx', 'utf8');

    // Remove + 20 from payable amount calculation
    content = content.replace(/const payableAmount =\n\s*cartTotal \+\n\s*Math\.round\(\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal\) \+\n\s*20;/g, 
        `const payableAmount =
      cartTotal +
      Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal);`);

    // Remove packaging: 20
    content = content.replace(/packaging: 20,/g, `packaging: 0,`);

    content = content.replace(/cartTotal \+\n\s*Math\.round\(\n\s*cartTotal \*\n\s*\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\),\n\s*\) \+\n\s*20/g,
        `cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100))`);
    
    content = content.replace(/cartTotal \+\n\s*Math\.round\(\n\s*\(\(restaurant\.gstPercentage \|\| 5\) \/ 100\) \* cartTotal,\n\s*\) \+\n\s*20/g,
        `cartTotal + Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal)`);

    content = content.replace(/cartTotal \+\n\s*Math\.round\(\n\s*cartTotal \* \(\(restaurant\.gstPercentage \|\| 5\) \/ 100\),\n\s*\) \+\n\s*20/g,
        `cartTotal + Math.round(cartTotal * ((restaurant.gstPercentage || 5) / 100))`);

    const platform_fee_div1 = `<div className="flex justify-between text-slate-500">\n                          <span>Platform Fee</span>\n                          <span>₹20</span>\n                        </div>`;
    content = content.replace(platform_fee_div1, '');

    const platform_fee_div2 = `<div className="flex justify-between text-slate-600">\n                        <span>Platform Fee</span>\n                        <span className="font-medium text-[#363636]">\n                          ₹20\n                        </span>\n                      </div>`;
    content = content.replace(platform_fee_div2, '');

    fs.writeFileSync('src/components/QrMenuView.tsx', content);
};

run();
