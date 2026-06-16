const fs = require('fs');

const updateDashboard = () => {
    let content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

    // add state
    content = content.replace(/const \[takeawayOrders, setTakeawayOrders\] = useState<any\[\]>\(\[\]\);/, `const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);\n  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);`);

    const orderDivRegex = /<motion\.div\n\s*key=\{order\.id\}\n\s*initial=\{\{ opacity: 0, x: -20 \}\}\n\s*animate=\{\{ opacity: 1, x: 0 \}\}\n\s*transition=\{\{ delay: index \* 0\.1 \}\}\n\s*className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8"\n\s*>/;

    content = content.replace(orderDivRegex, `<motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 cursor-pointer hover:border-brand/30 transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >`);

    const bottomSectionRegex = /<\/div>\n\s*<div className="flex items-center gap-2 text-xs font-bold px-3 py-1\.5 rounded-lg w-max" style=\{\{ background: order\.paymentMethod === 'online' \? '#eef2ff' : '#fff7ed', color: order\.paymentMethod === 'online' \? '#4f46e5' : '#ea580c' \}\}>\n\s*\{order\.paymentMethod === 'online' \? \(order\.paymentStatus === 'Success' \? 'Paid Online' : 'Payment Pending'\) : 'Pay at Restaurant'\}\n\s*<\/div>\n\s*<\/motion\.div>/;

    const bottomSectionReplacement = `</div>
                     
                     {/* BIFURCATION CARD - SHOWN ONLY WHEN EXPANDED */}
                     {expandedOrderId === order.id && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }} 
                         animate={{ opacity: 1, height: 'auto' }} 
                         className="overflow-hidden mt-4 pt-4 border-t border-slate-100 space-y-2 mb-4"
                       >
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bill Details</h4>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Item Total</span>
                           <span>₹{order.itemTotal || order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Restaurant Packaging</span>
                           <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Taxes</span>
                           <span>₹{order.taxes !== undefined ? order.taxes : Math.round(((5) / 100) * (order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0))}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Platform Fee</span>
                           <span>₹{order.platformFee || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Discount</span>
                           <span>-₹{order.discount || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-base font-bold text-[#363636] mt-3 pt-3 border-t border-slate-100">
                           <span>Bill Total</span>
                           <span>₹{order.totalPrice}</span>
                         </div>
                       </motion.div>
                     )}

                     <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg w-max" style={{ background: order.paymentMethod === 'online' ? '#eef2ff' : '#fff7ed', color: order.paymentMethod === 'online' ? '#4f46e5' : '#ea580c' }}>
                        {order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}
                     </div>
                  </motion.div>`;

    content = content.replace(bottomSectionRegex, bottomSectionReplacement);

    fs.writeFileSync('src/components/DashboardView.tsx', content);
};

updateDashboard();
