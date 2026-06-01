const fs = require('fs');

const code = `
  const updateTakeawayOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "takeaway_orders", orderId), {
        status: newStatus
      });
    } catch(e) {
      console.error("Failed to update status", e);
    }
  };

  const renderTakeawayOrdersTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
            <div>
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Takeaway Orders</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage your takeaway orders.</p>
            </div>
        </div>

        {takeawayOrders.length === 0 ? (
           <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
               <ShoppingBag size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-800 mb-1">No Orders Yet</h3>
             <p className="text-slate-500 text-sm">When customers place takeaway orders, they will appear here.</p>
           </div>
        ) : (
          <div className="grid gap-4">
             {takeawayOrders.sort((a,b) => b.createdAt - a.createdAt).map(order => (
               <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-1">Order ID: {order.orderId}</div>
                      <div className="font-black text-lg text-slate-900">{order.customerName}</div>
                      <div className="text-xs font-semibold text-slate-500">{order.customerPhone}</div>
                    </div>
                    <div className="text-right">
                       <div className="font-black text-brand text-lg">₹{order.totalPrice}</div>
                       <div className="text-xs font-bold text-slate-500">
                         {new Date(order.createdAt).toLocaleString()}
                       </div>
                    </div>
                 </div>

                 <div className="mb-4 bg-slate-50 p-4 rounded-xl">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items</div>
                   {order.items?.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center text-sm mb-1 last:mb-0">
                       <span className="font-semibold text-slate-700">{item.quantity}x {item.name}</span>
                       <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                     </div>
                   ))}
                 </div>

                 <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                       <select
                         value={order.status}
                         onChange={(e) => updateTakeawayOrderStatus(order.id, e.target.value)}
                         className="px-3 py-1.5 bg-slate-100 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                       >
                         <option value="Received">Received</option>
                         <option value="Preparing">Preparing</option>
                         <option value="Ready">Ready to Pickup</option>
                         <option value="Completed">Completed</option>
                         <option value="Cancelled">Cancelled</option>
                       </select>
                    </div>
                    <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                       {order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };
`;

let content = fs.readFileSync('src/components/PartnerDashboardView.tsx', 'utf8');

content = content.replace(
  /return \(\n    <div className="min-h-screen/,
  code + '\n\n  return (\n    <div className="min-h-screen'
);

content = content.replace(
  /{activeTab === 'bookings' && renderBookingsTab\(\)}/,
  "{activeTab === 'bookings' && renderBookingsTab()}\n               {activeTab === 'takeaway-orders' && renderTakeawayOrdersTab()}"
);

fs.writeFileSync('src/components/PartnerDashboardView.tsx', content);
