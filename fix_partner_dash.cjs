const fs = require('fs');

const updatePartner = () => {
    let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

    const tableStr = `order.type === 'dine_in' ? \`Table \${order.tableNumber || '-'}\` : 'Takeaway'`;
    const newTableStr = `order.type === 'dine_in' ? (order.tableNumber && order.tableNumber !== 'Unknown' ? \`Table \${order.tableNumber}\` : 'Dine In') : 'Takeaway'`;
    
    content = content.replace(tableStr, newTableStr);

    const itemsRegex = /<div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items<\/div>\n\s*\{order\.items\?\.map\(\(item: any, idx: number\) => \(\n\s*<div key=\{idx\} className="flex justify-between items-center text-sm mb-1 last:mb-0">\n\s*<span className="font-semibold text-slate-700">\{item\.quantity\}x \{item\.name\}<\/span>\n\s*<span className="font-normal text-\[#363636\] leading-\[1\.2\]">₹\{item\.price \* item\.quantity\}<\/span>\n\s*<\/div>\n\s*\)\)\}/;
    
    content = content.replace(itemsRegex, `<div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items</div>
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm mb-1">
                        <span className="font-semibold text-slate-700">{item.quantity}x {item.name}</span>
                        <span className="font-normal text-[#363636] leading-[1.2]">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 mt-2 pt-2 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Item Total</span>
                        <span>₹{order.itemTotal || order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Taxes</span>
                        <span>₹{order.taxes !== undefined ? order.taxes : Math.round(((selectedRes?.gstPercentage || 5) / 100) * (order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Restaurant Packaging</span>
                        <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-[#363636] mt-2 pt-1 border-t border-slate-200">
                        <span>Bill Total</span>
                        <span>₹{order.totalPrice}</span>
                      </div>
                    </div>`);

    fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
};

updatePartner();
