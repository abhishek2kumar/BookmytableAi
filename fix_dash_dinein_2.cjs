const fs = require('fs');

const run = () => {
    let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

    content = content.replace(
        /\{order\.type === 'dine_in' \? 'Table Order' : 'Takeaway'\}/g,
        `{order.type === 'dine_in' ? (order.tableNumber && order.tableNumber !== 'Unknown' ? \`DINE IN at Table \${order.tableNumber}\` : 'DINE IN') : 'TAKEAWAY'}`
    );

    fs.writeFileSync('src/components/DashboardView.tsx', content);
};

run();
