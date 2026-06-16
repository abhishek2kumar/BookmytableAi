const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

    content = content.replace(
        /<div className="flex justify-between items-center text-xs text-slate-500">\n\s*<span>Restaurant Packaging<\/span>\n\s*<span>₹\{order\.packaging !== undefined \? order\.packaging : 20\}<\/span>\n\s*<\/div>/g,
        `{order.type !== 'dine_in' && (
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Restaurant Packaging</span>
                        <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                      </div>
                      )}`
    );

    fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
};

run();
