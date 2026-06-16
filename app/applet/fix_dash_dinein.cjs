const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

    content = content.replace(
        /\{order\.type === 'dine_in' \? 'DINE IN' : 'TAKEAWAY'\}/g,
        `{order.type === 'dine_in' ? (order.tableNumber && order.tableNumber !== 'Unknown' ? \`DINE IN at Table \${order.tableNumber}\` : 'DINE IN') : 'TAKEAWAY'}`
    );

    // Make sure we only show Restaurant Packaging if order type is not dine_in
    content = content.replace(
        /<div className="flex justify-between items-center text-sm text-slate-600">\n\s*<span>Restaurant Packaging<\/span>\n\s*<span>₹\{order\.packaging !== undefined \? order\.packaging : 20\}<\/span>\n\s*<\/div>/g,
        `{order.type !== 'dine_in' && (
                           <div className="flex justify-between items-center text-sm text-slate-600">
                             <span>Restaurant Packaging</span>
                             <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                           </div>
                         )}`
    );

    fs.writeFileSync('src/components/DashboardView.tsx', content);
};

run();
