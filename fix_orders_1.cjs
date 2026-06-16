const fs = require('fs');

const updateFile = (filename) => {
    let content = fs.readFileSync(filename, 'utf8');

    content = content.replace(/totalPrice: payableAmount,\n\s*paymentMethod,/g, 
        `totalPrice: payableAmount,\n          itemTotal: cartTotal,\n          taxes: Math.round(((restaurant.gstPercentage || 5) / 100) * cartTotal),\n          packaging: 20,\n          platformFee: 0,\n          discount: 0,\n          paymentMethod,`);

    fs.writeFileSync(filename, content);
};

updateFile('src/components/TakeawayView.tsx');
updateFile('src/components/QrMenuView.tsx');
